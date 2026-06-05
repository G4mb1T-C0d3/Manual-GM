import React, { useState, useEffect, useRef } from 'react';
import { Character, Weapon } from '../types';
import { audio } from '../audio';
import { rollD10, rollDamage, getWeaponDV, getGameTime } from '../utils';
import { 
  Shield, Crosshair, Heart, Zap, RefreshCw, X, ChevronRight, Award, 
  ExternalLink, Terminal, Cpu, Plus, Minus, Cpu as CpuIcon, Sparkles, AlertTriangle, Eye, User, ShoppingBag
} from 'lucide-react';

interface CharacterSheetDrawerProps {
  player: Character;
  enemies: Character[];
  combatActive: boolean;
  onUpdateFullState: (newState: any) => void;
  logs: any[];
  onClose: () => void;
  isDecoupled?: boolean;
}

interface CyberwareItem {
  id: string;
  name: string;
  cost: number;
  hlRoll: string;
  effect: string;
}

// Global cyberware catalog sorted by slot
const CYBERWARE_CATALOG: Record<string, CyberwareItem[]> = {
  brain: [
    { id: 'brain_link', name: 'Neural Link Cores', cost: 500, hlRoll: '1d6', effect: 'Pre-requisite for all neural slot expansion modules.' },
    { id: 'brain_coprocessor', name: 'Tactical Coprocessor', cost: 1000, hlRoll: '2d6', effect: 'Neural initiative boosting core: permanent +1 headshot check.' },
    { id: 'brain_socket', name: 'Chipware Socket Matrix', cost: 300, hlRoll: '1d6', effect: 'Socket system for custom combat chips.' }
  ],
  eyes: [
    { id: 'eye_teleoptics', name: 'Mantis Teleoptics', cost: 500, hlRoll: '1d6', effect: 'Micro-lens magnification framework: +1 to Shoulder Arms attack rolls.' },
    { id: 'eye_targeting', name: 'Targeting Scope HUD', cost: 1000, hlRoll: '2d6', effect: 'Displays precise trajectory vectors: +1 attack roll precision.' },
    { id: 'eye_antiglare', name: 'Anti-Glare Shutter', cost: 150, hlRoll: '1', effect: 'Dampens high-density flash triggers. Immunity to blindness.' }
  ],
  ears: [
    { id: 'ear_analyzer', name: 'Audio Stress Analyzer', cost: 500, hlRoll: '1d6', effect: 'Vocal pitch scanners: +2 to Human Perception and Conversation checks.' },
    { id: 'ear_damper', name: 'Level Damper Filter', cost: 200, hlRoll: '1', effect: 'Dampens hyper-acoustic triggers. Immunity to deafening spikes.' }
  ],
  right_arm: [
    { id: 'r_arm_cyberarm', name: 'Arasaka Standard Cyberarm', cost: 500, hlRoll: '2d6', effect: 'Replaces organic arm with steel jackings. Hard punch.' },
    { id: 'r_arm_pistol', name: 'Pop-Up Heavy Pistol cell', cost: 1000, hlRoll: '2d6', effect: 'Adds built-in pop-up Heavy pistol (3d6 dmg, 8 shells) into right forearm.' },
    { id: 'r_arm_blade', name: 'Pop-Up Cyber Blade', cost: 1200, hlRoll: '2d6', effect: 'Adds built-in pop-up arm blade (3d6 melee dmg) to pop out on right wrist.' }
  ],
  left_arm: [
    { id: 'l_arm_cyberarm', name: 'Militech Standard Cyberarm', cost: 500, hlRoll: '2d6', effect: 'Heavy metal replacement for left arm. Hard smash checks.' },
    { id: 'l_arm_pistol', name: 'Pop-Up Heavy Pistol cell', cost: 1000, hlRoll: '2d6', effect: 'Adds built-in pop-up Heavy pistol (3d6 dmg, 8 shells) into left forearm.' },
    { id: 'l_arm_blade', name: 'Pop-Up Cyber Blade', cost: 1200, hlRoll: '2d6', effect: 'Adds built-in pop-up arm blade (3d6 melee dmg) to pop out on left wrist.' }
  ],
  right_leg: [
    { id: 'r_leg_classic', name: 'Standard Hydraulic Cyberleg', cost: 500, hlRoll: '2d6', effect: 'Enables high-jumping and vertical mobility tricks.' },
    { id: 'r_leg_ankle', name: 'Grip-Foot Contortionist Joint', cost: 400, hlRoll: '1d6', effect: 'Micro-suction ankle linings: climbing speed increased.' }
  ],
  left_leg: [
    { id: 'l_leg_classic', name: 'Standard Hydraulic Cyberleg', cost: 500, hlRoll: '2d6', effect: 'Enables high-jumping and vertical mobility tricks.' },
    { id: 'l_leg_ankle', name: 'Grip-Foot Contortionist Joint', cost: 400, hlRoll: '1d6', effect: 'Micro-suction ankle linings: climbing speed increased.' }
  ],
  torso: [
    { id: 'torso_muscle', name: 'Grafted Muscle/Bone Lace', cost: 1000, hlRoll: '2d6', effect: 'Hormonal jacking: raises BODY attribute by +2 and max HP ceiling by +10.' },
    { id: 'torso_armor', name: 'Internal Torso Subdermal Plate', cost: 1000, hlRoll: '2d6', effect: 'Bonded plates upgrade Torso defenses. Set Torso SP index to 11 SP.' }
  ],
  skin: [
    { id: 'skin_armor', name: 'Subdermal Armor Jacking', cost: 1200, hlRoll: '2d6', effect: 'Woven carbon fibers. Boosts Head and Torso sp armor values to 11 SP.' },
    { id: 'skin_hair', name: 'Tech-Hair LED Fiber array', cost: 100, hlRoll: '1', effect: 'Dynamic biological neon hair. Purely aesthetic cosmetic status item.' }
  ]
};

