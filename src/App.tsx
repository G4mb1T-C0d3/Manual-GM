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
import {
  Skull, Terminal, Shield, Cpu, RefreshCw, Layers, Compass, HelpCircle,
  Database, Award, Activity, Heart, EyeOff, Radio
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'cyberpunk_red_tracker_state';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [activeTab, setActiveTab] = useState<'combat' | 'netrunning'>('combat');
  const [showCharacterCreator, setShowCharacterCreator] = useState<boolean>(false);
  const [showCharacterSheet, setShowCharacterSheet] = useState<boolean>(false);

  // Load state from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GameState;
        // Basic sanity check to ensure loaded fields match types
        if (parsed.player && parsed.enemies && parsed.netArchitecture) {
          setGameState(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve localStorage state", e);
    }
    // Fallback to initial state
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

  // Destruction state reset
  const handleResetState = () => {
    if (confirm("Are you sure you want to reboot system registers? This will wipe user and netrun progression!")) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setGameState(JSON.parse(JSON.stringify(INITIAL_STATE)));
      audio.playAlert();
    }
  };

  // Helper code to modify state chunks dynamically
  const updateState = (newState: Partial<GameState>) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const combined = { ...prev, ...newState };

      // AUTOMATED ZERO-HP LEATHALITY RUNTIME CLEANUP
      let turnOrderChanged = false;
      let enemiesChanged = false;
      let logsChanged = false;

      let nextEnemies = combined.enemies ? [...combined.enemies] : [];
      let nextTurnOrder = combined.turnOrder ? [...combined.turnOrder] : [];
      let nextLogs = combined.logs ? [...combined.logs] : [];

      if (combined.combatActive) {
        // Player HP check
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

        // Hostile Booster HP checks
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
    
    // Reset action tracking flags on load to prevent leakages from prior states
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

    // Auto-calculate turn order sequence
    const turnOrderSeq = ['player_apex', ...cleanEnemies.map(e => e.id)];

    updateState({
      player: cleanPlayer,
      currentGig: gig,
      enemies: cleanEnemies,
      netArchitecture: netArchList,
      currentNetFloor: 1, // AP reset
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

  // Turn turret state to companion ally in active turn queues
  const handleTurretHackSuccess = () => {
    if (!gameState) return;
    
    // Check if turret is already in turn list
    if (gameState.turnOrder.includes('turret_hacked')) return;

    // Mutate floor 3 CC-01 control node status toCompleted
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

    // Add turret_hacked to initiative order list at slot index #2 or REF 12
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

  // Synapse revival if hacker brain runs dry
  const handleReviveSynapse = () => {
    if (!gameState) return;
    
    const cost = 400;
    if (gameState.netdeck.credits < cost) {
      alert("Insufficient credits to run neuro-revival protocol! Wipe standard cache manually.");
      return;
    }

    audio.playNetSuccess();
    
    updateState({
      synapseHp: gameState.maxSynapseHp,
      currentNetFloor: 1, // dump back to AP level
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

  const isTurretHacked = gameState.netArchitecture[2]?.status === 'completed';

  return (
    <div className="min-h-screen bg-[#07070e] text-gray-200 relative screen-flicker pb-12 crt-overlay select-none">
      {/* scanning visual neon line overlay */}
      <div className="scanning-line"></div>

      {/* Cyberdeck Outer Header */}
      <header className="border-b-2 border-[#ff0055]/30 bg-[#0c0c16] relative">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff003c]/10 border-2 border-[#ff003c] flex items-center justify-center rounded shadow-[0_0_10px_rgba(255,0,60,0.3)]">
              <Cpu className="text-[#ff003c] w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider text-white flex items-center gap-2">
                DECKMASTER <span className="text-[10px] text-pink-500 bg-pink-500/10 border border-pink-500/30 px-1 py-0.5 rounded font-mono">RED.v1.0</span>
              </h1>
              <p className="text-[10px] text-gray-500 font-mono">CYBERDECK TACTICAL PLANNERS • CYBERPUNK RED RULES-COMPLIANT</p>
            </div>
          </div>

          {/* Quick HUD Metrics */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-mono text-xs w-full md:w-auto justify-end">
            {/* Solo Combat HP bar */}
            <div className="bg-[#12111d] border border-white/5 py-1 px-3 rounded flex items-center gap-3.5 shadow-sm">
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-500 uppercase tracking-tighter">Apex HP (Solo)</span>
                <span className={`font-bold ${gameState.player.hp < 15 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                  {gameState.player.hp} / {gameState.player.maxHp}
                </span>
              </div>
              <div className="w-16 bg-black rounded-sm h-2 overflow-hidden">
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
              <div className="w-16 bg-black rounded-sm h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${gameState.synapseHp <= 10 ? 'bg-red-500 animate-pulse' : 'bg-[#ff00ff]'}`}
                  style={{ width: `${(gameState.synapseHp / gameState.maxSynapseHp) * 100}%` }}
                />
              </div>
              {gameState.synapseHp <= 0 && (
                <button
                  onClick={handleReviveSynapse}
                  className="px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500 hover:bg-yellow-500 hover:text-black rounded text-[8px] font-black uppercase text-yellow-400 transition-colors cursor-pointer"
                  title="Neuro-Revival System"
                >
                  Revive (-400¢)
                </button>
              )}
            </div>

            {/* Virtual credits label */}
            <div className="bg-[#12111d] border border-white/5 py-2 px-3.5 rounded flex flex-col justify-center text-center">
              <span className="text-[8px] text-gray-500 uppercase tracking-tighter">DATA CASH WALLET</span>
              <span className="font-bold text-yellow-400 text-sm tracking-wider">
                {gameState.netdeck.credits.toLocaleString()}¢
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Primary Container Layout */}
      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">
        
        {/* procedural sound widget */}
        <AudioControls currentMode={gameState.combatActive ? 'combat' : 'exploration'} />

        {/* Tab Selection controller deck */}
        <div className="flex flex-col sm:flex-row items-stretch justify-between gap-4 border-b border-white/5 pb-2">
          
          {/* Main Selectors */}
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

          {/* Core attributes summary widgets */}
          <div className="flex flex-wrap items-center gap-1.5 md:gap-3 text-[10px] font-mono text-gray-400">
            <span className="px-2 py-1 bg-black/40 border border-white/5 rounded">REF 8</span>
            <span className="px-2 py-1 bg-black/40 border border-white/5 rounded">DEX 8</span>
            <span className="px-2 py-1 bg-black/40 border border-white/5 rounded">COOL 8</span>
            <span className="px-2 py-1 bg-black/40 border border-white/5 rounded">TECH 7</span>
            
            {/* Turret CC Companion tag */}
            {isTurretHacked ? (
              <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded uppercase font-black animate-pulse">
                🛡️ CC-01 TURRET HIJACKED
              </span>
            ) : (
              <span className="px-2 py-1 bg-gray-900 border border-gray-800 text-gray-500 rounded uppercase">
                🛡️ TURRET STANDBY
              </span>
            )}

            <button
              onClick={() => { audio.playAlert(); setShowCharacterSheet(true); }}
              className="py-1.5 px-3 border border-rose-500/40 hover:border-rose-500 text-rose-500 hover:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 rounded font-black cursor-pointer uppercase text-[10px] select-none hover:scale-103 transition shadow-[0_0_8px_rgba(239,68,68,0.25)] animate-pulse mr-1"
              title="OPEN DECK CHROME // CHARACTER SHEET drawer panel"
            >
              💥 CHROME SHEET PANEL
            </button>

            <button
              onClick={() => { audio.playUIBeep(); setShowCharacterCreator(true); }}
              className="py-1 px-2.5 border border-cyan-500/20 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 rounded transition font-black cursor-pointer uppercase text-[10px]"
              title="Open dynamic character sheet module"
            >
              👤 Character Creator
            </button>

            <button
              onClick={handleResetState}
              className="py-1 px-2 border border-red-500/20 hover:border-red-500 text-red-500 hover:text-red-400 rounded transition font-bold"
              title="System reboot registers"
            >
              Wipe Cache
            </button>
          </div>
        </div>

        {/* Viewport Render Block */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          {/* Main Viewport (75% width on large desktops, 100% on other layouts) */}
          <div className="xl:col-span-3">
            {activeTab === 'combat' ? (
              <div className="space-y-6">
                <MissionGenerator
                  logs={gameState.logs}
                  currentGig={gameState.currentGig}
                  onLoadGig={handleLoadGig}
                />

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
                />
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
              />
            )}
          </div>

          {/* Side Logging Terminal (Always visible on large monitors to simulate authentic operator screen overlays) */}
          <div className="bg-[#0b0b14]/95 border border-gray-800 rounded-lg p-4 space-y-3.5 shadow-xl xl:col-span-1 h-[520px] flex flex-col justify-between">
            <div className="border-b border-gray-800 pb-2.5 flex justify-between items-center">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <Terminal className="text-cyan-400 animate-spin-slow w-4 h-4" /> NIGHT_CITY_LOGGER
              </span>
              <span className="text-[9px] font-mono text-gray-600 bg-cyan-400/5 border border-cyan-400/20 px-1.5 py-0.5 rounded">STREAM LIVE</span>
            </div>

            {/* Scrollable logs area */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 text-xs font-mono font-bold leading-relaxed selection:bg-pink-500">
              {gameState.logs.map((log) => {
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
              <span>LATENCY: 9MS</span>
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
          {/* visual skull */}
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
