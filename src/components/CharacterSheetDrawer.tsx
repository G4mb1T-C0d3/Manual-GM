import React, { useState } from 'react';
import { Character, Weapon } from '../types';
import { audio } from '../audio';
import { rollD10, rollDamage, getWeaponDV, getGameTime } from '../utils';
import { Shield, Crosshair, Heart, Zap, RefreshCw, X, ChevronRight, Award } from 'lucide-react';

interface CharacterSheetDrawerProps {
  player: Character;
  enemies: Character[];
  combatActive: boolean;
  onUpdateFullState: (newState: any) => void;
  logs: any[];
  onClose: () => void;
}

export default function CharacterSheetDrawer({
  player,
  enemies,
  combatActive,
  onUpdateFullState,
  logs,
  onClose,
}: CharacterSheetDrawerProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    enemies.filter(e => !e.isDead)[0]?.id || ''
  );
  
  // Local states for rolling feedback
  const [rollFeedback, setRollFeedback] = useState<string | null>(null);

  // Default Stats Fallback if not fully populated
  const INT = player.int || 6;
  const REF = player.ref;
  const DEX = player.dex;
  const TECH = player.tech;
  const COOL = player.cool;
  const WILL = player.will || 6;
  const LUCK = player.luck || 5;
  const MOVE = player.move || 6;
  const BODY = player.body || 6;
  const EMP = player.emp || 6;

  const humanityMax = player.humanity?.max || (EMP * 10);
  const humanityCurrent = player.humanity?.current || humanityMax;

  // Skill definitions categorized
  const skillCategories = [
    {
      name: "Awareness Skills",
      skills: [
        { name: "Perception", stat: "INT", statVal: INT, key: "perception" },
        { name: "Concentration", stat: "WILL", statVal: WILL, key: "concentration" },
        { name: "Lip Reading", stat: "INT", statVal: INT, key: "lipReading" },
        { name: "Library Search", stat: "INT", statVal: INT, key: "librarySearch" },
      ]
    },
    {
      name: "Combat Skills",
      skills: [
        { name: "Handgun", stat: "REF", statVal: REF, key: "handgun" },
        { name: "Shoulder Arms", stat: "REF", statVal: REF, key: "shoulderArms" },
        { name: "Brawling", stat: "DEX", statVal: DEX, key: "brawling" },
        { name: "Melee Weapon", stat: "DEX", statVal: DEX, key: "melee" },
        { name: "Autofire (×2)", stat: "REF", statVal: REF, key: "autofire" },
        { name: "Heavy Weapons (×2)", stat: "REF", statVal: REF, key: "heavyWeapons" },
      ]
    },
    {
      name: "Body Skills",
      skills: [
        { name: "Athletics", stat: "DEX", statVal: DEX, key: "athletics" },
        { name: "Resist Torture/Drugs", stat: "WILL", statVal: WILL, key: "resistTorture" },
        { name: "Stealth", stat: "DEX", statVal: DEX, key: "stealth" },
        { name: "Endurance", stat: "WILL", statVal: WILL, key: "endurance" },
      ]
    },
    {
      name: "Performance & Social Skills",
      skills: [
        { name: "Persuasion", stat: "COOL", statVal: COOL, key: "persuasion" },
        { name: "Human Perception", stat: "EMP", statVal: EMP, key: "humanPerception" },
        { name: "Conversation", stat: "EMP", statVal: EMP, key: "conversation" },
        { name: "Streetwise", stat: "COOL", statVal: COOL, key: "streetwise" },
        { name: "Trading", stat: "COOL", statVal: COOL, key: "trading" },
      ]
    }
  ];

  // Helper to fetch skill level from saved skills or default template levels
  const getSkillLevel = (skillKey: string): number => {
    if (player.skills && skillKey in player.skills) {
      return player.skills[skillKey];
    }
    // Fallback starting ranks template
    const defaults: Record<string, number> = {
      perception: 4,
      concentration: 3,
      handgun: 5,
      shoulderArms: 4,
      brawling: 4,
      melee: 4,
      athletics: 4,
      stealth: 4,
      persuasion: 3,
      humanPerception: 3,
      streetwise: 3,
    };
    return defaults[skillKey] || 2;
  };

  // Roll general checks
  const handleRollSkill = (skillName: string, statVal: number, level: number) => {
    audio.playUIBeep();
    const resultObj = rollD10();
    const total = statVal + level + resultObj.total;
    const desc = resultObj.rollString;

    let critMsg = '';
    if (resultObj.isCriticalSuccess) critMsg = ' 💥 EXPLODING CRITICAL!';
    if (resultObj.isFumble) critMsg = ' ⚠️ FUMBLE PENALTY APPLY!';

    const logText = `🎲 SKILL ROLL CHECK: Apex rolls ${skillName} (${statVal} Stat + ${level} Rank) + [1d10: ${desc}] = total [${total}]${critMsg}`;
    
    setRollFeedback(`${skillName} Check: 1d10 + ${statVal + level} = [${total}]`);
    setTimeout(() => setRollFeedback(null), 3000);

    onUpdateFullState({
      logs: [{
        id: `skill_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'combat',
        message: logText
      }, ...logs]
    });
  };

  // Adjust Armor on Head / Torso SP Slots
  const handleAblateArmor = (slot: 'head' | 'torso', change: number) => {
    audio.playUIBeep();
    const nextPlayer = { ...player };
    if (slot === 'head') {
      nextPlayer.spHead = Math.max(0, player.spHead + change);
    } else {
      nextPlayer.spTorso = Math.max(0, player.spTorso + change);
    }

    onUpdateFullState({
      player: nextPlayer,
      logs: [{
        id: `armor_ablate_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'system',
        message: `🛡️ CHROME ABLATION REGISTER: Manually modified ${slot.toUpperCase()} SP armor value to [${slot === 'head' ? nextPlayer.spHead : nextPlayer.spTorso} SP].`
      }, ...logs]
    });
  };

  // Roll Death Save
  const handleRollDeathSave = () => {
    audio.playAlert();
    const penaltyCount = player.initiative || 0; // standard slot hijacking
    const roll = Math.floor(Math.random() * 10) + 1;
    const threshold = BODY - penaltyCount;

    let fatal = false;
    let text = '';

    if (roll >= threshold) {
      fatal = true;
      text = `☠️ DEATH DECK FAILURE! Rolled d10: [${roll}] >= Threshold [${threshold}] (Body ${BODY} - Penalty ${penaltyCount}). APEX FLATLINED!`;
    } else {
      text = `💖 DEATH STATE HOLD! Rolled d10: [${roll}] < Threshold [${threshold}] (Body ${BODY} - Penalty ${penaltyCount}). Biological system still clings, increase death save penalty for next turn!`;
    }

    const nextPlayer = { ...player, isDead: fatal };

    onUpdateFullState({
      player: nextPlayer,
      logs: [{
        id: `death_save_${Date.now()}`,
        timestamp: getGameTime(),
        type: fatal ? 'damage' : 'system',
        message: text
      }, ...logs]
    });
  };

  // Interactive weapon fire
  const handleFireWeaponFromSheet = (wpn: Weapon) => {
    const targetEnemy = enemies.find(e => e.id === selectedTargetId);
    if (!targetEnemy || targetEnemy.isDead) {
      alert("Please select a live target enemy to establish line-of-sight on the grid!");
      return;
    }

    audio.playUIBeep();
    
    // Check ammunition
    if (wpn.ammo <= 0) {
      audio.playAlert();
      onUpdateFullState({
        logs: [{
          id: `no_ammo_${Date.now()}`,
          timestamp: getGameTime(),
          type: 'system',
          message: `⚠️ AMMUNITION DEPLETED: ${wpn.name} click-dry. Reload current cell matrix.`
        }, ...logs]
      });
      return;
    }

    // Determine target coordinate distance calculations
    const px = player.x || 1;
    const py = player.y || 1;
    const ex = targetEnemy.x || 5;
    const ey = targetEnemy.y || 5;
    const distanceMeters = Math.max(Math.abs(ex - px), Math.abs(ey - py)) * 2;

    // Call roll hit
    const d10Result = rollD10();
    const wpnSkill = wpn.type === 'pistol' ? getSkillLevel('handgun') : getSkillLevel('shoulderArms');
    const totalAttackRoll = REF + wpnSkill + d10Result.total;

    // Standard cover and DV requirements
    let targetDV = 0;
    if (wpn.type === 'melee') {
      targetDV = (targetEnemy.dex || 5) + 5; // brawl clash
    } else {
      targetDV = getWeaponDV(wpn.type as any, distanceMeters);
    }

    const coverDvVal = targetEnemy.isCovered ? 4 : 0;
    const finalDV = targetDV + coverDvVal;
    const isHit = totalAttackRoll >= finalDV;

    let battleText = '';
    let updatedEnemies = [...enemies];
    let updatedPlayer = { ...player };

    // Deduct ammo
    updatedPlayer.weapons = player.weapons.map(w => w.id === wpn.id ? { ...w, ammo: w.ammo - 1 } : w);

    if (isHit) {
      if (wpn.type === 'pistol') audio.playPistol();
      else if (wpn.type === 'shotgun') audio.playShotgun();
      else if (wpn.type === 'rifle') audio.playShotgun();
      else audio.playMelee();

      const dmgVal = rollDamage(wpn.damage);
      const hitTorso = Math.random() > 0.15; // standard body vs head ablation random
      const locStr = hitTorso ? 'Torso' : 'Head';
      const actualSp = hitTorso ? targetEnemy.spTorso : targetEnemy.spHead;
      
      let passDamage = dmgVal.total - actualSp;
      if (passDamage < 0) passDamage = 0;

      let critAdded = false;
      if (dmgVal.isCriticalInjury) {
        critAdded = true;
        passDamage += 5; // critical injury rule +5 bleeding direct damage
      }

      const nextEnemyHp = Math.max(0, targetEnemy.hp - passDamage);
      const ablatedHeadSp = !hitTorso && passDamage > 0 ? Math.max(0, targetEnemy.spHead - 1) : targetEnemy.spHead;
      const ablatedTorsoSp = hitTorso && passDamage > 0 ? Math.max(0, targetEnemy.spTorso - 1) : targetEnemy.spTorso;

      updatedEnemies = enemies.map(e => {
        if (e.id === targetEnemy.id) {
          const injuries = [...e.criticalInjuries];
          if (critAdded && !injuries.includes("Broken Leg")) {
            injuries.push("Broken Leg"); // default leg bone damage
          }
          return {
            ...e,
            hp: nextEnemyHp,
            spHead: ablatedHeadSp,
            spTorso: ablatedTorsoSp,
            criticalInjuries: injuries,
            isDead: nextEnemyHp <= 0,
            tauntText: nextEnemyHp <= 0 ? "Chamber empty... systems offline..." : e.tauntText
          };
        }
        return e;
      });

      battleText = `🎯 CHROME DECK FIRE: Apex triggers ${wpn.name} at ${targetEnemy.name}! Spanned distance [${distanceMeters}m]. Attack Roll ${totalAttackRoll} vs DV ${finalDV} (HIT!). Deals ${dmgVal.total} damage to ${locStr}. (${passDamage} passed SP armor). SP degraded!`;
      if (critAdded) battleText += ` ⚠️ CRITICAL INJURY INDUCTION: Broken Leg inflicted!`;
    } else {
      battleText = `💨 CHROME DECK FIRE: Apex triggers ${wpn.name} at ${targetEnemy.name}! Spanned distance [${distanceMeters}m]. Attack Roll ${totalAttackRoll} vs DV ${finalDV} (MISS).`;
    }

    onUpdateFullState({
      player: updatedPlayer,
      enemies: updatedEnemies,
      logs: [{
        id: `fire_sheet_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'combat',
        message: battleText
      }, ...logs]
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#0b0b14]/98 border-l border-[#ff00ff]/40 shadow-[0_0_30px_rgba(255,0,255,0.15)] z-50 flex flex-col font-mono text-xs">
      
      {/* Header Panel */}
      <div className="p-4 border-b border-gray-800 bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="text-[#ff00ff] w-4 h-4" />
          <span className="font-black text-white uppercase text-[10px] tracking-widest text-glow-magenta">
            DECK CHROME // SECURED CYBERPLATE SHEET
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-gray-500 hover:text-white border border-gray-800 hover:border-gray-600 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Rolls status bubble overlay */}
      {rollFeedback && (
        <div className="bg-cyan-500 text-black px-4 py-2 font-black text-center text-xs animate-bounce uppercase">
          {rollFeedback}
        </div>
      )}

      {/* Main Container Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        
        {/* Core Vitals Widget */}
        <div className="bg-black/40 border border-gray-800 rounded p-3.5 space-y-3.5">
          <span className="text-gray-500 font-extrabold text-[9px] block uppercase tracking-wider">1. Core Vital Biometric Status</span>
          
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-red-500/5 border border-red-500/20 p-2 rounded">
              <span className="text-gray-400 text-[10px] block">Neural HP Integrity:</span>
              <span className="text-white text-base font-black flex items-center gap-1">
                <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" /> {player.hp} / {player.maxHp} HP
              </span>
              <span className="text-[9px] text-gray-500 block mt-1">
                Serious Injury starts at ≤ {Math.ceil(player.maxHp / 2)} HP
                {player.hp <= (player.maxHp / 2) && (
                  <span className="text-[#ff003c] font-bold block animate-pulse">⚠️ SERIOUSLY INJURED! (-2 to actions if debuff is set)</span>
                )}
              </span>
            </div>

            <div className="bg-[#ff00ff]/5 border border-[#ff00ff]/20 p-2 rounded">
              <span className="text-gray-400 text-[10px] block">Humanity / Empathy:</span>
              <span className="text-white text-base font-black flex items-center gap-1">
                <Zap className="w-4 h-4 text-pink-400 fill-pink-400" /> {humanityCurrent} / {humanityMax} HL
              </span>
              <span className="text-[9px] text-gray-500 block mt-1">Current Empathy index: {Math.max(1, Math.floor(humanityCurrent / 10))} EMP</span>
            </div>
          </div>

          {/* Death Save Penalty row */}
          {player.hp <= 0 ? (
            <div className="bg-red-950/40 border border-red-500 p-2.5 rounded flex items-center justify-between text-[11px] font-black text-red-400 animate-pulse">
              <span>⚠️ CRITICAL ZERO: Dying State Active!</span>
              <button
                onClick={handleRollDeathSave}
                className="bg-red-600 hover:bg-red-700 text-white font-mono px-3 py-1 text-[10px] uppercase rounded border border-red-500 cursor-pointer"
              >
                Roll Death Save
              </button>
            </div>
          ) : (
            <div className="bg-black/30 p-2 rounded text-[9px] text-gray-500">
              ⚡ Biological threat levels stable. Emulated system loops online.
            </div>
          )}
        </div>

        {/* Armor Ablation Slots */}
        <div className="bg-black/40 border border-gray-800 rounded p-3.5 space-y-3">
          <span className="text-gray-500 font-extrabold text-[9px] block uppercase tracking-wider">2. Defenses & Armor SP (Manually triggering Ablation)</span>
          <div className="grid grid-cols-2 gap-3">
            {/* SP Head */}
            <div className="border border-cyan-500/20 bg-cyan-950/10 p-2 rounded flex items-center justify-between">
              <div>
                <span className="text-gray-400 text-[10px] block font-mono">Head Armorjack:</span>
                <span className="text-cyan-400 text-sm font-black tracking-widest">{player.spHead} SP</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleAblateArmor('head', -1)}
                  className="w-5 h-5 bg-black hover:border-cyan-400 border border-gray-700 text-center font-black cursor-pointer text-[10px] rounded"
                  title="Ablate Armor (Degrade SP by 1)"
                >
                  -
                </button>
                <button
                  onClick={() => handleAblateArmor('head', 1)}
                  className="w-5 h-5 bg-black hover:border-cyan-400 border border-gray-700 text-center font-black cursor-pointer text-[10px] rounded"
                  title="Repair SP by 1"
                >
                  +
                </button>
              </div>
            </div>

            {/* SP Torso */}
            <div className="border border-cyan-500/20 bg-cyan-950/10 p-2 rounded flex items-center justify-between">
              <div>
                <span className="text-gray-400 text-[10px] block font-mono">Torso Armorjack:</span>
                <span className="text-cyan-400 text-sm font-black tracking-widest">{player.spTorso} SP</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleAblateArmor('torso', -1)}
                  className="w-5 h-5 bg-black hover:border-cyan-400 border border-gray-700 text-center font-black cursor-pointer text-[10px] rounded"
                  title="Ablate Armor (Degrade SP by 1)"
                >
                  -
                </button>
                <button
                  onClick={() => handleAblateArmor('torso', 1)}
                  className="w-5 h-5 bg-black hover:border-cyan-400 border border-gray-700 text-center font-black cursor-pointer text-[10px] rounded"
                  title="Repair SP by 1"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Weapons Fire Board */}
        <div className="bg-black/40 border border-gray-800 rounded p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-extrabold text-[9px] uppercase tracking-wider">3. Interactive Weapon Profiles</span>
            {enemies.filter(e => !e.isDead).length > 0 && (
              <label className="flex items-center gap-1.5 text-[9px]">
                <span className="text-gray-400">Aim target:</span>
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="bg-[#121222] border border-gray-750 text-cyan-400 font-bold p-1 rounded font-mono outline-none"
                >
                  {enemies.filter(e => !e.isDead).map(en => (
                    <option key={en.id} value={en.id}>{en.name.split(' ')[0]} ({Math.max(Math.abs((en.x || 5) - (player.x || 2)), Math.abs((en.y || 5) - (player.y || 2))) * 2}m)</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="space-y-2">
            {player.weapons.map((wpn, idx) => (
              <div
                key={wpn.id || idx}
                className="bg-black/60 border border-gray-800 p-2 rounded flex flex-col gap-2 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-white text-xs block">{wpn.name}</span>
                    <span className="text-[10px] text-gray-400 capitalize">{wpn.type} • Damage: <span className="text-pink-400 font-black">{wpn.damage}</span></span>
                  </div>
                  <div className="text-[10px] text-gray-300 font-bold bg-gray-900 border border-gray-800 rounded px-2 py-0.5">
                    Ammo: {wpn.ammo} / {wpn.maxAmmo}
                  </div>
                </div>

                <div className="flex justify-between items-center bg-black/40 p-1.5 border border-white/5 rounded">
                  <span className="text-[9px] text-gray-500">
                    Expected Hit skill base: +{REF + (wpn.type === 'pistol' ? getSkillLevel('handgun') : getSkillLevel('shoulderArms'))}
                  </span>
                  
                  <button
                    onClick={() => handleFireWeaponFromSheet(wpn)}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] rounded flex items-center gap-1 border border-rose-500 cursor-pointer shadow-[0_0_6px_rgba(239,68,68,0.2)]"
                  >
                    <Crosshair className="w-3.5 h-3.5" /> Fire Weapon
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categorized Detailed Skill Matrix */}
        <div className="bg-black/40 border border-gray-800 rounded p-3.5 space-y-4">
          <span className="text-gray-500 font-extrabold text-[9px] block uppercase tracking-wider">4. High-Fidelity Skill Matrix (Dice rolling)</span>

          <div className="space-y-4">
            {skillCategories.map(cat => (
              <div key={cat.name} className="space-y-1.5">
                <span className="text-cyan-400 font-black text-[10px] uppercase tracking-widest border-b border-cyan-950 block pb-0.5">{cat.name}</span>
                <div className="grid grid-cols-1 divide-y divide-gray-850">
                  {cat.skills.map(sk => {
                    const level = getSkillLevel(sk.key);
                    const baseTotal = sk.statVal + level;
                    return (
                      <div key={sk.key} className="flex justify-between items-center py-2 text-gray-300 hover:bg-white/5 px-1.5 rounded transition">
                        <div>
                          <span className="font-bold text-white text-xs block">{sk.name}</span>
                          <span className="text-[9px] text-gray-500 uppercase">{sk.stat} modifier: +{sk.statVal} | Rank: {level}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-cyan-400 text-xs text-glow-cyan">BASE +{baseTotal}</span>
                          <button
                            onClick={() => handleRollSkill(sk.name, sk.statVal, level)}
                            className="bg-black hover:bg-cyan-500 hover:text-black border border-cyan-500/30 font-black text-[9px] font-mono px-2 py-1 rounded uppercase transition cursor-pointer"
                          >
                            Roll
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
