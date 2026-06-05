import React, { useState, useEffect } from 'react';
import { GameState, Character, NetNode, LogEntry, Gig, MapObstacle } from './types';
import { INITIAL_STATE } from './data';
import { getGameTime } from './utils';
import { audio } from './audio';
import AudioControls from './components/AudioControls';
import CombatTrack from './components/CombatTrack';
import NetrunGrid from './components/NetrunGrid';
import CharacterCreator from './components/CharacterCreator';
import MissionGenerator from './components/MissionGenerator';
import CharacterSheetDrawer from './components/CharacterSheetDrawer';
import DistrictMap from './components/DistrictMap';
import {
  Skull, Terminal, Shield, Cpu, RefreshCw, Layers, Compass, HelpCircle,
  Database, Award, Activity, Heart, EyeOff, Radio, Power, Mic
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'cyberpunk_red_tracker_state';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [activeTab, setActiveTab] = useState<'combat' | 'netrunning'>('combat');
  const [showCharacterCreator, setShowCharacterCreator] = useState<boolean>(false);
  const [showCharacterSheet, setShowCharacterSheet] = useState<boolean>(false);

  // Network and Role Management State
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [userRole, setUserRole] = useState<'gm' | 'player' | null>(null);
  const [activeHandout, setActiveHandout] = useState<{ title: string; content: string; imageUrl?: string } | null>(null);
  const [hasActiveGm, setHasActiveGm] = useState<boolean>(false);
  const [gmRejectedMessage, setGmRejectedMessage] = useState<string | null>(null);
  const [showGmPasswordInput, setShowGmPasswordInput] = useState<boolean>(false);
  const [gmPassword, setGmPassword] = useState<string>('');

  // 3D Dice-rolling standard chat overlays
  const [activeRollAnimation, setActiveRollAnimation] = useState<{ label: string; timestamp: string } | null>(null);
  const [isAnimatingLogs, setIsAnimatingLogs] = useState<boolean>(false);
  const lastAnimatedLogId = React.useRef<string | null>(null);

  // Audio stream and local variables
  const [isListening, setIsListening] = useState<boolean>(false);
  const [portraitCategory, setPortraitCategory] = useState<'Male' | 'Female' | 'Non-Binary'>('Male');

  // Load and instantiate global socket synchronizer
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Synchronizer link established.');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'INIT':
            setHasActiveGm(data.payload.hasActiveGm);
            if (data.payload.currentGameState) {
              setGameState(data.payload.currentGameState);
            }
            if (data.payload.activeHandout) {
              setActiveHandout(data.payload.activeHandout);
            }
            break;
          case 'PRESENCE_CHANGE':
            setHasActiveGm(data.payload.hasActiveGm);
            break;
          case 'GM_CONFIRMED':
            setUserRole('gm');
            setGmRejectedMessage(null);
            audio.playNetSuccess();
            break;
          case 'GM_REJECTED':
            setGmRejectedMessage(data.payload.message);
            setUserRole(null);
            audio.playAlert();
            break;
          case 'GM_LEFT':
            setUserRole(null);
            break;
          case 'STATE_CHANGED':
            setGameState(prev => prev ? { ...prev, ...data.payload } : null);
            break;
          case 'HANDOUT_BROADCASTED':
            setActiveHandout(data.payload);
            audio.playAlert();
            break;
          case 'HANDOUT_DISMISSED':
            setActiveHandout(null);
            break;
          default:
            break;
        }
      } catch (e) {
        console.warn("Failed web socket parse line", e);
      }
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  // Continuous Vocal Speech Recognition (STT Helper)
  useEffect(() => {
    if (!isListening) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser does not support acoustics speech recognition module!");
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      const text = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      console.log(`Speech recognition result: ${text}`);

      const newLog: LogEntry = {
        id: `vocal_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'system',
        message: `🎤 [ACU-SENSE SPEECH]: "${text.toUpperCase()}"`
      };

      if (text.includes("jack out") || text.includes("subnet") || text.includes("netrun")) {
        setActiveTab('netrunning');
        audio.playNetSuccess();
      } else if (text.includes("jack in") || text.includes("combat") || text.includes("tactical")) {
        setActiveTab('combat');
        audio.playAlert();
      } else if (text.includes("move north") || text.includes("move y up")) {
        setGameState(prev => {
          if (!prev) return prev;
          const nextPlayer = { ...prev.player, y: Math.max(1, (prev.player.y || 1) - 1) };
          const s = { ...prev, player: nextPlayer, logs: [newLog, ...prev.logs] };
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'STATE_UPDATE', payload: s }));
          }
          return s;
        });
      } else if (text.includes("move south") || text.includes("move y down")) {
        setGameState(prev => {
          if (!prev) return prev;
          const nextPlayer = { ...prev.player, y: Math.min(10, (prev.player.y || 1) + 1) };
          const s = { ...prev, player: nextPlayer, logs: [newLog, ...prev.logs] };
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'STATE_UPDATE', payload: s }));
          }
          return s;
        });
      } else if (text.includes("move east") || text.includes("move x right")) {
        setGameState(prev => {
          if (!prev) return prev;
          const nextPlayer = { ...prev.player, x: Math.min(10, (prev.player.x || 1) + 1) };
          const s = { ...prev, player: nextPlayer, logs: [newLog, ...prev.logs] };
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'STATE_UPDATE', payload: s }));
          }
          return s;
        });
      } else if (text.includes("move west") || text.includes("move x left")) {
        setGameState(prev => {
          if (!prev) return prev;
          const nextPlayer = { ...prev.player, x: Math.max(1, (prev.player.x || 1) - 1) };
          const s = { ...prev, player: nextPlayer, logs: [newLog, ...prev.logs] };
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'STATE_UPDATE', payload: s }));
          }
          return s;
        });
      } else {
        setGameState(prev => {
          if (!prev) return prev;
          const s = { ...prev, logs: [newLog, ...prev.logs] };
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'STATE_UPDATE', payload: s }));
          }
          return s;
        });
      }
    };

    rec.onerror = (e: any) => {
      console.warn("Speech error", e);
    };

    rec.onend = () => {
      if (isListening) rec.start();
    };

    rec.start();

    return () => {
      rec.onend = null;
      rec.stop();
    };
  }, [isListening, socket]);

  // Standardised 500ms 3D Dice-rolling observer monitor
  useEffect(() => {
    if (!gameState || !gameState.logs || gameState.logs.length === 0) return;
    const latestLog = gameState.logs[0];
    if (latestLog.id === lastAnimatedLogId.current) return;

    const isRollLog = latestLog.message.includes('🎲') || 
                      latestLog.message.includes('🎯') || 
                      latestLog.message.includes('rolls') || 
                      latestLog.message.includes('rolls d10') || 
                      latestLog.message.includes('rolls 1d10') || 
                      latestLog.message.includes('save') || 
                      latestLog.message.includes('CHROME ATTACK') || 
                      latestLog.message.includes('DEATH') || 
                      latestLog.message.includes('SKILL ROLL CHECK');

    if (isRollLog) {
      lastAnimatedLogId.current = latestLog.id;
      
      let cleanLabel = 'DECIDATIVE ALGORITHM IN PROGRESS';
      if (latestLog.message.includes('SKILL ROLL CHECK:')) {
        cleanLabel = latestLog.message.split('rolls')[1]?.split('+')[0]?.trim() || 'SKILL FIELD VECTOR';
      } else if (latestLog.message.includes('CHROME ATTACK:')) {
        cleanLabel = 'TARGET TARGETING TELEMETRY';
      } else if (latestLog.message.includes('DEATH')) {
        cleanLabel = 'VITAL METRIC CELL BI-SIGHT';
      } else if (latestLog.message.includes('DRUG')) {
        cleanLabel = 'SYNTH CHEMICAL INTEGRITY';
      }

      setActiveRollAnimation({ label: cleanLabel, timestamp: latestLog.timestamp });
      setIsAnimatingLogs(true);
      
      // Accurately play glitch beep for rolling effect
      audio.playGlitch();

      const timer = setTimeout(() => {
        setIsAnimatingLogs(false);
        setActiveRollAnimation(null);
        audio.playNetSuccess();
      }, 500);

      return () => clearTimeout(timer);
    } else {
      lastAnimatedLogId.current = latestLog.id;
    }
  }, [gameState?.logs]);

  // Load state from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GameState;
        if (parsed.player && parsed.enemies && parsed.netArchitecture) {
          setGameState(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve localStorage state", e);
    }
    setGameState(JSON.parse(JSON.stringify(INITIAL_STATE)));
  }, []);

  // Save changes to local storage whenever game state updates
  useEffect(() => {
    if (!gameState) return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-[#06060c] text-white flex items-center justify-center font-mono">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[#39ff14]/80 uppercase tracking-widest text-xs animate-pulse">BOOTING_CYBERDECK_GRID_CONTROLLER...</p>
        </div>
      </div>
    );
  }

  const handleResetState = () => {
    if (confirm("Are you sure you want to reboot system registers? This will wipe user and netrun progression!")) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      const cleanState = JSON.parse(JSON.stringify(INITIAL_STATE));
      setGameState(cleanState);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'STATE_UPDATE', payload: cleanState }));
      }
      audio.playAlert();
    }
  };

  const updateState = (newState: Partial<GameState>) => {
    setGameState(prev => {
      if (!prev) return prev;
      const combined = { ...prev, ...newState };

      // Automated Zero-HP Lethality sequence
      let turnOrderChanged = false;
      let enemiesChanged = false;
      let logsChanged = false;

      let nextEnemies = combined.enemies ? [...combined.enemies] : [];
      let nextTurnOrder = combined.turnOrder ? [...combined.turnOrder] : [];
      let nextLogs = combined.logs ? [...combined.logs] : [];

      if (combined.combatActive) {
        if (combined.player && combined.player.hp <= 0 && !combined.player.isDead) {
          if (nextTurnOrder.includes(combined.player.id)) {
            nextTurnOrder = nextTurnOrder.filter(id => id !== combined.player.id);
            turnOrderChanged = true;
            nextLogs = [
              {
                id: `flatline_player_${Date.now()}`,
                timestamp: getGameTime(),
                type: 'system',
                message: `[ALERT]: Target Flatlined / Removed from Grid Matrix`
              },
              ...nextLogs
            ];
            logsChanged = true;
          }
        }

        nextEnemies = nextEnemies.map(enemy => {
          if (enemy.hp <= 0 && (!enemy.isDead || enemy.deployed !== false)) {
            if (nextTurnOrder.includes(enemy.id)) {
              nextTurnOrder = nextTurnOrder.filter(id => id !== enemy.id);
              turnOrderChanged = true;
            }
            if (enemy.deployed !== false) {
              nextLogs = [
                {
                  id: `flatline_${enemy.id}_${Date.now()}`,
                  timestamp: getGameTime(),
                  type: 'system',
                  message: `[ALERT]: Target Flatlined / Removed from Grid Matrix`
                },
                ...nextLogs
              ];
              logsChanged = true;
            }
            enemiesChanged = true;
            return {
              ...enemy,
              isDead: true,
              deployed: false
            };
          }
          return enemy;
        });
      }

      const finalState = { ...combined };
      if (enemiesChanged) finalState.enemies = nextEnemies;
      if (turnOrderChanged) {
        finalState.turnOrder = nextTurnOrder;
        if (combined.turnIndex >= nextTurnOrder.length) {
          finalState.turnIndex = Math.max(0, nextTurnOrder.length - 1);
        }
      }
      if (logsChanged) finalState.logs = nextLogs;

      // Sync to remote sockets in real-time
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'STATE_UPDATE',
          payload: finalState
        }));
      }

      return finalState;
    });
  };

  const handleUpdateCombatState = (newState: Partial<GameState>) => {
    updateState(newState);
  };

  const handleUpdateNetState = (newState: {
    netArchitecture?: NetNode[];
    currentNetFloor?: number;
    synapseHp?: number;
    credits?: number;
    logs?: LogEntry[];
    player?: Character;
  }) => {
    updateState(newState);
  };

  const handleSaveCharacter = (newChar: Character) => {
    if (!gameState) return;
    updateState({
      player: newChar,
      logs: [
        {
          id: `char_save_${Date.now()}`,
          timestamp: getGameTime(),
          type: 'system',
          message: `👤 CHARACTER BIOMETRIC DEPLOYED: Re-registered active challenger as "${newChar.name}". Core MOVE speed: ${newChar.move} (${newChar.move * 2}m).`
        },
        ...gameState.logs
      ]
    });
    setShowCharacterCreator(false);
  };

  const handleLoadGig = (gig: Gig, enemiesList: Character[], netArchList: NetNode[], customObstaclesList?: MapObstacle[]) => {
    if (!gameState) return;
    
    const cleanEnemies = enemiesList.map(e => ({
      ...e,
      actionSpent: false,
      moveActionSpent: false
    }));

    const cleanPlayer = {
      ...gameState.player,
      actionSpent: false,
      moveActionSpent: false
    };

    const turnOrderSeq = ['player_apex', ...cleanEnemies.map(e => e.id)];

    updateState({
      player: cleanPlayer,
      currentGig: gig,
      enemies: cleanEnemies,
      netArchitecture: netArchList,
      currentNetFloor: 1,
      selectedNetNodeId: null,
      combatActive: true,
      round: 1,
      turnIndex: 0,
      turnOrder: turnOrderSeq,
      customObstacles: customObstaclesList || [],
      logs: [
        {
          id: `load_gig_${Date.now()}`,
          timestamp: getGameTime(),
          type: 'system',
          message: `📂 SCREAMSHEET CONTRACT MOUNTED: Loaded contract "${gig.title}". Spawning hostile gang rosters on coordinates!`
        },
        ...gameState.logs
      ]
    });
  };

  const handleTurretHackSuccess = () => {
    if (!gameState) return;
    if (gameState.turnOrder.includes('turret_hacked')) return;

    const nextArch = gameState.netArchitecture.map(node => {
      if (node.floor === 3) {
        return {
          ...node,
          status: 'completed' as const,
          controlOption: { controlled: true, name: 'Automated Room Turret [ALLY]' }
        };
      }
      return node;
    });

    const currentQueue = [...gameState.turnOrder];
    currentQueue.push('turret_hacked');

    updateState({
      netArchitecture: nextArch,
      turnOrder: currentQueue,
      logs: [
        {
          id: `log_turret_online_${Date.now()}`,
          timestamp: getGameTime(),
          type: 'combat',
          message: `🤖 AUTOMATED TURRET ONLINE: Hijacked controller. Sector turret sorted into turn order queue! Will fire on hostiles.`
        },
        ...gameState.logs
      ]
    });
  };

  const handleReviveSynapse = () => {
    if (!gameState) return;
    const cost = 400;
    if (gameState.netdeck.credits < cost) {
      alert("Insufficient credits to run neuro-revival protocol!");
      return;
    }

    audio.playNetSuccess();
    updateState({
      synapseHp: gameState.maxSynapseHp,
      currentNetFloor: 1,
      netdeck: { ...gameState.netdeck, credits: gameState.netdeck.credits - cost },
      logs: [
        {
          id: `revive_${Date.now()}`,
          timestamp: getGameTime(),
          type: 'system',
          message: `🧠 NEURO-REVIVAL PROTOCOL DEPLOYED: Restored Neural Synapse HP. Deducted $${cost} credits from Netdeck cache balance.`
        },
        ...gameState.logs
      ]
    });
  };

  // Dispatch real-time classified lore-accurate Handout
  const handleTriggerLoreHandout = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    audio.playAlert();
    socket.send(JSON.stringify({
      type: 'BROADCAST_HANDOUT',
      payload: {
        title: "🚨 CLASSIFIED MILITECH LAB DOSSIER: PROJECT CY-29",
        content: `WARNING: Secure clearance index is required to access these subfiles. Biological test cell NC-22 failed containment parameters. Neural feedback grid experienced 100% loss. Hostile AI entity identified as "Alt Ghost Protocol". Ensure custom compiler scripts remain masked by Brain-ICE structures. Do NOT link physical cyberdeck core ports directly to Arasaka sub-grids in Watson District!`,
        imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600"
      }
    }));
  };

  const handleDismissHandout = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'DISMISS_HANDOUT' }));
  };

  const handleJackOutNetwork = () => {
    audio.playAlert();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'LEAVE_GM' }));
    }
    setUserRole(null);
  };

  // ROLE SELECTION INITIAL LANDING SCREEN
  if (userRole === null) {
    return (
      <div className="min-h-screen bg-[#050510] text-[#00ffff] flex items-center justify-center font-mono selection:bg-pink-500 selection:text-white p-4 relative screen-flicker crt-overlay">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-[#ff00ff] to-cyan-400 animate-pulse"></div>

        {/* Floating Background Ambient Cyberdeck Loop Embedded YouTube audio (peacetime theme) */}
        <iframe
          width="1"
          height="1"
          src="https://www.youtube.com/embed/AAn_p7uivco?autoplay=1&loop=1&playlist=AAn_p7uivco&controls=0&mute=0"
          title="Cyberpunk Ambient Player"
          allow="autoplay; encrypted-media"
          className="opacity-0 pointer-events-none absolute"
        ></iframe>

        <div className="w-full max-w-lg border-2 border-[#ff00ff] bg-[#0d0d1c]/95 rounded-lg p-6 relative overflow-hidden shadow-[0_0_35px_rgba(255,0,255,0.2)] text-center space-y-6">
          <div className="absolute top-3 left-4 text-[8px] font-mono uppercase bg-black/70 border border-cyan-400 text-cyan-400 px-1.5 py-0.5 rounded">
            MATRIX PORT: 3000
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-white tracking-widest uppercase text-glow-magenta select-none animate-pulse">
              // ENTER NIGHT CITY NETWORK LAYER //
            </h1>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest select-none">
              Access credentials required // Select active terminal seat layer
            </p>
          </div>

          {gmRejectedMessage && (
            <div className="p-2 border border-red-500/40 bg-red-950/20 text-red-500 rounded text-[9.5px] uppercase font-black tracking-tight leading-relaxed animate-pulse">
              ⚠️ {gmRejectedMessage}
            </div>
          )}

          {/* Cryptographic GM Passphrase Query Input Window overlay */}
          {showGmPasswordInput ? (
            <div className="p-4 border border-[#00ffff]/40 bg-cyan-950/10 rounded-lg space-y-4 text-left animate-fade-in">
              <span className="text-[10px] text-cyan-400 font-extrabold tracking-widest uppercase block border-b border-cyan-500/10 pb-1">// SECURITY CLEARANCE INTERPRET CHANNEL //</span>
              
              <div className="space-y-1.5">
                <label className="text-[8.5px] text-gray-400 uppercase tracking-wider block">ENTER CRYPTOGRAPHIC ACCESS PASSPHRASE:</label>
                <input
                  type="password"
                  placeholder="••••••••••••••"
                  value={gmPassword}
                  onChange={(e) => setGmPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      audio.playUIBeep();
                      if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: 'JOIN_AS_GM', payload: { password: gmPassword } }));
                      } else {
                        if (gmPassword === 'edgerunner') {
                          setUserRole('gm');
                          audio.playNetSuccess();
                        } else {
                          setGmRejectedMessage('[ACCESS DENIED // INCORRECT CRYPTOGRAPHIC ACCESS PASSPHRASE]');
                          audio.playAlert();
                        }
                      }
                    }
                  }}
                  className="w-full bg-black border border-cyan-500/40 hover:border-cyan-400 rounded px-2.5 py-1.5 outline-none font-mono tracking-widest text-[#00ffff] text-xs uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    audio.playUIBeep();
                    if (socket && socket.readyState === WebSocket.OPEN) {
                      socket.send(JSON.stringify({ type: 'JOIN_AS_GM', payload: { password: gmPassword } }));
                    } else {
                      if (gmPassword === 'edgerunner') {
                        setUserRole('gm');
                        audio.playNetSuccess();
                      } else {
                        setGmRejectedMessage('[ACCESS DENIED // INCORRECT CRYPTOGRAPHIC ACCESS PASSPHRASE]');
                        audio.playAlert();
                      }
                    }
                  }}
                  className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 text-black font-black uppercase text-[9px] tracking-wide rounded cursor-pointer"
                >
                  📡 AUTHENTICATE SECURE CELL
                </button>
                <button
                  onClick={() => {
                    audio.playUIBeep();
                    setShowGmPasswordInput(false);
                    setGmPassword('');
                  }}
                  className="w-full py-2 bg-black border border-gray-700 hover:bg-gray-800 text-gray-400 font-extrabold uppercase text-[9px] tracking-wide rounded cursor-pointer"
                >
                  DE-AUTHORIZE / REVERT
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 pt-2">
              {/* Join as GM */}
              <button
                disabled={hasActiveGm}
                onClick={() => {
                  audio.playUIBeep();
                  setShowGmPasswordInput(true);
                }}
                className={`p-4 border rounded-lg text-left transition duration-150 flex justify-between items-center group shadow-md ${
                  hasActiveGm
                    ? 'border-red-500/20 bg-red-950/5 text-red-500/50 cursor-not-allowed opacity-40'
                    : 'border-cyan-500/40 bg-cyan-950/15 hover:bg-cyan-500/10 hover:border-cyan-400 cursor-pointer text-[#00ffff]'
                }`}
              >
                <div>
                  <span className="text-[10.5px] font-black tracking-widest block uppercase">🕹️ ESTABLISH CORE OPERATOR</span>
                  <span className="text-xs font-black text-white mt-1 block uppercase">CONNECT AS GAME MASTER</span>
                </div>
                <Terminal className="text-cyan-404 group-hover:animate-spin-slow w-5 h-5 flex-shrink-0 ml-2" />
              </button>

              {/* Join as Player */}
              <button
                onClick={() => {
                  audio.playUIBeep();
                  setUserRole('player');
                  audio.playNetSuccess();
                }}
                className="p-4 border border-[#ff00ff]/40 bg-pink-950/10 hover:bg-pink-500/10 hover:border-pink-400 rounded-lg text-left transition duration-150 cursor-pointer flex justify-between items-center group shadow-md"
              >
                <div>
                  <span className="text-[10.5px] font-black text-pink-400 tracking-widest block uppercase">👤 DEPLOY CHROME EDGERUNNER</span>
                  <span className="text-xs font-black text-white mt-1 block uppercase">CONNECT AS EDGERUNNER</span>
                </div>
                <Compass className="text-pink-500 w-5 h-5 flex-shrink-0 ml-2 group-hover:scale-105" />
              </button>
            </div>
          )}

          {/* Locked feedback notification */}
          <div className="border-t border-gray-800 pt-4 text-[9px] text-gray-500 leading-normal max-w-sm mx-auto">
            {hasActiveGm ? (
              <span className="text-red-500 font-black flex items-center justify-center gap-1.5 uppercase tracking-widest animate-pulse filter drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
                ⚠️ [DISCONNECTED // ACTIVE GM CURRENTLY IN SESSION]
              </span>
            ) : (
              <span>GM seat is currently vacant. Enter cryptographic password to establish secure clearance.</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isTurretHacked = gameState.netArchitecture[2]?.status === 'completed';

  return (
    <div className="min-h-screen bg-[#07070e] text-gray-200 relative screen-flicker pb-12 crt-overlay select-none">
      <div className="scanning-line"></div>

      {/* Embedded hidden YouTube loop soundtracks */}
      <iframe
        width="1"
        height="1"
        src="https://www.youtube.com/embed/AAn_p7uivco?autoplay=1&loop=1&playlist=AAn_p7uivco&controls=0&mute=0"
        title="Cyberpunk Ambient Player"
        allow="autoplay; encrypted-media"
        className="opacity-0 pointer-events-none absolute"
      ></iframe>

      {/* STACKED MODAL LOCK & USER HANDOUT BROADCAST OVERLAY */}
      {activeHandout && (
        <div className="fixed inset-0 bg-black/90 min-h-screen z-[30000] flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300 select-none">
          <div className="w-full max-w-lg border-2 border-pink-500 bg-[#0d0911]/98 rounded p-5 relative shadow-[0_0_35px_rgba(236,72,153,0.35)] space-y-4">
            <div className="absolute top-2 right-3 text-[8.5px] text-pink-500 font-black animate-pulse bg-pink-500/10 border border-pink-500/20 px-1 py-0.5 rounded uppercase">
              Broadcast active
            </div>

            <div>
              <span className="text-[8.5px] text-pink-400 font-black block uppercase tracking-widest">// DECKMASTER REAL-TIME TRANSMISSION //</span>
              <h2 className="text-base font-black text-white mt-1 tracking-wider uppercase text-glow-magenta">{activeHandout.title}</h2>
            </div>

            {activeHandout.imageUrl && (
              <div className="w-full h-36 rounded overflow-hidden border border-zinc-800 bg-black/80">
                <img src={activeHandout.imageUrl} alt="handout visual" className="w-full h-full object-cover filter contrast-125 brightness-90 saturate-50" referrerPolicy="no-referrer" />
              </div>
            )}

            <p className="text-[10px] text-zinc-300 font-bold bg-black/60 border border-zinc-850 p-3 rounded leading-relaxed overflow-y-auto max-h-[140px] scrollbar-thin">
              {activeHandout.content}
            </p>

            <div className="flex gap-2 justify-end pt-1">
              {userRole === 'gm' && (
                <button
                  onClick={handleDismissHandout}
                  className="px-4 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded text-[9.5px] font-black uppercase cursor-pointer transition border border-pink-500"
                >
                  Dismiss for everyone
                </button>
              )}
              <button
                onClick={() => setActiveHandout(null)}
                className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 rounded text-[9.5px] uppercase cursor-pointer"
              >
                Close local window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cyberdeck Outer Header */}
      <header className="border-b-2 border-[#ff0055]/30 bg-[#0c0c16] relative">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff003c]/10 border-2 border-[#ff003c] flex items-center justify-center rounded shadow-[0_0_10px_rgba(255,0,60,0.3)]">
              <Cpu className="text-[#ff003c] w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider text-white flex items-center gap-2">
                DECKMASTER <span className="text-[10px] text-pink-500 bg-pink-500/10 border border-pink-500/30 px-1 py-0.5 rounded font-mono">RED.v1.0</span>
              </h1>
              <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5">
                CYBERDECK TACTICAL PLANNERS • COMPLY CP RED RULES
                <span className="text-glow-green uppercase font-bold text-[8.5px] text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">Role: {userRole}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-mono text-xs w-full md:w-auto justify-end">
            {/* Solo Combat HP bar */}
            <div className="bg-[#12111d] border border-white/5 py-1 px-3 rounded flex items-center gap-3.5 shadow-sm">
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-500 uppercase tracking-tighter">Apex HP (Solo)</span>
                <span className={`font-bold ${gameState.player.hp < 15 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                  {gameState.player.hp} / {gameState.player.maxHp}
                </span>
              </div>
              <div className="w-13 bg-black rounded-sm h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${gameState.player.hp < 15 ? 'bg-red-500 animate-pulse' : 'bg-cyan-500'}`}
                  style={{ width: `${(gameState.player.hp / gameState.player.maxHp) * 100}%` }}
                />
              </div>
            </div>

            {/* Netrunner Brain Synapse HP bar */}
            <div className="bg-[#12111d] border border-white/5 py-1 px-3 rounded flex items-center gap-3.5 shadow-sm">
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-500 uppercase tracking-tighter flex items-center gap-1">
                  <Activity className="w-3 h-3 text-[#ff00ff]" /> SYNAPSE HP
                </span>
                <span className={`font-bold ${gameState.synapseHp <= 10 ? 'text-red-500 animate-pulse font-black' : 'text-[#ff00ff]'}`}>
                  {gameState.synapseHp} / {gameState.maxSynapseHp}
                </span>
              </div>
              <div className="w-13 bg-black rounded-sm h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${gameState.synapseHp <= 10 ? 'bg-red-500 animate-pulse' : 'bg-[#ff00ff]'}`}
                  style={{ width: `${(gameState.synapseHp / gameState.maxSynapseHp) * 100}%` }}
                />
              </div>
            </div>

            {/* Virtual credits label */}
            <div className="bg-[#12111d] border border-white/5 py-1.5 px-3 rounded flex flex-col justify-center text-center">
              <span className="text-[8px] text-gray-500 uppercase tracking-tighter">CASH BAL</span>
              <span className="font-bold text-yellow-400 text-xs tracking-wider">
                {gameState.netdeck.credits.toLocaleString()}¢
              </span>
            </div>

            {/* Persistent jack out / disconnect roles button */}
            <button
              onClick={handleJackOutNetwork}
              className="px-3 py-2 border border-red-500 hover:bg-red-600 hover:text-white text-red-500 rounded bg-red-550/5 flex items-center gap-1 font-bold text-[9.5px] uppercase cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" /> Jack Out
            </button>
          </div>
        </div>
      </header>

      {/* Primary Container Layout */}
      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">
        
        {/* audio and voice command controls */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch gap-3">
          <AudioControls currentMode={gameState.combatActive ? 'combat' : 'exploration'} />
          
          <div className="bg-[#0c0c16] border border-zinc-800 rounded px-4 py-2 flex items-center justify-between gap-4 font-mono text-xs">
            <span className="text-[8.5px] text-gray-500 uppercase mr-1 flex items-center gap-1 tracking-wider">
              <Mic className="text-cyan-400 w-3.5 h-3.5" /> acoustics vocal triggers:
            </span>

            <button
              onClick={() => {
                audio.playUIBeep();
                setIsListening(!isListening);
              }}
              className={`px-3 py-1 text-[9px] rounded font-black uppercase flex items-center gap-1 cursor-pointer tracking-wider ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-zinc-820 hover:bg-zinc-750 text-cyan-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-white' : 'bg-cyan-500'}`}></span>
              {isListening ? 'Acu Listening (ON)' : 'Enable Voice (OFF)'}
            </button>

            <span className="text-[7.5px] text-zinc-550 italic uppercase">Speak "Move East", "Netrunning"</span>
          </div>
        </div>

        {/* Tab Selection controller deck config */}
        <div className="flex flex-col sm:flex-row items-stretch justify-between gap-4 border-b border-white/5 pb-2">
          
          <div className="flex rounded-lg bg-[#0e0c15] p-1 border border-white/5 max-w-sm text-xs font-mono">
            <button
              onClick={() => {
                setActiveTab('combat');
                audio.playUIBeep();
              }}
              className={`flex-1 py-2 px-6 rounded transition font-black tracking-widest cursor-pointer ${
                activeTab === 'combat'
                  ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              💥 COMBAT TERMINAL
            </button>
            <button
              onClick={() => {
                setActiveTab('netrunning');
                audio.playUIBeep();
              }}
              className={`flex-1 py-2 px-6 rounded transition font-black tracking-widest cursor-pointer ${
                activeTab === 'netrunning'
                  ? 'bg-[#ff00ff] shadow-[0_0_10px_rgba(255,0,255,0.3)] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🌐 SUBNET WIREFRAME
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 md:gap-3 text-[10px] font-mono text-gray-400">
            {userRole === 'gm' && (
              <div className="flex gap-1.5">
                <button
                  onClick={handleTriggerLoreHandout}
                  className="py-1 px-2.5 bg-indigo-650 hover:bg-indigo-700 border border-indigo-500 text-white rounded text-[9px] font-black uppercase cursor-pointer"
                >
                  📢 Push Handout
                </button>
                <button
                  onClick={() => {
                    audio.playAlert();
                    const stateCopy = { ...gameState, combatActive: !gameState.combatActive };
                    setGameState(stateCopy);
                    if (socket && socket.readyState === WebSocket.OPEN) {
                      socket.send(JSON.stringify({ type: 'STATE_UPDATE', payload: stateCopy }));
                    }
                  }}
                  className="py-1 px-2 text-[9px] font-black uppercase rounded bg-rose-950/20 border border-rose-500 text-rose-400 cursor-pointer"
                >
                  {gameState.combatActive ? 'Force Passive Maps' : 'Declare Skirmish Active'}
                </button>
              </div>
            )}

            <span className="px-2 py-1 bg-black/40 border border-white/5 rounded">REF 8</span>
            <span className="px-2 py-1 bg-black/40 border border-white/5 rounded">DEX 8</span>
            <span className="px-2 py-1 bg-black/40 border border-white/5 rounded">COOL 8</span>
            <span className="px-2 py-1 bg-black/40 border border-white/5 rounded text-yellow-400 font-bold uppercase" title="Current Crew Active area district tracker">
              Loc: {gameState.enemies[0]?.isDead ? 'Watson' : 'Old Combat Zone'}
            </span>

            <button
              onClick={() => { audio.playAlert(); setShowCharacterSheet(true); }}
              className="py-1.5 px-3 border border-rose-500/40 hover:border-rose-500 text-rose-500 hover:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 rounded font-black cursor-pointer uppercase text-[10px] select-none hover:scale-103 transition shadow-[0_0_8px_rgba(239,68,68,0.25)] animate-pulse mr-1"
            >
              💥 CHROME SHEET PANEL
            </button>

            <button
              onClick={() => { audio.playUIBeep(); setShowCharacterCreator(true); }}
              className="py-1 px-2.5 border border-cyan-500/20 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 rounded transition font-black cursor-pointer uppercase text-[10px]"
            >
              👤 Character Creator
            </button>

            <button
              onClick={handleResetState}
              className="py-1 px-2 border border-red-500/20 hover:border-red-500 text-red-500 hover:text-red-400 rounded transition font-bold"
            >
              Wipe Cache
            </button>
          </div>
        </div>

        {/* Viewport Render Block */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          <div className="xl:col-span-3">
            {activeTab === 'combat' ? (
              <div className="space-y-6">
                
                {/* DYNAMIC TRANSITION: Render Macro District Overview map when combat is passive (combatActive === false) */}
                {!gameState.combatActive ? (
                  userRole === 'gm' ? (
                    <div className="space-y-6">
                      <div className="p-3 bg-[#0d091a] border border-[#ff00ff]/35 rounded text-center animate-pulse">
                        <span className="text-yellow-400 font-black uppercase text-[10px] block">
                          💡 COMBAT DETECTED INACTIVE // RENDER NIGHT CITY WORLD VECTOR OVERVIEW DIRECTORYMAP MAP
                        </span>
                      </div>

                      <DistrictMap
                        currentDistrict={gameState.enemies[0]?.isDead ? 'Watson' : 'Old Combat Zone'}
                        portraitCategory={portraitCategory}
                        onSelectPortraitCategory={(cat) => setPortraitCategory(cat)}
                        onSelectDistrict={(name) => {
                          // Dynamically update coordinates info
                          setGameState(prev => {
                            if (!prev) return prev;
                            const nextEnemies = prev.enemies.map(e => ({ ...e, description: `Spawnee in ${name}` }));
                            return { ...prev, enemies: nextEnemies };
                          });
                        }}
                      />
                    </div>
                  ) : (
                    <div className="p-8 border border-zinc-900 bg-[#07070e] rounded-lg text-center space-y-4">
                      <div className="w-14 h-14 rounded-full border border-pink-500/30 bg-pink-950/15 flex items-center justify-center mx-auto animate-pulse">
                        <Compass className="text-pink-500 w-7 h-7 animate-spin-slow" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest">// SECURE LINK ESTABLISHED //</h3>
                        <p className="text-[10px] text-gray-400 font-mono max-w-sm mx-auto leading-relaxed uppercase">
                          Awaiting core operator to finalize database grid initialization. Access netrun deck or monitor bio-metric diagnostics.
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-6">
                    {userRole === 'gm' && (
                      <MissionGenerator
                        logs={gameState.logs}
                        currentGig={gameState.currentGig}
                        onLoadGig={handleLoadGig}
                      />
                    )}

                    <CombatTrack
                      player={gameState.player}
                      enemies={gameState.enemies}
                      combatActive={gameState.combatActive}
                      round={gameState.round}
                      turnIndex={gameState.turnIndex}
                      turnOrder={gameState.turnOrder}
                      logs={gameState.logs}
                      turretHacked={isTurretHacked}
                      updateState={handleUpdateCombatState}
                      currentGig={gameState.currentGig}
                      manualNpcControl={gameState.manualNpcControl}
                      customObstacles={gameState.customObstacles}
                      userRole={userRole}
                    />
                  </div>
                )}
              </div>
            ) : (
              <NetrunGrid
                netArchitecture={gameState.netArchitecture}
                currentNetFloor={gameState.currentNetFloor}
                synapseHp={gameState.synapseHp}
                maxSynapseHp={gameState.maxSynapseHp}
                credits={gameState.netdeck.credits}
                player={gameState.player}
                updateState={handleUpdateNetState}
                logs={gameState.logs}
                onTurretHackSuccess={handleTurretHackSuccess}
                onJackOut={() => setActiveTab('combat')}
              />
            )}
          </div>

          {/* Side Logging Terminal */}
          <div className="bg-[#0b0b14]/95 border border-gray-800 rounded-lg p-4 space-y-3.5 shadow-xl xl:col-span-1 h-[520px] flex flex-col justify-between">
            <div className="border-b border-gray-800 pb-2.5 flex justify-between items-center">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <Terminal className="text-cyan-400 animate-spin-slow w-4 h-4" /> NIGHT_CITY_LOGGER
              </span>
              <span className="text-[9px] font-mono text-gray-600 bg-cyan-400/5 border border-cyan-400/20 px-1.5 py-0.5 rounded">STREAM LIVE</span>
            </div>

            {/* Scrollable logs area */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 text-xs font-mono font-bold leading-relaxed selection:bg-pink-500">
              {isAnimatingLogs && activeRollAnimation && (
                <div className="border border-cyan-400 bg-cyan-950/20 p-2.5 rounded-lg mb-2 flex items-center gap-3 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse">
                  {/* Rotating 3D wireframe SVG d10 */}
                  <div className="w-10 h-10 relative flex-shrink-0 flex items-center justify-center select-none">
                    <svg className="w-10 h-10 text-cyan-400 animate-spin" style={{ animationDuration: '0.15s' }} viewBox="0 0 100 100">
                      <polygon points="50,5 95,35 95,65 50,95 5,65 5,35" fill="rgba(6,182,212,0.15)" stroke="currentColor" strokeWidth="4" />
                      <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="2" />
                      <line x1="50" y1="50" x2="95" y2="35" stroke="currentColor" strokeWidth="2" />
                      <line x1="50" y1="50" x2="5" y2="35" stroke="currentColor" strokeWidth="2" />
                      <line x1="50" y1="50" x2="95" y2="65" stroke="currentColor" strokeWidth="2" />
                      <line x1="50" y1="50" x2="5" y2="65" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span className="absolute text-[11px] text-white font-black animate-pulse" style={{ animationDuration: '0.05s' }}>
                      {Math.floor(Math.random() * 10) + 1}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-cyan-400 block tracking-widest leading-none">// DECODING INFRA CELL //</span>
                    <span className="text-[10px] text-white uppercase font-black tracking-wider block mt-1">ROLLING D10: {activeRollAnimation.label}</span>
                  </div>
                </div>
              )}

              {gameState.logs.map((log, index) => {
                // Hide first log if currently animating rolling d10 details
                if (isAnimatingLogs && index === 0) return null;

                let textClass = 'text-gray-300';
                if (log.type === 'combat') textClass = 'text-orange-400';
                else if (log.type === 'system') textClass = 'text-cyan-400';
                else if (log.type === 'netrun') textClass = 'text-pink-400';

                return (
                  <div key={log.id} className="border-b border-white/5 pb-1.5 leading-normal">
                    <span className="text-[9px] text-gray-500 font-normal mr-1.5">[{log.timestamp}]</span>
                    <span className={textClass}>{log.message}</span>
                  </div>
                );
              })}
              {gameState.logs.length === 0 && (
                <div className="text-center text-gray-600 py-12 text-xs">
                  Awaiting feed lines...
                </div>
              )}
            </div>

            <div className="text-[10px] text-gray-500 text-center border-t border-gray-800 pt-2.5 flex justify-between">
              <span>LATENCY: 4MS</span>
              <span>FEED_BUFFER: [OK]</span>
            </div>
          </div>
        </div>
      </main>

      {/* --- CHARACTER CREATION MODULE OVERLAY --- */}
      {showCharacterCreator && (
        <CharacterCreator
          onSaveCharacter={handleSaveCharacter}
          onClose={() => setShowCharacterCreator(false)}
        />
      )}

      {/* --- HIGH-FIDELITY CHARACTER SHEET PANEL DRAWER --- */}
      {showCharacterSheet && (
        <CharacterSheetDrawer
          player={gameState.player}
          enemies={gameState.enemies}
          combatActive={gameState.combatActive}
          onUpdateFullState={updateState}
          logs={gameState.logs}
          onClose={() => setShowCharacterSheet(false)}
        />
      )}

      {/* --- DEAD PLAYER FLANTED SCREEN OVERLAY --- */}
      {gameState.player.isDead && (
        <div className="fixed inset-0 bg-[#0c0005]/95 flex flex-col items-center justify-center p-4 z-50 backdrop-blur-md">
          <Skull className="text-red-600 w-24 h-24 animate-bounce mb-4 filter drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
          <h2 className="text-[#ff003c] font-mono text-3xl font-black uppercase tracking-widest text-center select-none animate-pulse">
            NEURAL FLATLINE TERMINATION
          </h2>
          <p className="text-gray-400 font-mono text-xs max-w-sm text-center leading-relaxed mt-2 border-b border-red-500/20 pb-4 mb-4">
            Critical internal armor failure. Biological heart metrics collapsed. Your custom chrome cyberdeck has been scavenged by nearby booster gangs.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem(LOCAL_STORAGE_KEY);
              setGameState(JSON.parse(JSON.stringify(INITIAL_STATE)));
              audio.playAlert();
            }}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-mono font-black uppercase rounded block text-xs tracking-wider border border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.5)] cursor-pointer"
          >
            🔌 REPLUG SYSTEM REGISTERS
          </button>
        </div>
      )}
    </div>
  );
}