export default function CharacterSheetDrawer({
  player,
  enemies,
  combatActive,
  onUpdateFullState,
  logs,
  onClose,
  isDecoupled = false
}: CharacterSheetDrawerProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    enemies?.filter(e => !e.isDead)[0]?.id || ''
  );
  
  // Local states for rolling feedback
  const [rollFeedback, setRollFeedback] = useState<string | null>(null);

  // Initialize wallet and humanity safely if undefined
  const initialWallet = player.eurobucks ?? 5000;
  const initialMaxHL = player.humanity?.max ?? ((player.emp || 6) * 10);
  const initialCurrentHL = player.humanity?.current ?? initialMaxHL;
  
  // Local or persisted active class tracker values
  // Netrunner Cyberdeck Matrix
  const [deckPrograms, setDeckPrograms] = useState([
    { name: 'Eraser.exe', type: 'Anti-Program', rez: 5, maxRez: 5, effect: 'Deals direct brain feedback' },
    { name: 'Shield.cmd', type: 'Defense Bar', rez: 7, maxRez: 7, effect: 'Soaks netrunning feedback and ICE' },
    { name: 'KillerWorm.bin', type: 'Offensive ICE', rez: 6, maxRez: 6, effect: 'Reduces server defense index' }
  ]);
  const [deckCredits, setDeckCredits] = useState(1500);

  // Solo Combat Awareness (6 points allocation)
  const [soloPoints, setSoloPoints] = useState({
    threatDetection: 2,
    precisionAttack: 2,
    spotWeakness: 1,
    damageResiliency: 1
  });

  // Medtech Cryopump and Pharma Doses
  const [medPharma, setMedPharma] = useState({
    speedheal: 2,
    stim: 3,
    antibiotics: 1
  });

  // Lawman and Nomad vehicle register
  const [reinforcementInterval, setReinforcementInterval] = useState(3); // turns
  const [vehicleUpgrades, setVehicleUpgrades] = useState([
    { name: 'Heavy Armor Shell', spec: '+4 SP Armor Plating' },
    { name: 'Forearm Rocket Mount', spec: '1d10 kinetic payload launcher' }
  ]);

  // Cyberware Diagnostic Slot Modal
  const [selectedMappingSlot, setSelectedMappingSlot] = useState<string | null>(null);
  const [cyberwareSearch, setCyberwareSearch] = useState<string>('');

  // Retrieve installed cyberware list (fallback to empty of none)
  const installedCyberware: Record<string, string[]> = (player as any).installedCyberware || {};

  // Broadcast channel for decoupled popout interface synchronization
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('deckmaster-sync-channel');
      channelRef.current = channel;
      return () => channel.close();
    }
  }, []);

  const handleStateMutation = (updatedState: any) => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'STATE_MUTATE',
        payload: updatedState
      });
    }
    onUpdateFullState(updatedState);
  };

  const handleLogTrigger = (logEntry: any) => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'LOG_TRIGGER',
        payload: logEntry
      });
    }
    onUpdateFullState({
      logs: [logEntry, ...logs]
    });
  };

  // Cyberware install event math triggers
  const handleInstallCyberwareItem = (slot: string, item: CyberwareItem) => {
    if (initialWallet < item.cost) {
      audio.playAlert();
      alert(`⚠️ TRANSACTION FAILS: Insufficient Eurodollars! Critical hardware requires ${item.cost} Eb. Current wallet has ${initialWallet} Eb.`);
      return;
    }

    // Process Humanity Loss rolling checks
    let hlLossRolled = 0;
    if (item.hlRoll === '1') {
      hlLossRolled = 1;
    } else if (item.hlRoll === '1d6') {
      hlLossRolled = Math.floor(Math.random() * 6) + 1;
    } else if (item.hlRoll === '2d6') {
      hlLossRolled = (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
    }

    // Permanent humanity deduction: 2 HL max points lost.
    const permHrCeilingDeduction = 2;
    const nextMaxHl = Math.max(10, initialMaxHL - permHrCeilingDeduction);
    const nextCurrentHl = Math.max(1, initialCurrentHL - hlLossRolled);
    const nextEmp = Math.max(1, Math.floor(nextCurrentHl / 10));

    // Wallet transaction
    const nextWallet = initialWallet - item.cost;

    // Mutate state attributes list
    const nextPlayer = { ...player };
    nextPlayer.eurobucks = nextWallet;
    nextPlayer.humanity = { current: nextCurrentHl, max: nextMaxHl };
    nextPlayer.emp = nextEmp;

    // Persist list of installed items
    const slotList = installedCyberware[slot] ? [...installedCyberware[slot]] : [];
    if (slotList.includes(item.name)) {
      alert(`⚠️ DUPLICATION WARNING: ${item.name} is already jacked into your anatomical core slots.`);
      return;
    }
    slotList.push(item.name);
    
    // Inject custom structural trackers
    const rootInstalled = { ...installedCyberware, [slot]: slotList };
    (nextPlayer as any).installedCyberware = rootInstalled;

    // Programmatically unlock unique cyberware weapon and defense variables
    let customEffectLog = '';
    
    if (item.id.includes('pistol')) {
      const isDuplicated = nextPlayer.weapons.some(w => w.name.includes('Pop-Up'));
      if (!isDuplicated) {
        nextPlayer.weapons = [
          ...nextPlayer.weapons,
          { id: `popup_p_${Date.now()}`, name: `Pop-Up Forearm Pistol [${slot.toUpperCase()}]`, damage: '3d6', ammo: 8, maxAmmo: 8, type: 'pistol' }
        ];
        customEffectLog += ' Foreground cyber-weapon POP-UP GUN welded into weapon deck sheets!';
      }
    } else if (item.id.includes('blade')) {
      const isDuplicated = nextPlayer.weapons.some(w => w.name.includes('Pop-Up Arm Blade'));
      if (!isDuplicated) {
        nextPlayer.weapons = [
          ...nextPlayer.weapons,
          { id: `popup_b_${Date.now()}`, name: `Pop-Up Arm Blade [${slot.toUpperCase()}]`, damage: '3d6', ammo: 1, maxAmmo: 1, type: 'melee' }
        ];
        customEffectLog += ' Foreground cyber-grafted pop-out ARM BLADE welded into melee matrices!';
      }
    } else if (item.id.includes('muscle')) {
      nextPlayer.body = Math.min(10, (player.body || 6) + 2);
      nextPlayer.maxHp = (player.maxHp || 40) + 10;
      nextPlayer.hp = (player.hp || 40) + 10;
      customEffectLog += ' Hormonal Grafting increased body attribute limit (+2 BODY) and expanded +10 max HP matrix.';
    } else if (item.id.includes('torso_armor')) {
      nextPlayer.spTorso = 11;
      customEffectLog += ' Bound carbon plating forced Torso SP matrix value to 11 SP.';
    } else if (item.id.includes('skin_armor')) {
      nextPlayer.spHead = 11;
      nextPlayer.spTorso = 11;
      customEffectLog += ' Carbon dermal weaving aligned Head and Torso sp armor indicators immediately to 11 SP.';
    }

    setRollFeedback(`JACKED IN: ${item.name}! Max HL -2, Lost ${hlLossRolled} HL.`);
    setTimeout(() => setRollFeedback(null), 3000);

    audio.playNetSuccess();
    setSelectedMappingSlot(null);

    handleStateMutation({ player: nextPlayer });

    handleLogTrigger({
      id: `cyber_inst_${Date.now()}`,
      timestamp: getGameTime(),
      type: 'system',
      message: `🦾 BIOMECHANICAL INSTALL INTEGRITY: ${player.name} installed [${item.name}] into anatomical ${slot.toUpperCase()} region! Deducted $${item.cost} Eb, rolled [-${hlLossRolled} HL] humanity penalty (Ceiling reduced by ${permHrCeilingDeduction}).${customEffectLog}`
    });
  };

  // Safe checks rolls
  const handleRollSkill = (skillName: string, statVal: number, level: number) => {
    audio.playUIBeep();
    const resultObj = rollD10();
    const total = statVal + level + resultObj.total;
    const desc = resultObj.rollString;

    let critMsg = '';
    if (resultObj.isCriticalSuccess) critMsg = ' 💥 EXPLODING CRITICAL!';
    if (resultObj.isFumble) critMsg = ' ⚠️ FUMBLE PENALTY!';

    const logText = `🎲 SKILL ROLL CHECK: ${player.name} rolls ${skillName} (${statVal} Stat + ${level} Rank) + [1d10: ${desc}] = total [${total}]${critMsg}`;
    
    setRollFeedback(`${skillName} Check: 1d10 + ${statVal + level} = [${total}]`);
    setTimeout(() => setRollFeedback(null), 3500);

    handleLogTrigger({
      id: `skill_${Date.now()}`,
      timestamp: getGameTime(),
      type: 'combat',
      message: logText
    });
  };

  const handleAblateArmor = (slot: 'head' | 'torso', change: number) => {
    audio.playUIBeep();
    const nextPlayer = { ...player };
    if (slot === 'head') {
      nextPlayer.spHead = Math.max(0, (player.spHead || 0) + change);
    } else {
      nextPlayer.spTorso = Math.max(0, (player.spTorso || 0) + change);
    }

    handleStateMutation({ player: nextPlayer });

    handleLogTrigger({
      id: `armor_ablate_${Date.now()}`,
      timestamp: getGameTime(),
      type: 'system',
      message: `🛡️ CHROME ABLATION ACCRUED: Modified ${slot.toUpperCase()} armor value of ${player.name} to [${slot === 'head' ? nextPlayer.spHead : nextPlayer.spTorso} SP].`
    });
  };

  const handleRollDeathSave = () => {
    audio.playAlert();
    const penaltyCount = player.initiative || 0;
    const roll = Math.floor(Math.random() * 10) + 1;
    const threshold = (player.body || 6) - penaltyCount;

    let fatal = false;
    let text = '';

    if (roll >= threshold) {
      fatal = true;
      text = `☠️ DEATH DECK FAILURE! Rolled d10: [${roll}] >= Threshold [${threshold}] (Body ${player.body || 6} - Penalty ${penaltyCount}). ${player.name} FLATLINED!`;
    } else {
      text = `💖 DEATH STATE SURVIVED: Rolled d10: [${roll}] < Threshold [${threshold}] (Body ${player.body || 6} - Penalty ${penaltyCount}). ${player.name} clings onto cyberspace.`;
    }

    const nextPlayer = { ...player, isDead: fatal };
    handleStateMutation({ player: nextPlayer });

    handleLogTrigger({
      id: `death_save_${Date.now()}`,
      timestamp: getGameTime(),
      type: fatal ? 'damage' : 'system',
      message: text
    });
  };

  const handleFireWeaponFromSheet = (wpn: Weapon) => {
    const targetEnemy = enemies?.find(e => e.id === selectedTargetId);
    if (!targetEnemy || targetEnemy.isDead) {
      alert("Please select a live target enemy to align vector telemetry!");
      return;
    }

    audio.playUIBeep();
    
    if (wpn.ammo <= 0) {
      audio.playAlert();
      handleLogTrigger({
        id: `no_ammo_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'system',
        message: `⚠️ AMMUNITION MATRIX DRY: ${wpn.name} clicks inactive because cell ammo represents [0].`
      });
      return;
    }

    const px = player.x || 1;
    const py = player.y || 1;
    const ex = targetEnemy.x || 5;
    const ey = targetEnemy.y || 5;
    const distanceMeters = Math.max(Math.abs(ex - px), Math.abs(ey - py)) * 2;

    const d10Result = rollD10();
    const wpnSkill = wpn.type === 'pistol' ? getSkillLevel('handgun') : getSkillLevel('shoulderArms');
    const totalAttackRoll = (player.ref || 6) + wpnSkill + d10Result.total;

    let targetDV = 0;
    if (wpn.type === 'melee') {
      targetDV = (targetEnemy.dex || 5) + 5;
    } else {
      targetDV = getWeaponDV(wpn.type as any, distanceMeters);
    }

    const coverDvVal = targetEnemy.isCovered ? 4 : 0;
    const finalDV = targetDV + coverDvVal;
    const isHit = totalAttackRoll >= finalDV;

    let battleText = '';
    let updatedEnemies = [...enemies];
    let updatedPlayer = { ...player };

    updatedPlayer.weapons = player.weapons.map(w => w.id === wpn.id ? { ...w, ammo: w.ammo - 1 } : w);

    if (isHit) {
      if (wpn.type === 'pistol') audio.playPistol();
      else if (wpn.type === 'shotgun') audio.playShotgun();
      else if (wpn.type === 'rifle') audio.playShotgun();
      else audio.playMelee();

      const dmgVal = rollDamage(wpn.damage);
      const hitTorso = Math.random() > 0.15;
      const locStr = hitTorso ? 'Torso' : 'Head';
      const actualSp = hitTorso ? (targetEnemy.spTorso || 0) : (targetEnemy.spHead || 0);
      
      let passDamage = dmgVal.total - actualSp;
      if (passDamage < 0) passDamage = 0;

      let critAdded = false;
      if (dmgVal.isCriticalInjury) {
        critAdded = true;
        passDamage += 5;
      }

      const nextEnemyHp = Math.max(0, targetEnemy.hp - passDamage);
      const ablatedHeadSp = !hitTorso && passDamage > 0 ? Math.max(0, (targetEnemy.spHead || 0) - 1) : (targetEnemy.spHead || 0);
      const ablatedTorsoSp = hitTorso && passDamage > 0 ? Math.max(0, (targetEnemy.spTorso || 0) - 1) : (targetEnemy.spTorso || 0);

      updatedEnemies = enemies.map(e => {
        if (e.id === targetEnemy.id) {
          const injuries = [...(e.criticalInjuries || [])];
          if (critAdded && !injuries.includes("Broken Leg")) {
            injuries.push("Broken Leg");
          }
          return {
            ...e,
            hp: nextEnemyHp,
            spHead: ablatedHeadSp,
            spTorso: ablatedTorsoSp,
            criticalInjuries: injuries,
            isDead: nextEnemyHp <= 0
          };
        }
        return e;
      });

      battleText = `🎯 CHROME ATTACK: ${player.name} fires ${wpn.name} at ${targetEnemy.name} (Dist: ${distanceMeters}m)! Rolled ${totalAttackRoll} vs DV ${finalDV} (HIT!). Deals ${dmgVal.total} damage to ${locStr}. (${passDamage} passed SP).`;
      if (critAdded) battleText += ` [CRITICAL INJURY]: Broken Leg structural fracture sustained!`;
    } else {
      battleText = `💨 CHROME ATTACK: ${player.name} fires ${wpn.name} at ${targetEnemy.name} (Dist: ${distanceMeters}m)! Rolled ${totalAttackRoll} vs DV ${finalDV} (MISS).`;
    }

    handleStateMutation({
      player: updatedPlayer,
      enemies: updatedEnemies
    });

    handleLogTrigger({
      id: `fire_sheet_${Date.now()}`,
      timestamp: getGameTime(),
      type: 'combat',
      message: battleText
    });
  };

  const handleUsePharma = (type: 'speedheal' | 'stim' | 'antibiotics') => {
    if (medPharma[type] <= 0) {
      audio.playAlert();
      alert(`⚠️ DRUG MATRIX EMPTY: Your Medtech belt does not have any further doses of ${type.toUpperCase()} left!`);
      return;
    }

    audio.playNetSuccess();
    setMedPharma(prev => ({ ...prev, [type]: prev[type] - 1 }));

    let effectText = '';
    const nextPlayer = { ...player };

    if (type === 'speedheal') {
      const healRoll = Math.floor(Math.random() * 10) + 1; // 1d10 heal rules CPR
      nextPlayer.hp = Math.min(player.maxHp, player.hp + healRoll);
      effectText = `Administered custom Speedheal! Rolled 1d10: healed +${healRoll} HP.`;
    } else if (type === 'stim') {
      effectText = `Administered Stim! Core REF and DEX coordination speeds raised temporarily for state recovery checks.`;
    } else if (type === 'antibiotics') {
      nextPlayer.criticalInjuries = [];
      effectText = `Administered broad-spectrum Antibiotics! Cleared and synthesized away all active critical injury penalty tags.`;
    }

    handleStateMutation({ player: nextPlayer });

    handleLogTrigger({
      id: `med_pharma_${Date.now()}`,
      timestamp: getGameTime(),
      type: 'system',
      message: `💊 MEDTECH PHARMACEUTICAL MATRIX TRIGGERED: ${player.name} consumed one dose of core ${type.toUpperCase()}. ${effectText}`
    });
  };

  const INT = player.int || 6;
  const REF = player.ref || 6;
  const DEX = player.dex || 6;
  const TECH = player.tech || 6;
  const COOL = player.cool || 6;
  const WILL = player.will || 6;
  const LUCK = player.luck || 5;
  const MOVE = player.move || 6;
  const BODY = player.body || 6;
  const EMP = player.emp || 6;

  // Standard skills index
  const getSkillLevel = (skillKey: string): number => {
    if (player.skills && skillKey in player.skills) {
      return player.skills[skillKey];
    }
    const defaults: Record<string, number> = {
      perception: 4, concentration: 3, handgun: 5, shoulderArms: 4, brawling: 4, melee: 4, athletics: 4, stealth: 4, persuasion: 3, humanPerception: 3, streetwise: 3
    };
    return defaults[skillKey] || 2;
  };

  const skillCategories = [
    {
      name: "Awareness Matrix",
      skills: [
        { name: "Perception Sensoric", stat: "INT", statVal: INT, key: "perception" },
        { name: "Concentration Core", stat: "WILL", statVal: WILL, key: "concentration" }
      ]
    },
    {
      name: "Tactical Combat Ranks",
      skills: [
        { name: "Handgun Decking", stat: "REF", statVal: REF, key: "handgun" },
        { name: "Shoulder Arms Projector", stat: "REF", statVal: REF, key: "shoulderArms" },
        { name: "Brawling Hard-Slam", stat: "DEX", statVal: DEX, key: "brawling" },
        { name: "Melee Blade Weaving", stat: "DEX", statVal: DEX, key: "melee" }
      ]
    },
    {
      name: "Physical Body Jackings",
      skills: [
        { name: "Athletics Overdrive", stat: "DEX", statVal: DEX, key: "athletics" },
        { name: "Stealth Matrix Cloaking", stat: "DEX", statVal: DEX, key: "stealth" }
      ]
    },
    {
      name: "Social / Street Exploits",
      skills: [
        { name: "Streetwise Intel", stat: "COOL", statVal: COOL, key: "streetwise" },
        { name: "Human Stress Profiling", stat: "EMP", statVal: EMP, key: "humanPerception" }
      ]
    }
  ];

  const roleText = player.role || 'Solo';
  const lowercaseRole = roleText.toLowerCase();

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#0f0f12] border-l border-cyan-400 text-gray-200 z-50 flex flex-col font-mono text-[11px] h-screen shadow-[0_0_35px_rgba(6,182,212,0.3)] select-none">
      
      {/* Header Panel */}
      <div className="p-3.5 border-b border-cyan-500/30 bg-[#07070a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="text-cyan-400 w-4.5 h-4.5 animate-pulse" />
          <span className="font-extrabold text-white uppercase text-[10px] tracking-widest text-[#00ffff] filter drop-shadow-[0_0_5px_rgba(0,255,255,0.7)]">
            {isDecoupled ? 'CORE OVERLAY TERMINAL' : 'SECURE NET CELL SHEET PROFILE'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-[10px] bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded font-black tracking-widest uppercase">
            ROLE: {roleText.toUpperCase()}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rolls status bubble overlay */}
      {rollFeedback && (
        <div className="bg-[#00ffff] text-black px-4 py-2 font-black text-center text-xs animate-bounce uppercase tracking-widest border-b border-cyan-400 shadow-[0_0_10px_rgba(0,255,255,1)]">
          🎲 {rollFeedback}
        </div>
      )}

      {/* Main Container Scrollable Grid layout */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        
        {/* TOP STATUS HUB AND VITALS TRACKER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <div className="bg-[#14141a] border border-cyan-500/20 p-2.5 rounded relative text-center">
            <span className="text-gray-500 font-extrabold text-[8px] block uppercase tracking-wider mb-1">BIOMETRICS CEILING</span>
            <span className="text-white text-base font-black flex items-center justify-center gap-1">
              <Heart className="w-4.5 h-4.5 text-rose-500 fill-rose-500" /> {player.hp} / {player.maxHp} HP
            </span>
            <span className="text-[8px] text-gray-500 block mt-1.5 leading-none">
              Seriously Damaged starts ≤ {Math.ceil(player.maxHp / 2)} HP
              {player.hp <= (player.maxHp / 2) && (
                <span className="text-red-500 font-black block mt-0.5 animate-pulse">⚠️ SEVERE BLOOD FLUID LEAKAGE</span>
              )}
            </span>
          </div>

          <div className="bg-[#14141a] border border-cyan-500/20 p-2.5 rounded relative text-center">
            <span className="text-gray-500 font-extrabold text-[8px] block uppercase tracking-wider mb-1">HUMANITY MATRIX INDEX</span>
            <span className="text-white text-base font-black flex items-center justify-center gap-1">
              <Zap className="w-4.5 h-4.5 text-pink-400 fill-pink-450" /> {initialCurrentHL} / {initialMaxHL} HL
            </span>
            <span className="text-[8px] text-gray-500 block mt-1.5 leading-none">
              Core Empathy parameter: <span className="text-cyan-400 font-bold">{player.emp || 6} EMP</span>
            </span>
          </div>

          <div className="bg-[#14141a] border border-cyan-500/20 p-2.5 rounded relative text-center">
            <span className="text-gray-500 font-extrabold text-[8px] block uppercase tracking-wider mb-1">NETDECK CREDITS BUFFER</span>
            <span className="text-white text-base font-black flex items-center justify-center gap-1">
              <ShoppingBag className="w-4.5 h-4.5 text-emerald-400" /> {initialWallet} Eb
            </span>
            <span className="text-[8px] text-gray-500 block mt-1.5 leading-none">
              Scavenge operations active. Cyberware purchase allowed.
            </span>
          </div>

        </div>

        {/* DETECT LEVEL SAVES IF HP ZERO */}
        {player.hp <= 0 && (
          <div className="bg-red-950/60 border-2 border-red-500 p-3 rounded flex items-center justify-between text-xs font-black text-red-400 animate-pulse">
            <div>
              <span className="block text-[10px] text-red-500 tracking-wider">⚠️ NEURAL CELL INTEGRITY AT ZERO</span>
              <span>HEART BEAT SUSPENDED! ROLL DEATH SAVE IMMEDIATELY.</span>
            </div>
            <button
              onClick={handleRollDeathSave}
              className="bg-red-600 hover:bg-red-700 text-white font-mono px-4 py-2 uppercase rounded-lg border border-red-500 cursor-pointer shadow-[0_0_15px_rgba(255,0,0,0.5)]"
            >
              Death Save Roll
            </button>
          </div>
        )}

        {/* MAIN BODY WORKSPACE - MULTI-COLUMN HIGH CONTRAST MATRIX GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pb-3">
          
          {/* LEFT REPLICATOR: CORE ATTRIBUTES TABULAR */}
          <div className="md:col-span-3 bg-[#111116] border border-cyan-500/20 rounded p-2.5 space-y-1.5">
            <div className="pb-1 border-b border-gray-800 flex justify-between items-center text-[9px] font-bold text-cyan-400">
              <span>STAT DATA LAYER</span>
              <User className="w-3" />
            </div>

            {[
              { label: 'INTEL', val: INT, desc: 'Information logic processing' },
              { label: 'REFLEX', val: REF, desc: 'Target tracking and weapon rates' },
              { label: 'DEXTER', val: DEX, desc: 'Omnidirectional evasion systems' },
              { label: 'TECH', val: TECH, desc: 'Cyber-circuit diagnostic mastery' },
              { label: 'COOL', val: COOL, desc: 'Facedown nerve suppressions' },
              { label: 'WILL', val: WILL, desc: 'Stamina and critical injury buffer' },
              { label: 'LUCK', val: LUCK, desc: 'Dice manipulation pool points' },
              { label: 'BODY', val: BODY, desc: 'Physical muscle density core' },
              { label: 'SPEED', val: MOVE, desc: 'Tactical tile motion metrics' },
              { label: 'EMPATHY', val: EMP, desc: 'Human neural balance indices' }
            ].map(stat => (
              <div key={stat.label} className="p-1 px-1.5 border border-cyan-500/5 bg-[#14141a] rounded flex justify-between items-center hover:bg-cyan-500/5 hover:border-cyan-500/30 transition">
                <span className="font-extrabold text-white text-[9.5px] uppercase tracking-wider">{stat.label}</span>
                <span className="text-[12px] font-black text-cyan-400 tracking-widest">{stat.val}</span>
              </div>
            ))}
          </div>

          {/* CENTER REPLICATOR: CATEGORIZED DETAILED SKILL MATRIX AND DICE ROLLING */}
          <div className="md:col-span-5 bg-[#111116] border border-cyan-500/20 rounded p-2.5 space-y-3">
            <div className="pb-1 border-b border-gray-800 flex justify-between items-center text-[9px] font-bold text-cyan-400">
              <span>TACTICAL SKILLS matrix</span>
              <Award className="w-3" />
            </div>

            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {skillCategories.map(cat => (
                <div key={cat.name} className="space-y-1">
                  <span className="text-[#00ffff] font-black uppercase text-[8px] tracking-widest block border-b border-cyan-500/10 pb-0.5">{cat.name}</span>
                  <div className="space-y-1">
                    {cat.skills.map(sk => {
                      const level = getSkillLevel(sk.key);
                      const baseTotal = sk.statVal + level;
                      return (
                        <div key={sk.key} className="flex justify-between items-center p-1 px-1.5 bg-[#14141a]/90 hover:bg-cyan-500/5 rounded transition">
                          <div className="max-w-[140px] truncate">
                            <span className="text-white text-[10px] font-bold block leading-none">{sk.name}</span>
                            <span className="text-[7.5px] text-gray-500 mt-0.5 block font-mono">Mod: +{sk.statVal} | Lvl: {level}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[9.5px] text-cyan-400 font-extrabold text-glow-cyan">+{baseTotal}</span>
                            <button
                              onClick={() => handleRollSkill(sk.name, sk.statVal, level)}
                              className="bg-black text-cyan-400 border border-cyan-500/40 hover:bg-cyan-400 hover:text-black py-0.5 px-2 rounded font-mono text-[8px] font-black uppercase transition-all cursor-pointer"
                            >
                              ROLL
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

          {/* RIGHT REPLICATOR: WEAPONS, HARNED ARMOR JACKING AND DEFENSES */}
          <div className="md:col-span-4 bg-[#111116] border border-cyan-500/20 rounded p-2.5 space-y-3">
            <div className="pb-1 border-b border-gray-800 flex justify-between items-center text-[9px] font-bold text-cyan-400">
              <span>DEFENSIVE SHEATHS</span>
              <Shield className="w-3" />
            </div>

            <div className="space-y-2 border border-cyan-500/10 p-2 bg-black/40 rounded">
              <span className="text-[8px] text-gray-400 uppercase tracking-widest block">Active SP Armorjack values</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#14141a] p-1.5 border border-cyan-500/10 rounded flex flex-col items-center">
                  <span className="text-[7.5px] text-gray-500 block uppercase">HEAD JACK</span>
                  <span className="text-cyan-400 text-xs font-black tracking-widest">{player.spHead || 0} SP</span>
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => handleAblateArmor('head', -1)} className="w-4 h-4 bg-black border border-gray-700 text-center font-black text-[8px] rounded hover:border-cyan-400 flex items-center justify-center">-</button>
                    <button onClick={() => handleAblateArmor('head', 1)} className="w-4 h-4 bg-black border border-gray-700 text-center font-black text-[8px] rounded hover:border-cyan-400 flex items-center justify-center">+</button>
                  </div>
                </div>

                <div className="bg-[#14141a] p-1.5 border border-cyan-500/10 rounded flex flex-col items-center">
                  <span className="text-[7.5px] text-gray-500 block uppercase">TORSO JACK</span>
                  <span className="text-cyan-400 text-xs font-black tracking-widest">{player.spTorso || 0} SP</span>
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => handleAblateArmor('torso', -1)} className="w-4 h-4 bg-black border border-gray-700 text-center font-black text-[8px] rounded hover:border-cyan-400 flex items-center justify-center">-</button>
                    <button onClick={() => handleAblateArmor('torso', 1)} className="w-4 h-4 bg-black border border-gray-700 text-center font-black text-[8px] rounded hover:border-cyan-400 flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Weapon Sights launcher */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-gray-400 uppercase tracking-widest leading-none">CELL WEAPON SLOTS</span>
                {enemies?.filter(e => !e.isDead).length > 0 && (
                  <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    className="bg-[#121217] border border-cyan-500/25 text-[#00ffff] font-extrabold text-[8px] p-0.5 rounded font-mono outline-none"
                  >
                    {enemies.filter(e => !e.isDead).map(en => (
                      <option key={en.id} value={en.id}>{en.name.split(' ')[0]} ({Math.max(Math.abs((en.x || 5) - (player.x || 2)), Math.abs((en.y || 5) - (player.y || 2))) * 2}m)</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                {player.weapons.map((wpn, idx) => (
                  <div key={wpn.id || idx} className="p-1.5 bg-[#14141a] border border-cyan-500/10 rounded space-y-1 relative">
                    <div className="flex justify-between items-center leading-none">
                      <span className="text-white text-[9.5px] font-black">{wpn.name}</span>
                      <span className="text-[8px] font-bold text-cyan-400">{wpn.ammo}/{wpn.maxAmmo} Shells</span>
                    </div>
                    <div className="flex justify-between items-center text-[8px] text-gray-400 bg-black/60 p-1 rounded">
                      <span>Dmg: <span className="text-pink-400 font-bold">{wpn.damage}</span></span>
                      <button
                        onClick={() => handleFireWeaponFromSheet(wpn)}
                        className="py-0.5 px-2 bg-rose-950/20 text-rose-500 border border-rose-500/30 hover:bg-rose-600 hover:text-white rounded uppercase font-black"
                      >
                        Fire
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* INTERACTIVE COMPREHENSIVE CYBERWARE BLUEPRINT DIAGRAM */}
        <div className="bg-[#111116] border border-cyan-500/20 rounded p-3 space-y-3 relative">
          <div className="absolute top-2.5 right-2 flex items-center gap-1.5 animate-pulse">
            <Cpu className="text-[#00ffff] w-3 h-3" />
            <span className="text-[7.5px] text-[#00ffff] font-extrabold tracking-widest uppercase">ANATOMICAL CELL DETECTOR ACTIVATED</span>
          </div>
          
          <span className="text-gray-400 font-extrabold text-[9px] block uppercase tracking-wider border-b border-gray-800 pb-1.5">🦾 HUMANITY CLASSIFIED CYBERWARE BLUEPRINT DIAGRAM</span>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* SVG Cyber-Human wireframe outlines */}
            <div className="md:col-span-5 bg-black/50 p-2 border border-cyan-500/5 rounded-lg flex items-center justify-center min-h-[260px] relative">
              
              {/* Complex Human Silhouette Visual Vector Wireframe */}
              <svg className="w-full text-cyan-400 max-w-[180px] filter drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]" viewBox="0 0 200 360" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* HEAD */}
                <circle cx="100" cy="40" r="16" stroke="currentColor" strokeWidth="2" strokeDasharray="3,1" />
                {/* NECK / SPINE */}
                <line x1="100" y1="56" x2="100" y2="160" stroke="currentColor" strokeWidth="2" />
                <line x1="94" y1="72" x2="106" y2="72" stroke="currentColor" strokeWidth="1.5" />
                <line x1="90" y1="96" x2="110" y2="96" stroke="currentColor" strokeWidth="1.5" />
                <line x1="88" y1="120" x2="112" y2="120" stroke="currentColor" strokeWidth="1.5" />
                <line x1="92" y1="144" x2="108" y2="144" stroke="currentColor" strokeWidth="1.5" />
                {/* CORSE / RIB MATRIX */}
                <path d="M72 100 Q100 120 128 100" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2,2" />
                <path d="M68 118 Q100 138 132 118" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2,2" />
                <path d="M70 136 Q100 156 130 136" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2,2" />
                {/* ARMS LEFT & RIGHT */}
                <path d="M68 84 L30 140" stroke="currentColor" strokeWidth="2.5" />
                <path d="M132 84 L170 140" stroke="currentColor" strokeWidth="2.5" />
                {/* LEGS LEFT & RIGHT */}
                <path d="M85 160 L60 280" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6,2" />
                <path d="M115 160 L140 280" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6,2" />
                
                {/* Clickable hotspot nodes styled nicely */}
                {/* Head (Brain) */}
                <circle cx="100" cy="35" r="9" className="fill-cyan-950 stroke-cyan-400 hover:fill-pink-500 cursor-pointer animate-pulse" onClick={() => setSelectedMappingSlot('brain')} />
                {/* Back Eyes */}
                <circle cx="92" cy="32" r="4.5" className="fill-purple-950 stroke-indigo-400 hover:fill-pink-500 cursor-pointer" onClick={() => setSelectedMappingSlot('eyes')} />
                {/* Right Ear */}
                <circle cx="112" cy="40" r="4.5" className="fill-purple-950 stroke-indigo-400 hover:fill-pink-500 cursor-pointer" onClick={() => setSelectedMappingSlot('ears')} />
                {/* Chest/Torso */}
                <circle cx="100" cy="115" r="9.5" className="fill-cyan-950 stroke-teal-400 hover:fill-pink-500 cursor-pointer animate-pulse" onClick={() => setSelectedMappingSlot('torso')} />
                {/* Right Arm */}
                <circle cx="158" cy="120" r="8.5" className="fill-cyan-950 stroke-rose-400 hover:fill-pink-500 cursor-pointer" onClick={() => setSelectedMappingSlot('right_arm')} />
                {/* Left Arm */}
                <circle cx="42" cy="120" r="8.5" className="fill-cyan-950 stroke-rose-400 hover:fill-pink-500 cursor-pointer" onClick={() => setSelectedMappingSlot('left_arm')} />
                {/* Right Leg */}
                <circle cx="132" cy="230" r="8.5" className="fill-cyan-950 stroke-emerald-400 hover:fill-pink-500 cursor-pointer" onClick={() => setSelectedMappingSlot('right_leg')} />
                {/* Left Leg */}
                <circle cx="68" cy="230" r="8.5" className="fill-cyan-950 stroke-emerald-400 hover:fill-pink-500 cursor-pointer" onClick={() => setSelectedMappingSlot('left_leg')} />
                {/* Skin overall */}
                <circle cx="100" cy="180" r="7" className="fill-cyan-950 stroke-white hover:fill-pink-500 cursor-pointer" onClick={() => setSelectedMappingSlot('skin')} />
              </svg>

              <div className="absolute bottom-2 text-[7px] text-gray-400 leading-none">
                CLICK GLOWING CORES TO CONFIGURE HARDWARE INSTALMENT
              </div>
            </div>

            {/* List of currently installed cyberware modules */}
            <div className="md:col-span-7 bg-[#14141a] border border-cyan-500/10 rounded-lg p-3 space-y-2 min-h-[260px] flex flex-col justify-between">
              <div>
                <span className="text-[8.5px] text-cyan-400 font-extrabold tracking-widest block border-b border-gray-800 pb-1 uppercase">SYSTEM REPORT: INSTALLED CHROME DECK MODULES</span>
                
                <div className="mt-2 space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                  {Object.entries(installedCyberware).map(([slot, itemsList]) => (
                    <div key={slot} className="p-1 px-2 border border-cyan-500/10 bg-black/30 rounded flex justify-between items-center text-[9px]">
                      <div>
                        <span className="text-cyan-400 font-extrabold uppercase mr-1.5 font-mono">{slot.replace('_', ' ')}:</span>
                        <span className="text-white font-bold leading-none">{itemsList.join(', ')}</span>
                      </div>
                      <span className="text-[7.5px] text-emerald-400 font-extrabold border border-emerald-500/20 bg-emerald-950/20 rounded px-1 lowercase">active_wire</span>
                    </div>
                  ))}

                  {Object.keys(installedCyberware).length === 0 && (
                    <div className="text-center text-gray-600 py-12 text-[9px] uppercase tracking-widest">
                      [ System contains pure organic flesh. Hardware core vacant. ]
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-800 pt-2 flex justify-between text-[8px] text-gray-500 leading-none">
                <span>SYSTEM MEMORY: REGISTERED</span>
                <span>CHEST HARNESSES [OK]</span>
              </div>

            </div>

          </div>
        </div>

        {/* ROLE SPECIFIC CORE ABILITY CONTROL DESKS */}
        {lowercaseRole === 'netrunner' && (
          <div className="bg-[#14141a] border border-pink-500/30 p-3 rounded-lg space-y-3 hover:border-pink-500/50 transition">
            <span className="text-[#ff00ff] font-extrabold text-[8.5px] tracking-widest block border-b border-pink-500/15 pb-1 uppercase">// NETRUNNER CORSE PORT // DECK PROGRAM DIRECTORY</span>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {deckPrograms.map((prog, pIdx) => (
                <div key={pIdx} className="bg-black/60 border border-pink-500/10 p-2 rounded relative">
                  <div className="flex justify-between items-center leading-none">
                    <span className="text-[#ff00ff] font-bold text-[10px]">{prog.name}</span>
                    <span className="text-[7px] text-gray-500 uppercase">{prog.type}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#ff00ff] h-full" style={{ width: `${(prog.rez / prog.maxRez) * 100}%` }}></div>
                    </div>
                    <span className="text-[7.5px] text-gray-300 font-black">{prog.rez} REZ</span>
                  </div>
                  <p className="text-[7.5px] text-gray-400 mt-1 truncate leading-none">{prog.effect}</p>
                </div>
              ))}
            </div>

            <div className="bg-black/40 border border-white/5 p-2 rounded flex justify-between items-center text-[8.5px]">
              <div>
                <span className="text-gray-500">CUSTOM COMPILED REZ MATRIX CHECKS:</span>
                <span className="text-pearl-200 block text-xs font-bold font-mono mt-0.5">Brainfry.virus • Compiled</span>
              </div>
              <button onClick={() => { audio.playNetSuccess(); handleRollSkill("Virus Injector", INT, 4); }} className="px-3 py-1 bg-pink-700 hover:bg-pink-600 text-white rounded text-[8px] font-black uppercase">Inject Virus Macro</button>
            </div>
          </div>
        )}

        {lowercaseRole === 'solo' && (
          <div className="bg-[#14141a] border border-orange-500/30 p-3 rounded-lg space-y-3 hover:border-orange-500/50 transition">
            <span className="text-orange-400 font-extrabold text-[8.5px] tracking-widest block border-b border-orange-500/15 pb-1 uppercase">// SOLO OPERATIONS // COMBAT AWARENESS REGULATOR</span>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                { label: 'Threat Detection', val: soloPoints.threatDetection, key: 'threatDetection' },
                { label: 'Precision Attack', val: soloPoints.precisionAttack, key: 'precisionAttack' },
                { label: 'Spot Weakness', val: soloPoints.spotWeakness, key: 'spotWeakness' },
                { label: 'Damage Resiliency', val: soloPoints.damageResiliency, key: 'damageResiliency' }
              ].map(sub => {
                const totalAlloc = soloPoints.threatDetection + soloPoints.precisionAttack + soloPoints.spotWeakness + soloPoints.damageResiliency;
                return (
                  <div key={sub.key} className="p-1 px-2 border border-orange-500/10 bg-black/50 rounded flex flex-col justify-between text-center">
                    <span className="text-white font-bold block text-[9px]">{sub.label}</span>
                    <span className="text-orange-400 font-black text-sm mt-1">{sub.val} pts</span>
                    <div className="flex justify-center gap-1.5 mt-1.5">
                      <button
                        onClick={() => {
                          audio.playUIBeep();
                          setSoloPoints(prev => ({ ...prev, [sub.key]: Math.max(0, (prev as any)[sub.key] - 1) }));
                        }}
                        className="w-4 h-4 rounded bg-black border border-gray-750 text-[10px] text-glow-orange cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        onClick={() => {
                          audio.playUIBeep();
                          if (totalAlloc >= 6) {
                            alert("Cannot exceed 6 points Combat Awareness capacity!");
                            return;
                          }
                          setSoloPoints(prev => ({ ...prev, [sub.key]: (prev as any)[sub.key] + 1 }));
                        }}
                        className="w-4 h-4 rounded bg-black border border-gray-750 text-[10px] text-glow-orange cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <p className="text-[7.5px] text-gray-500 text-center">
              Spend up to 6 combat awareness parameters to buffer Headshots precision, block raw damage, or scan vectors fast during live firefight turns.
            </p>
          </div>
        )}

        {lowercaseRole === 'medtech' && (
          <div className="bg-[#14141a] border border-emerald-500/30 p-3 rounded-lg space-y-3 hover:border-emerald-500/50 transition">
            <span className="text-emerald-400 font-extrabold text-[8.5px] tracking-widest block border-b border-emerald-500/15 pb-1 uppercase">// MEDTECH CRYOPUMP // PHARMACEUTICAL DRUG CABINET</span>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                { label: 'Speedheal', type: 'speedheal', doses: medPharma.speedheal, spec: 'Doses remaining. Triggers +1d10 health regeneration immediately.' },
                { label: 'Stim Dose', type: 'stim', doses: medPharma.stim, spec: 'Doses remaining. Clears action spent restrictions.' },
                { label: 'Antibiotics cell', type: 'antibiotics', doses: medPharma.antibiotics, spec: 'Doses remaining. Synthesizes and clears extreme injury penalties.' }
              ].map(item => (
                <div key={item.type} className="bg-black/60 border border-emerald-500/10 p-2.5 rounded flex flex-col justify-between">
                  <div className="flex justify-between items-center leading-none">
                    <span className="text-white font-black text-[9.5px]">{item.label}</span>
                    <span className="text-emerald-400 font-bold">{item.doses} LEFT</span>
                  </div>
                  <p className="text-[7.5px] text-gray-400 my-1 pb-1">{item.spec}</p>
                  <button
                    onClick={() => handleUsePharma(item.type as any)}
                    className="w-full py-1 border border-emerald-500/35 bg-emerald-950/20 hover:bg-emerald-600 hover:text-black rounded text-[8px] font-black uppercase transition-all"
                  >
                    CONSUME DRUG DOSE
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(lowercaseRole === 'lawman' || lowercaseRole === 'nomad') && (
          <div className="bg-[#14141a] border border-indigo-500/30 p-3 rounded-lg space-y-3 hover:border-indigo-500/50 transition">
            <span className="text-indigo-400 font-extrabold text-[8.5px] tracking-widest block border-b border-indigo-500/15 pb-1 uppercase">{lowercaseRole === 'lawman' ? '👮 LAWMAN BACKUP COMMUNICATIONS DESK' : '🚗 NOMAD VEHICLE UPGRADE ARCHIVE'}</span>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {lowercaseRole === 'lawman' ? (
                <>
                  <div className="md:col-span-5 bg-black/50 p-2 border border-indigo-500/10 rounded">
                    <span className="text-[7.5px] text-gray-500 uppercase tracking-widest block">NIGHT CITY POLICE BACKUP RESPONSE</span>
                    <p className="text-[14px] font-black text-indigo-400 mt-1 leading-none">{reinforcementInterval} turns arrival</p>
                    <span className="text-[7.5px] text-gray-400 block mt-1">Tier: Corporal Patrol squad (Light Armor)</span>
                  </div>
                  <div className="md:col-span-7 space-y-1.5">
                    <span className="text-[7.5px] text-gray-500 uppercase tracking-widest block">Automated Dispatcher Callers</span>
                    <button
                      onClick={() => {
                        audio.playAlert();
                        handleLogTrigger({
                          id: `dispatch_${Date.now()}`,
                          timestamp: getGameTime(),
                          type: 'system',
                          message: `📢 LAWMAN RADIO: ${player.name} radioed for regional back-up! NCPD dispatcher logged interval: NCPD SWAT arriving in 3 turns!`
                        });
                      }}
                      className="w-full py-1.5 bg-indigo-950/30 hover:bg-indigo-600 hover:text-white rounded text-[8.5px] font-black uppercase text-indigo-400 border border-indigo-500/40 cursor-pointer"
                    >
                      📡 SIGNAL REGIONAL BACKUP SWAT
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="md:col-span-12 space-y-2">
                    <span className="text-[7.5px] text-gray-500 uppercase tracking-widest block">NOMAD CONFIGURED LANDCRUISER UPGRADES</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {vehicleUpgrades.map((vUp, vIdx) => (
                        <div key={vIdx} className="p-2 border border-indigo-500/10 bg-black/50 rounded flex justify-between items-center text-[9px]">
                          <div>
                            <span className="text-white font-extrabold block leading-none">{vUp.name}</span>
                            <span className="text-gray-500 text-[7.5px] mt-0.5 block">{vUp.spec}</span>
                          </div>
                          <span className="text-[7.5px] text-indigo-400 font-extrabold">configured</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ANATOMICAL NODE FOCUS POPUP SELECTOR MODAL */}
      {selectedMappingSlot && (
        <div className="fixed inset-0 bg-[#000000]/80 flex items-center justify-center p-4 z-55 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0e0e13] border-2 border-cyan-400 rounded-lg p-4 relative space-y-3 shadow-[0_0_25px_rgba(0,255,255,0.4)]">
            <button onClick={() => setSelectedMappingSlot(null)} className="absolute top-2 right-2 text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <span className="text-cyan-400 font-mono font-black text-xs uppercase tracking-widest block border-b border-gray-800 pb-1">
              🦾 SELECTION MATRIX: INSTALMENT FOR Node [{selectedMappingSlot.toUpperCase()}]
            </span>

            <p className="text-[7px] text-gray-500 leading-snug">
              Configured installations will roll Humanity Loss and deduct Eurodollars automatically.
            </p>

            <div className="relative">
              <input 
                type="text" 
                placeholder="Search cyberware catalog..." 
                value={cyberwareSearch} 
                onChange={(e) => setCyberwareSearch(e.target.value)} 
                className="w-full bg-[#14141a] border border-cyan-500/30 rounded p-1.5 uppercase text-[9px] text-[#00ffff] outline-none font-mono tracking-widest"
              />
            </div>

            <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
              {(CYBERWARE_CATALOG[selectedMappingSlot] || [])
                .filter(item => item.name.toLowerCase().includes(cyberwareSearch.toLowerCase()))
                .map(item => (
                  <div key={item.id} className="p-2 border border-cyan-500/5 bg-[#14141a] hover:border-cyan-500/30 rounded transition flex justify-between items-center text-[9px]">
                    <div className="max-w-[260px]">
                      <span className="text-white font-extrabold block leading-none">{item.name}</span>
                      <span className="text-[7.5px] text-gray-500 block leading-normal mt-0.5">{item.effect}</span>
                      <span className="text-[8px] text-pink-400 font-bold block mt-1">HL Roll: {item.hlRoll} check</span>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-[#00ffff] font-black text-[10px] leading-none mb-1.5">{item.cost} Eb</span>
                      <button 
                        onClick={() => handleInstallCyberwareItem(selectedMappingSlot, item)}
                        className="py-1 px-2.5 bg-cyan-700 hover:bg-cyan-600 hover:text-black text-white font-mono text-[8px] font-black uppercase rounded"
                      >
                        Install
                      </button>
                    </div>
                  </div>
                ))}

              {(!CYBERWARE_CATALOG[selectedMappingSlot] || CYBERWARE_CATALOG[selectedMappingSlot].length === 0) && (
                <div className="text-center text-gray-600 py-12 text-[9px] uppercase">
                  [ Catalog for this neural zone represents vacant. ]
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
