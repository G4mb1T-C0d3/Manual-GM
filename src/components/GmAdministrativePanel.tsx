import React, { useState } from 'react';
import { Character, Weapon, NetNode } from '../types';
import { audio } from '../audio';
import { getGameTime } from '../utils';
import { Shield, Sparkles, AlertTriangle, Key, Plus, Trash, Zap, Eye, EyeOff, ArrowUp, ArrowDown, Play } from 'lucide-react';

const ENEMY_ARCHETYPES = [
  {
    name: "Arasaka Corporate Security",
    hp: 30,
    spHead: 11,
    spTorso: 11,
    weapons: [{ id: 'ar_pistol', name: 'Arasaka Heavy Pistol', type: 'pistol' as const, damage: '3d6', ammo: 8, maxAmmo: 8 }],
    tauntText: "Securing private sector asset, stand down!",
    desc: "Low-to-mid threat, wearing Light Armorjack suite, reliable fire support."
  },
  {
    name: "Militech Strike Soldier",
    hp: 45,
    spHead: 12,
    spTorso: 14, // Metal Gear armor values
    weapons: [
      { id: 'mil_ar', name: 'Militech Heavy Assault Rifle', type: 'rifle' as const, damage: '5d6', ammo: 30, maxAmmo: 30, autofireRating: 3 },
      { id: 'mil_shotgun', name: 'Tactical Breach Shotgun', type: 'shotgun' as const, damage: '5d6', ammo: 4, maxAmmo: 4 }
    ],
    tauntText: "Incursion identified. Authorization index Alpha-Nine: EXTERMINATE.",
    desc: "High threat, heavily geared, combat stims and high-capacity automatic rounds."
  },
  {
    name: "Steel Street Samurai",
    hp: 35,
    spHead: 7,
    spTorso: 11,
    weapons: [{ id: 'sam_sword', name: 'Carbon Fiber Wolvers', type: 'melee' as const, damage: '3d6', ammo: 1, maxAmmo: 1 }],
    tauntText: "You can't dodge carbon-steel kinetic sword sweeps!",
    desc: "Fast melee specialist, cybernetically enhanced with high Reflex and heavy Evasion rating."
  },
  {
    name: "Rogue Net-Techie",
    hp: 30,
    spHead: 7,
    spTorso: 7,
    weapons: [{ id: 'tech_pistol', name: 'Budget Arms Pistol', type: 'pistol' as const, damage: '2d6', ammo: 10, maxAmmo: 10 }],
    tauntText: "Diverting local grid power to feed back electronic static!",
    desc: "Utilizes customized tech gizmos and remote drones, strikes vulnerable spots."
  },
  {
    name: "Sector Combat Medtech",
    hp: 35,
    spHead: 11,
    spTorso: 11,
    weapons: [{ id: 'med_pistol', name: 'Speed Injection Syringe', type: 'melee' as const, damage: '2d6', ammo: 1, maxAmmo: 1 }],
    tauntText: "Injecting epinephrine booster stims. Push forward, boys!",
    desc: "Support class geared with speedheals and stabilizers to heal active fallen allies."
  }
];

const PRESETS_CRITICAL_INJURIES = [
  "Broken Leg",
  "Collapsed Lung",
  "Brain Injury",
  "Torn Muscle",
  "Temporary Blindness"
];

interface GmAdministrativePanelProps {
  player: Character;
  enemies: Character[];
  combatActive: boolean;
  turnOrder: string[];
  turnIndex: number; // Added to highlight current active character
  logs: any[];
  onUpdateFullState: (newState: any) => void;
  onOverrideCodeUnlocked: (unlocked: boolean) => void;
  overrideUnlocked: boolean;
  manualNpcControl?: boolean;
}

