import express from 'express';
import path from 'path';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const app = express();
const server = createHttpServer(app);
const wss = new WebSocketServer({ noServer: true });

// Shared state for Night City Cyberdeck
let activeGmSocket: WebSocket | null = null;
let currentGameState: any = null; // Filled by client initializations or default
let activeHandout: any = null; // Handout pushed in real time

// Listen to upgrade requests
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws: WebSocket) => {
  console.log('New connection established.');

  // Send initial presence and state info
  ws.send(JSON.stringify({
    type: 'INIT',
    payload: {
      hasActiveGm: activeGmSocket !== null && activeGmSocket.readyState === WebSocket.OPEN,
      currentGameState: currentGameState,
      activeHandout: activeHandout
    }
  }));

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'JOIN_AS_GM':
          const enteredPassword = data.payload?.password;
          if (enteredPassword !== 'edgerunner') {
            ws.send(JSON.stringify({
              type: 'GM_REJECTED',
              payload: { message: '[ACCESS DENIED // INCORRECT CRYPTOGRAPHIC ACCESS PASSPHRASE]' }
            }));
          } else if (activeGmSocket !== null && activeGmSocket.readyState === WebSocket.OPEN && activeGmSocket !== ws) {
            ws.send(JSON.stringify({
              type: 'GM_REJECTED',
              payload: { message: '[DISCONNECTED // ACTIVE GM CURRENTLY IN SESSION]' }
            }));
          } else {
            activeGmSocket = ws;
            // Broadcast GM presence to everyone
            const msg = JSON.stringify({
              type: 'PRESENCE_CHANGE',
              payload: { hasActiveGm: true }
            });
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
              }
            });
            ws.send(JSON.stringify({
              type: 'GM_CONFIRMED'
            }));
            console.log('GM seat occupied.');
          }
          break;

        case 'LEAVE_GM':
          if (activeGmSocket === ws) {
            activeGmSocket = null;
            const msg = JSON.stringify({
              type: 'PRESENCE_CHANGE',
              payload: { hasActiveGm: false }
            });
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
              }
            });
            ws.send(JSON.stringify({
              type: 'GM_LEFT'
            }));
            console.log('GM left seat.');
          }
          break;

        case 'STATE_UPDATE':
          // Update the server-side state
          currentGameState = { ...currentGameState, ...data.payload };
          // Broadcast to everyone else
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'STATE_CHANGED',
                payload: data.payload
              }));
            }
          });
          break;

        case 'BROADCAST_HANDOUT':
          activeHandout = data.payload;
          // Broadcast to everyone
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'HANDOUT_BROADCASTED',
                payload: data.payload
              }));
            }
          });
          break;

        case 'DISMISS_HANDOUT':
          activeHandout = null;
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'HANDOUT_DISMISSED'
              }));
            }
          });
          break;

        default:
          break;
      }
    } catch (e) {
      console.error('Error handling websocket message:', e);
    }
  });

  ws.on('close', () => {
    if (activeGmSocket === ws) {
      activeGmSocket = null;
      console.log('GM disconnected from server.');
      // Notify everyone
      const msg = JSON.stringify({
        type: 'PRESENCE_CHANGE',
        payload: { hasActiveGm: false }
      });
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(msg);
        }
      });
    }
  });
});

// Serve static in production or use Vite middleware in development
const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  }).then((vite) => {
    app.use(vite.middlewares);
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Express custom server listening at http://0.0.0.0:${PORT}`);
});