export default function GmAdministrativePanel({
  player,
  enemies,
  combatActive,
  turnOrder,
  turnIndex,
  logs,
  onUpdateFullState,
  onOverrideCodeUnlocked,
  overrideUnlocked,
  manualNpcControl = false
}: GmAdministrativePanelProps) {
  const [code, setCode] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Controls
  const [selectedCharId, setSelectedCharId] = useState<string>(player.id);
  const [selectedArchetypeIndex, setSelectedArchetypeIndex] = useState<number>(0);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === '2077') {
      audio.playNetSuccess();
      onOverrideCodeUnlocked(true);
      setErrorMessage('');
    } else {
      audio.playAlert();
      setErrorMessage('DECRYPTION LOCKOUT: FAILED AUTHORIZATION KEY');
      setTimeout(() => setErrorMessage(''), 2500);
    }
  };

  const handleLockAdmin = () => {
    audio.playUIBeep();
    onOverrideCodeUnlocked(false);
    setCode('');
  };

  // State setters
  const activeTargetChar = selectedCharId === player.id ? player : enemies.find(en => en.id === selectedCharId);

  const handleAdjustHp = (newHp: number) => {
    const hpValue = Math.max(0, Math.min(newHp, activeTargetChar?.maxHp || 100));
    let nextPlayer = { ...player };
    let nextEnemies = [...enemies];

    if (selectedCharId === player.id) {
      nextPlayer.hp = hpValue;
      nextPlayer.isDead = hpValue <= 0;
    } else {
      nextEnemies = enemies.map(en => {
        if (en.id === selectedCharId) {
          return { ...en, hp: hpValue, isDead: hpValue <= 0 };
        }
        return en;
      });
    }

    onUpdateFullState({
      player: nextPlayer,
      enemies: nextEnemies,
      logs: [{
        id: `gm_hp_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'system',
        message: `🛠️ GM REGISTER OVERRIDE: HP manual adjusting for ${activeTargetChar?.name} to [${hpValue}/${activeTargetChar?.maxHp} HP].`
      }, ...logs]
    });
  };

  const handleToggleInjury = (injury: string) => {
    if (!activeTargetChar) return;
    audio.playUIBeep();

    const isAdded = activeTargetChar.criticalInjuries.includes(injury);
    const nextInjuries = isAdded 
      ? activeTargetChar.criticalInjuries.filter(i => i !== injury) 
      : [...activeTargetChar.criticalInjuries, injury];

    let nextPlayer = { ...player };
    let nextEnemies = [...enemies];

    if (selectedCharId === player.id) {
      nextPlayer.criticalInjuries = nextInjuries;
    } else {
      nextEnemies = enemies.map(en => {
        if (en.id === selectedCharId) {
          return { ...en, criticalInjuries: nextInjuries };
        }
        return en;
      });
    }

    onUpdateFullState({
      player: nextPlayer,
      enemies: nextEnemies,
      logs: [{
        id: `gm_inj_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'system',
        message: `🛠️ GM REGISTER OVERRIDE: ${isAdded ? 'CURED' : 'INFLICTED'} critical injury "${injury}" on ${activeTargetChar.name}.`
      }, ...logs]
    });
  };

  // Add enemy archetype dynamically to the active field
  const handleSpawnArchetype = () => {
    audio.playAlert();
    const preset = ENEMY_ARCHETYPES[selectedArchetypeIndex];
    const newId = `gm_enemy_${Date.now()}`;
    const nameStr = `GM Presets: ${preset.name} [Spawned]`;

    // Coordinates mapping to unoccupied sector
    const newX = Math.floor(Math.random() * 5) + 5;
    const newY = Math.floor(Math.random() * 5) + 5;

    const newNpc: Character = {
      id: newId,
      name: nameStr,
      isPlayer: false,
      isAlly: false,
      ref: 6, dex: 6, tech: 6, cool: 6, move: 6,
      hp: preset.hp,
      maxHp: preset.hp,
      spHead: preset.spHead,
      spTorso: preset.spTorso,
      initiative: 10 + Math.floor(Math.random() * 5), // dynamic starter initiative
      weapons: JSON.parse(JSON.stringify(preset.weapons)),
      currentWeaponId: preset.weapons[0].id,
      isCovered: false,
      isDead: false,
      criticalInjuries: [],
      stealthState: 'none',
      facedownPenalty: false,
      tauntText: preset.tauntText,
      x: newX,
      y: newY
    };

    const nextEnemies = [...enemies, newNpc];

    // If combat encounter is active, insert this enemy to active turn queues immediately
    let nextTurnOrder = [...turnOrder];
    if (combatActive) {
      nextTurnOrder.push(newId);
    }

    onUpdateFullState({
      enemies: nextEnemies,
      turnOrder: nextTurnOrder,
      logs: [{
        id: `gm_spawn_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'system',
        message: `🛠️ GM ADMINISTRATIVE: Spawned ${preset.name} archetype coordinate (${newX}, ${newY}). Inserted into turn registries.`
      }, ...logs]
    });
  };

  // Remove selected hostile entirely
  const handleRemoveHostile = () => {
    if (selectedCharId === player.id) {
      alert("Cannot delete player character register!");
      return;
    }

    audio.playAlert();

    const nextEnemies = enemies.filter(en => en.id !== selectedCharId);
    const nextTurnOrder = turnOrder.filter(id => id !== selectedCharId);

    onUpdateFullState({
      enemies: nextEnemies,
      turnOrder: nextTurnOrder,
      logs: [{
        id: `gm_rm_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'system',
        message: `🛠️ GM ADMINISTRATIVE: Evaporated character ledger index ${selectedCharId} from active battlefield.`
      }, ...logs]
    });

    setSelectedCharId(player.id);
  };

  // Absolute end combat switch & System Flush (Bypasses confirmations completely)
  const handleForceEndCombat = () => {
    audio.playAlert();
    audio.setMode('exploration');

    const resetPlayer = {
      ...player,
      actionSpent: false,
      moveActionSpent: false,
      deployed: true // Ensure player stays deployed for future boot
    };

    onUpdateFullState({
      combatActive: false,
      turnIndex: 0,
      turnOrder: [],
      enemies: [], // Wipes all active NPC tokens off the grid
      customObstacles: [], // Wipes all custom placed props off the grid
      logs: [], // Empty and purge all active turn logs
      round: 1,
      player: resetPlayer
    });
  };

  // Restart combat encounter to standard clean state
  const handleRestartEncounter = () => {
    if (!confirm("Are you sure you want to RESTART this combat encounter? This will restore player & enemy HP to maximum, revive flatlined units, clear critical injuries, and reset Round/Turn metrics.")) {
      return;
    }
    audio.playAlert();

    // 1. Fully restore player parameters
    const nextPlayer = {
      ...player,
      hp: player.maxHp,
      isDead: false,
      criticalInjuries: [],
      actionSpent: false,
      moveActionSpent: false
    };

    // 2. Fully restore physical enemy assets
    const nextEnemies = enemies.map(en => ({
      ...en,
      hp: en.maxHp,
      isDead: false,
      criticalInjuries: [],
      actionSpent: false,
      moveActionSpent: false
    }));

    onUpdateFullState({
      player: nextPlayer,
      enemies: nextEnemies,
      combatActive: true,
      round: 1,
      turnIndex: 0,
      logs: [{
        id: `gm_restart_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'system',
        message: `🔄 GM ADMINISTRATIVE ENCOUNTER REBOOT: Reloaded active scene metrics. Vital parameters fully restored. Round resets to 1.`
      }, ...logs]
    });
  };

  const handleActionBypassOverride = () => {
    if (!combatActive) {
      alert("Combat session is not active!");
      return;
    }
    audio.playNetSuccess();
    
    // Reset all characters spent locks
    const nextPlayer = { ...player, actionSpent: false, moveActionSpent: false };
    const nextEnemies = enemies.map(en => ({ ...en, actionSpent: false, moveActionSpent: false }));

    onUpdateFullState({
      player: nextPlayer,
      enemies: nextEnemies,
      logs: [{
        id: `gm_by_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'system',
        message: `🛠️ GM MATRIX UNLOCKED: Reset turn execution locks (Action + Move) for ALL participants.`
      }, ...logs]
    });
  };

  // INITIATIVE COMMAND matrix reordering logic
  const handleUpdateInitiativeValue = (charId: string, value: number) => {
    let nextPlayer = { ...player };
    let nextEnemies = [...enemies];

    if (charId === player.id) {
      nextPlayer.initiative = value;
    } else {
      nextEnemies = enemies.map(en => {
        if (en.id === charId) {
          return { ...en, initiative: value };
        }
        return en;
      });
    }

    // Capture currently active character id to prevent jumping turns
    const activeCharId = turnOrder[turnIndex];

    const getChar = (id: string): Character | undefined => {
      if (id === player.id) return nextPlayer;
      if (id === 'turret_hacked') return { id: 'turret_hacked', name: 'Hacked Autoturet', initiative: 12 } as any;
      return nextEnemies.find(e => e.id === id);
    };

    // Recalculate descending order sort
    const sortedTurnOrder = [...turnOrder].sort((a, b) => {
      const charA = getChar(a);
      const charB = getChar(b);
      const initA = charA?.initiative || 0;
      const initB = charB?.initiative || 0;
      return initB - initA;
    });

    const newTurnIndex = Math.max(0, sortedTurnOrder.indexOf(activeCharId));

    onUpdateFullState({
      player: nextPlayer,
      enemies: nextEnemies,
      turnOrder: sortedTurnOrder,
      turnIndex: newTurnIndex,
      logs: [{
        id: `gm_init_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'system',
        message: `🛠️ GM INITIATIVE REGISTER: Modified initiative for ${getChar(charId)?.name} to [${value}]. Resycned queue.`
      }, ...logs]
    });
  };

  const handleShiftTurnOrder = (index: number, direction: 'up' | 'down') => {
    audio.playUIBeep();
    const newOrder = [...turnOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    // Swap elements
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    let newTurnIndex = turnIndex;
    if (turnIndex === index) {
      newTurnIndex = targetIndex;
    } else if (turnIndex === targetIndex) {
      newTurnIndex = index;
    }

    onUpdateFullState({
      turnOrder: newOrder,
      turnIndex: newTurnIndex,
      logs: [{
        id: `gm_shift_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'system',
        message: `🛠️ GM QUEUE MANIPULATION: Manually swapped index #${index + 1} and #${targetIndex + 1} positions in state grid.`
      }, ...logs]
    });
  };

  const handleForceActiveTurn = (index: number) => {
    audio.playAlert();
    const targetId = turnOrder[index];
    
    let targetName = 'Hacked Autoturret';
    if (targetId === player.id) targetName = player.name;
    else {
      const en = enemies.find(e => e.id === targetId);
      if (en) targetName = en.name;
    }

    onUpdateFullState({
      turnIndex: index,
      logs: [{
        id: `gm_force_turn_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'system',
        message: `⚡ GM SEQUENCE INTERRUPT: Forcibly shifted active action spotlight focus manually to ${targetName}!`
      }, ...logs]
    });
  };

  return (
    <div className="bg-[#0b0b14]/95 border-2 border-dashed border-red-600/40 p-5 rounded-lg space-y-4 shadow-[0_0_20px_rgba(220,38,38,0.05)] relative overflow-hidden">
      
      {/* visual caution strip decoration */}
      <div className="absolute top-0 right-0 w-24 h-2 bg-gradient-to-l from-yellow-500 via-red-500 to-transparent"></div>

      <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
        <span className="text-xs font-mono font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
          <Shield className="text-rose-500 w-4 h-4" /> MASTER OVERRIDE MATRIX (GM HUD)
        </span>
        {overrideUnlocked && (
          <button
            onClick={handleLockAdmin}
            className="text-[9px] bg-red-650 hover:bg-red-700 text-white font-mono px-2 py-1 rounded border border-red-600 cursor-pointer uppercase flex items-center gap-1"
          >
            Lock Admin
          </button>
        )}
      </div>

      {!overrideUnlocked ? (
        <form onSubmit={handleUnlock} className="space-y-3 font-mono text-xs font-bold">
          <div className="bg-[#ff003c]/5 border border-[#ff003c]/20 p-3 rounded text-glow-magenta leading-relaxed text-pink-400">
            🔒 Level 5 administrative bypass required to hot-key player logs. Please enter the core 4-digit system access override key.
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ENTER 4-DIGIT PIN (2077)"
              className="flex-1 bg-black border border-gray-800 rounded p-2.5 outline-none focus:border-red-500 text-[#ff0055] text-glow-magenta text-center font-black tracking-widest"
            />
            <button
              type="submit"
              className="px-5 bg-red-600 hover:bg-red-700 text-white font-black rounded uppercase text-[10px] tracking-wider border border-red-500 cursor-pointer"
            >
              Decrypt
            </button>
          </div>
          {errorMessage && (
            <p className="text-[#ff003c] text-glow-magenta font-extrabold text-[10px] text-center animate-bounce">{errorMessage}</p>
          )}
        </form>
      ) : (
        <div className="space-y-4 font-mono text-xs text-gray-300">
          
          <div className="bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin-slow text-emerald-400" /> SYSTEM OVERRIDE ACTIVE: MULTI-QUEUE ACCESS RE-ROUTE GRANTED
          </div>

          {/* Direct Actions Override Toggle */}
          <div className="bg-gradient-to-r from-red-950/30 to-black border border-red-500/20 p-3 rounded-lg flex items-center justify-between gap-4">
            <div>
              <span className="text-red-500 font-black uppercase text-[10px] block tracking-wide">
                ⚙️ Direct Hostile Action Control Override
              </span>
              <p className="text-[9px] text-gray-405 leading-normal mt-0.5">
                Toggle option to manually drive NPC AI actions, target selection, and coordinate shooting.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={manualNpcControl}
                onChange={() => {
                  audio.playUIBeep();
                  onUpdateFullState({ manualNpcControl: !manualNpcControl });
                }}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-black rounded-full border border-gray-805 transition-all peer-checked:bg-red-655 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-white"></div>
            </label>
          </div>

          {/* 📋 MASTER COMBAT DEPLOYMENT ROSTER (REAL-TIME SELECTION) */}
          <div className="bg-black/50 border border-cyan-500/20 p-3.5 rounded-lg space-y-3">
            <span className="text-cyan-400 font-black uppercase text-[9px] block tracking-wide border-b border-gray-800 pb-1 flex items-center gap-1">
              📋 MASTER COMBAT DEPLOYMENT ROSTER
            </span>
            <p className="text-[9px] text-gray-400 leading-normal">
              Toggle participant checkboxes to immediately mount them on the 2.5D Isometric Map or cache them in background registers. Only checked assets enter initiative computations.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
              {/* Player Characters list */}
              <div className="flex items-center justify-between p-2 bg-[#0c0f1d] border border-cyan-500/20 rounded hover:border-cyan-500/40 transition">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="deploy-player"
                    checked={player.deployed !== false}
                    onChange={(e) => {
                      audio.playUIBeep();
                      onUpdateFullState({
                        player: { ...player, deployed: e.target.checked }
                      });
                    }}
                    className="w-3.5 h-3.5 accent-cyan-400 cursor-pointer"
                  />
                  <label htmlFor="deploy-player" className="text-cyan-400 font-bold text-[10px] cursor-pointer selection:bg-transparent">
                    👤 {player.name} <span className="text-glow-green text-[7px] text-[#39ff14] bg-[#39ff14]/10 px-1 rounded-full ml-1 font-bold">SOLO</span>
                  </label>
                </div>
                <span className="text-[8px] font-mono text-gray-500">MOVE: {player.move || 6}</span>
              </div>

              {/* Configure Hostiles list */}
              {enemies.map((enemy) => (
                <div 
                  key={enemy.id} 
                  className={`flex items-center justify-between p-2 rounded transition border hover:bg-white/5 ${
                    enemy.isDead ? 'bg-red-950/10 border-red-950/30 opacity-50' : 'bg-[#15060b] border-rose-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`deploy-${enemy.id}`}
                      checked={enemy.deployed !== false}
                      onChange={(e) => {
                        audio.playUIBeep();
                        const updatedEnemies = enemies.map(en => 
                          en.id === enemy.id ? { ...en, deployed: e.target.checked } : en
                        );
                        onUpdateFullState({ enemies: updatedEnemies });
                      }}
                      className="w-3.5 h-3.5 accent-rose-500 cursor-pointer"
                    />
                    <label htmlFor={`deploy-${enemy.id}`} className="text-rose-400 text-[10px] cursor-pointer truncate max-w-[120px]">
                      💀 {enemy.name} {enemy.isDead && <span className="text-[7.5px] uppercase font-bold text-red-500">[Dead]</span>}
                    </label>
                  </div>
                  <span className="text-[8px] font-mono text-gray-500">HP: {enemy.hp}/{enemy.maxHp}</span>
                </div>
              ))}

              {enemies.length === 0 && (
                <div className="text-gray-500 italic text-[9px] p-2 text-center col-span-2">
                  [ No hostile agents registered. Spawn archetypes below! ]
                </div>
              )}
            </div>
          </div>

          {/* INITIATIVE COMMAND MATRIX ROW (Added Requirement) */}
          <div className="bg-black/50 border border-red-600/20 p-3.5 rounded-lg space-y-3">
            <span className="text-red-500 font-black uppercase text-[9px] block tracking-wide border-b border-gray-800 pb-1">
              📋 INITIATIVE DIRECT COMMAND CENTER (Real-time Queue)
            </span>

            {combatActive && turnOrder.length > 0 ? (
              <div className="space-y-1.5 divide-y divide-gray-850 max-h-[220px] overflow-y-auto pr-1">
                {turnOrder.map((charId, idx) => {
                  const isActive = idx === turnIndex;
                  
                  let charObj: Character | undefined;
                  if (charId === player.id) charObj = player;
                  else if (charId === 'turret_hacked') charObj = { id: 'turret_hacked', name: 'Hacked Autoturret', initiative: 12, isDead: false } as any;
                  else charObj = enemies.find(e => e.id === charId);

                  if (!charObj) return null;

                  return (
                    <div
                      key={charId}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between py-2 px-1.5 rounded transition ${
                        isActive ? 'bg-[#ff00ff]/10 border border-[#ff00ff]/30 text-white font-bold' : 'hover:bg-white/5 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono px-1 rounded ${isActive ? 'bg-[#ff00ff] text-black' : 'bg-gray-800 text-gray-400'}`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <span className={`${charObj.isPlayer ? 'text-cyan-400 font-bold' : 'text-rose-400'} text-xs`}>
                            {charObj.name}
                          </span>
                          {charObj.isDead && <span className="text-[8px] text-red-500 ml-1 uppercase">[Dead]</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 mt-1.5 sm:mt-0">
                        {/* Shifter controllers */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleShiftTurnOrder(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 bg-black border border-gray-800 hover:border-gray-500 rounded disabled:opacity-30 cursor-pointer"
                            title="Shift order position Up"
                          >
                            <ArrowUp className="w-3 h-3 text-cyan-400" />
                          </button>
                          <button
                            onClick={() => handleShiftTurnOrder(idx, 'down')}
                            disabled={idx === turnOrder.length - 1}
                            className="p-1 bg-black border border-gray-800 hover:border-gray-500 rounded disabled:opacity-30 cursor-pointer"
                            title="Shift order position Down"
                          >
                            <ArrowDown className="w-3 h-3 text-cyan-400" />
                          </button>
                        </div>

                        {/* Initiative score modify */}
                        <label className="flex items-center gap-1.5 text-[10px]">
                          <span className="text-gray-500">InitVal:</span>
                          <input
                            type="number"
                            value={charObj.initiative}
                            onChange={(e) => handleUpdateInitiativeValue(charId, parseInt(e.target.value) || 0)}
                            className="w-11 bg-black border border-gray-750 p-1 text-center font-black text-rose-500 focus:border-cyan-400 outline-none rounded"
                          />
                        </label>

                        {/* Force Active buttons */}
                        <button
                          onClick={() => handleForceActiveTurn(idx)}
                          disabled={isActive}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[8px] uppercase tracking-wide rounded border border-emerald-500 flex items-center gap-0.5 disabled:opacity-30 cursor-pointer transition"
                        >
                          <Play className="w-2.5 h-2.5" /> Force Active
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 italic text-center py-2">No active combat system registration found in the queue.</p>
            )}
          </div>

          {/* Core controls grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left selector and hp sliders */}
            <div className="bg-black/40 border border-gray-800 p-3.5 rounded space-y-3.5">
              <span className="text-gray-500 font-bold uppercase text-[9px] block tracking-wide">1. Character Bio-Modifier Tools</span>
              
              <label className="block space-y-1.5">
                <span className="text-[10px] text-gray-400">Focus Target:</span>
                <select
                  value={selectedCharId}
                  onChange={(e) => setSelectedCharId(e.target.value)}
                  className="w-full bg-[#121222] border border-gray-750 p-2 rounded text-xs text-cyan-400 font-bold outline-none"
                >
                  <option value={player.id}>🦾 Players Suite: {player.name} (YOU)</option>
                  {enemies.map(en => (
                    <option key={en.id} value={en.id}>⚡ Booster Npc: {en.name} {en.isDead ? '[FLATLINED]' : `(HP: ${en.hp}/${en.maxHp})`}</option>
                  ))}
                </select>
              </label>

              {activeTargetChar && (
                <div className="space-y-3">
                  {/* Slider Hp */}
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400">Manual Neural HP Register</span>
                      <span className="text-yellow-400 font-black">{activeTargetChar.hp} / {activeTargetChar.maxHp} HP</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={activeTargetChar.maxHp}
                      value={activeTargetChar.hp}
                      onChange={(e) => handleAdjustHp(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-red-600"
                    />
                  </label>

                  {/* Status Injury checkers */}
                  <div className="space-y-2">
                    <span className="text-gray-400 text-[10px] block">Trigger Critical Injuries:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESETS_CRITICAL_INJURIES.map(inj => {
                        const hasInj = activeTargetChar.criticalInjuries.includes(inj);
                        return (
                          <button
                            key={inj}
                            onClick={() => handleToggleInjury(inj)}
                            className={`px-2 py-1 rounded text-[8px] font-black uppercase border transition ${
                              hasInj
                                        ? 'bg-red-500/25 border-red-500 text-red-500'
                                        : 'bg-black/80 border-gray-800 text-gray-500 hover:border-gray-600'
                            }`}
                          >
                            {inj}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delete button for npcs */}
                  {selectedCharId !== player.id && (
                    <button
                      onClick={handleRemoveHostile}
                      className="w-full py-1.5 bg-red-650 hover:bg-red-700 text-white font-extrabold uppercase rounded border border-red-600 text-[10px] flex items-center justify-center gap-1 cursor-pointer transition"
                    >
                      <Trash className="w-3.5 h-3.5" /> Wipe Hostile Register
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Spawn list catalog */}
            <div className="bg-black/40 border border-gray-800 p-3.5 rounded space-y-3.5">
              <span className="text-gray-500 font-bold uppercase text-[9px] block tracking-wide">2. Spawn Enemy Archetype</span>

              <label className="block space-y-1.5">
                <span className="text-[10px] text-gray-400 font-mono">Catalog Archetypes:</span>
                <select
                  value={selectedArchetypeIndex}
                  onChange={(e) => setSelectedArchetypeIndex(parseInt(e.target.value))}
                  className="w-full bg-[#121222] border border-gray-750 p-2 rounded text-xs text-yellow-400 font-bold outline-none"
                >
                  {ENEMY_ARCHETYPES.map((preset, idx) => (
                    <option key={idx} value={idx}>{preset.name} (HP: {preset.hp})</option>
                  ))}
                </select>
              </label>

              <div className="bg-black/30 p-2.5 border border-white/5 rounded text-[10px] text-gray-400 leading-relaxed min-h-[50px]">
                <p className="font-bold text-white mb-0.5">{ENEMY_ARCHETYPES[selectedArchetypeIndex].name}</p>
                <p className="italic">"{ENEMY_ARCHETYPES[selectedArchetypeIndex].desc}"</p>
              </div>

              <button
                onClick={handleSpawnArchetype}
                className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-black uppercase rounded text-[10px] tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-transform hover:scale-103"
              >
                <Plus className="w-3.5 h-3.5" /> SPAWN SELECTED ARCHETYPE
              </button>
            </div>

          </div>

          {/* Quick Turn economy overrides */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={handleActionBypassOverride}
              className="py-2.5 bg-cyan-600/90 hover:bg-cyan-700 text-white font-mono font-black uppercase text-[10px] tracking-wider rounded border border-cyan-500 cursor-pointer flex items-center justify-center gap-1.5 transition"
              title="Restores actions economy limit"
            >
              🔑 BYPASS ACTION SPENT
            </button>

            <button
              onClick={handleRestartEncounter}
              className="py-2.5 bg-yellow-600 hover:bg-yellow-700 text-black font-mono font-black uppercase text-[10px] tracking-wider rounded border border-yellow-500 cursor-pointer flex items-center justify-center gap-1.5 transition"
              title="Fully resets stats and restarts current combat scene"
            >
              🔄 RESTART ENCOUNTER CORE
            </button>

            <button
              onClick={handleForceEndCombat}
              className="py-2.5 bg-red-650 hover:bg-red-700 text-white font-mono font-black uppercase text-[10px] tracking-wider rounded border border-red-500 cursor-pointer flex items-center justify-center gap-1.5 transition"
              title="Deactivates active sequence"
            >
              ⚔️ FORCE END COMBAT
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
