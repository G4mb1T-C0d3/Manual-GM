import React, { useState, useEffect } from 'react';
import { Character, Weapon } from '../types';
import { audio } from '../audio';
import { Cpu, Shuffle, User, Shield, Target, Zap, RotateCcw, AlertCircle, Save, Award, ShoppingCart, Compass, CheckCircle2, Terminal } from 'lucide-react';

const PREGEN_CLASSES = [
  {
    role: 'Solo',
    name: 'Apex (Classic Solo)',
    stats: { int: 6, ref: 8, dex: 8, tech: 5, cool: 6, will: 6, luck: 5, move: 7, body: 7, emp: 6 },
    skills: { perception: 6, concentration: 4, handgun: 6, shoulderArms: 6, brawling: 6, melee: 4, athletics: 4, stealth: 4, persuasion: 2, humanPerception: 2 },
    weapons: [
      { id: 'pre_1', name: 'Militech Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 },
      { id: 'pre_2', name: 'Arasaka Assault Rifle (Autofire)', type: 'rifle', damage: '5d6', ammo: 30, maxAmmo: 30, autofireRating: 3 }
    ],
    spHead: 11,
    spTorso: 11,
    story: 'Urban gladiator for private corporate extraction contracts.'
  },
  {
    role: 'Netrunner',
    name: 'Lucy (Infiltration Deck)',
    stats: { int: 8, ref: 6, dex: 7, tech: 8, cool: 6, will: 5, luck: 6, move: 6, body: 5, emp: 7 },
    skills: { perception: 6, concentration: 2, handgun: 6, shoulderArms: 2, brawling: 2, stealth: 6, basicTech: 6, librarySearch: 6, interface: 6 },
    weapons: [
      { id: 'pre_3', name: 'Militech Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 },
      { id: 'pre_4', name: 'Cyberware Scalp Blade', type: 'melee', damage: '2d6', ammo: 1, maxAmmo: 1 }
    ],
    spHead: 7,
    spTorso: 7,
    story: 'Elite counter-hacker traversing subnet military cores.'
  },
  {
    role: 'Techie',
    name: 'Rebecca (Heavy Gunsmith)',
    stats: { int: 7, ref: 6, dex: 6, tech: 8, cool: 5, will: 6, luck: 6, move: 6, body: 6, emp: 6 },
    skills: { perception: 6, concentration: 2, handgun: 4, brawling: 4, athletics: 4, stealth: 4, basicTech: 6, firstAid: 6 },
    weapons: [
      { id: 'pre_5', name: 'Breach Pump Shotgun', type: 'shotgun', damage: '5d6', ammo: 4, maxAmmo: 4 }
    ],
    spHead: 7,
    spTorso: 11,
    story: 'Improvised welder and custom weapons engineer.'
  },
  {
    role: 'Rockerboy',
    name: 'Johnny (Silverhand Pro)',
    stats: { int: 6, ref: 7, dex: 7, tech: 4, cool: 8, will: 6, luck: 6, move: 7, body: 5, emp: 7 },
    skills: { perception: 4, concentration: 4, handgun: 4, brawling: 4, persuasion: 6, humanPerception: 6, streetwise: 4 },
    weapons: [
      { id: 'pre_6', name: 'Malorian Heavy Handgun', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 }
    ],
    spHead: 7,
    spTorso: 7,
    story: 'Rebellion frontman seeking corporate infrastructure breakdown.'
  },
  {
    role: 'Media',
    name: 'Lyle (Screamsheet Rep)',
    stats: { int: 7, ref: 6, dex: 6, tech: 5, cool: 7, will: 6, luck: 6, move: 6, body: 5, emp: 7 },
    skills: { perception: 6, concentration: 4, handgun: 4, athletics: 4, persuasion: 6, humanPerception: 4, streetwise: 4 },
    weapons: [
      { id: 'pre_7', name: 'Pocket Defense Pistol', type: 'pistol', damage: '2d6', ammo: 10, maxAmmo: 10 }
    ],
    spHead: 7,
    spTorso: 7,
    story: 'Guerrilla reporter hunting Arasaka terminal security codes.'
  },
  {
    role: 'Exec',
    name: 'Warden (Arasaka Suit)',
    stats: { int: 8, ref: 6, dex: 6, tech: 5, cool: 8, will: 6, luck: 5, move: 6, body: 5, emp: 6 },
    skills: { perception: 4, concentration: 4, handgun: 4, persuasion: 6, humanPerception: 6, conversation: 6, trading: 6 },
    weapons: [
      { id: 'pre_8', name: 'Militech Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 }
    ],
    spHead: 11,
    spTorso: 11,
    story: 'Logistical supervisor commanding corporate security guards.'
  },
  {
    role: 'Lawman',
    name: 'Enforcer (Max-Tac Contractor)',
    stats: { int: 6, ref: 8, dex: 7, tech: 5, cool: 6, will: 6, luck: 5, move: 6, body: 7, emp: 5 },
    skills: { perception: 6, concentration: 4, handgun: 6, shoulderArms: 6, brawling: 6, melee: 4, athletics: 4 },
    weapons: [
      { id: 'pre_9', name: 'Max-Tac Assault Rifle', type: 'rifle', damage: '5d6', ammo: 30, maxAmmo: 30, autofireRating: 3 }
    ],
    spHead: 11,
    spTorso: 11,
    story: 'Contracted sector SWAT enforcing urban quarantine boundaries.'
  },
  {
    role: 'Nomad',
    name: 'Chauffeur (Aldecaldo Outrunner)',
    stats: { int: 6, ref: 7, dex: 8, tech: 6, cool: 6, will: 6, luck: 6, move: 7, body: 6, emp: 5 },
    skills: { perception: 6, concentration: 2, handgun: 4, shoulderArms: 6, brawling: 4, athletics: 6, stealth: 4 },
    weapons: [
      { id: 'pre_10', name: 'Scavenged Assault Rifle', type: 'rifle', damage: '5d6', ammo: 30, maxAmmo: 30, autofireRating: 3 }
    ],
    spHead: 7,
    spTorso: 11,
    story: 'Wandering pack vehicle specialist cruising the badlands.'
  },
  {
    role: 'Fixer',
    name: 'Hands (Pleasure Den Broker)',
    stats: { int: 7, ref: 6, dex: 6, tech: 5, cool: 8, will: 5, luck: 6, move: 6, body: 5, emp: 7 },
    skills: { perception: 4, concentration: 4, handgun: 4, persuasion: 6, humanPerception: 6, streetwise: 6, trading: 6 },
    weapons: [
      { id: 'pre_11', name: 'Militech Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 }
    ],
    spHead: 7,
    spTorso: 7,
    story: 'Broker supplying weapons, chrome tech, and custom black chips.'
  },
  {
    role: 'Medtech',
    name: 'Trauma Team Medic',
    stats: { int: 7, ref: 6, dex: 6, tech: 8, cool: 6, will: 6, luck: 5, move: 6, body: 6, emp: 7 },
    skills: { perception: 4, concentration: 4, handgun: 4, brawling: 4, humanPerception: 4, firstAid: 6 },
    weapons: [
      { id: 'pre_12', name: 'Defibrillator Stun Blade', type: 'melee', damage: '2d6', ammo: 1, maxAmmo: 1 },
      { id: 'pre_13', name: 'Trauma SMG Sidearm', type: 'pistol', damage: '2d6', ammo: 20, maxAmmo: 20 }
    ],
    spHead: 11,
    spTorso: 11,
    story: 'Emergency bio-surgeon harvesting backup organ structures.'
  }
];

const LIFEPATH_TABLES = {
  origins: [
    "North American (Night City native or Metroplex survivor)",
    "Asiatic (Arasaka Hub native, Tokyo neon sector, or Neo-China)",
    "European (Sovereign Euro-Theater, Berlin squatter)",
    "African (Somali Trade Zone worker)",
    "Middle Eastern (Gulf oil dome contractor)",
    "South American (Neo-Rio corporate enclave)"
  ],
  personalities: [
    "Shy and secretive, prefers shadows and encrypted logs",
    "Rebellious, antisocial, and eager to throw lead at corporate suits",
    "Arrogant, proud, and aloof, believes style is the ultimate defense",
    "Moody and rash, laughs during heavy shotgun sprays",
    "Friendly and charismatic, uses conversation as a weapon",
    "Cold, analytical, and professional, speaks in terminal code"
  ]
};

const GEAR_SHOPPING_LIST = [
  { id: 'item_pistol', name: "Militech Heavy Pistol", type: "weapon", cost: 100, damage: "3d6", maxAmmo: 8, desc: "Standard heavy sidearm, excellent punch." },
  { id: 'item_shotgun', name: "Breach Pump Shotgun", type: "weapon", cost: 250, damage: "5d6", maxAmmo: 4, desc: "Spreads heavy kinetic pellets, triggers high ablation." },
  { id: 'item_monoblade', name: "Kendachi Monoblade", type: "weapon", cost: 200, damage: "3d6", maxAmmo: 1, desc: "Negates target armor SP under 11 completely!" },
  { id: 'item_rifle', name: "Arasaka Assault Rifle", type: "weapon", cost: 250, damage: "5d6", maxAmmo: 30, desc: "Includes autofire capabilities." },
  { id: 'armor_light', name: "Light Armorjack (SP 11)", type: "armor", cost: 200, sp: 11, desc: "Standard light composite suit. High security, zero dex penalty." },
  { id: 'armor_medium', name: "Medium Armorjack (SP 12)", type: "armor", cost: 250, sp: 12, desc: "Reinforced fiber jacket. Provides higher protection." }
];

interface CharacterCreatorProps {
  onSaveCharacter: (char: Character) => void;
  onClose: () => void;
}

export default function CharacterCreator({ onSaveCharacter, onClose }: CharacterCreatorProps) {
  // Onboarding operators state gate: 'profiling' representing selection step, 'experienced' representing fast pointbuy, 'beginner' representing stepper wizard
  const [operatorGate, setOperatorGate] = useState<'profiling' | 'experienced' | 'beginner'>('profiling');
  const [role, setRole] = useState<'Solo' | 'Netrunner' | 'Techie' | 'Medtech' | 'Rockerboy'>('Solo');
  const [name, setName] = useState<string>('Morgan Cyber');

  // Unified point buys trackers
  const [stats, setStats] = useState({
    int: 6, ref: 8, dex: 8, tech: 5, cool: 6, will: 6, luck: 5, move: 7, body: 7, emp: 6
  });
  const [customSkills, setCustomSkills] = useState<Record<string, number>>({
    perception: 4, concentration: 3, handgun: 5, shoulderArms: 2, brawling: 4, melee: 4, stealth: 4, persuasion: 3, humanPerception: 3
  });

  const STAT_POINTS_LIMIT = 62;
  const currentSpentStatPoints = stats.int + stats.ref + stats.dex + stats.tech + stats.cool + stats.will + stats.luck + stats.move + stats.body + stats.emp;

  // Beginner stepper active index
  const [wizardStep, setWizardStep] = useState<number>(0);

  // Shopper trackers
  const [shoppingCart, setShoppingCart] = useState<string[]>(['item_pistol', 'armor_light']);
  const SHOPPING_BUDGET = 500;

  const currentShoppingCartCost = shoppingCart.reduce((acc, id) => {
    const item = GEAR_SHOPPING_LIST.find(g => g.id === id);
    return acc + (item ? item.cost : 0);
  }, 0);

  const handleStatChange = (key: keyof typeof stats, dir: 'inc' | 'dec') => {
    audio.playUIBeep();
    setStats(prev => {
      const val = prev[key];
      if (dir === 'inc') {
        if (currentSpentStatPoints >= STAT_POINTS_LIMIT || val >= 8) return prev;
        return { ...prev, [key]: val + 1 };
      } else {
        if (val <= 2) return prev;
        return { ...prev, [key]: val - 1 };
      }
    });
  };

  const handleSkillChange = (key: string, dir: 'inc' | 'dec') => {
    audio.playUIBeep();
    setCustomSkills(prev => {
      const val = prev[key] || 0;
      if (dir === 'inc') {
        if (val >= 6) return prev;
        return { ...prev, [key]: val + 1 };
      } else {
        if (val <= 1) return prev;
        return { ...prev, [key]: val - 1 };
      }
    });
  };

  const handleToggleCartItem = (id: string, cost: number) => {
    audio.playUIBeep();
    setShoppingCart(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        if (currentShoppingCartCost + cost > SHOPPING_BUDGET) {
          alert("Ledger budget limit exceeded!");
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  // Immediate Canonical Preset Loader
  const handleLoadPregenClass = (pregen: typeof PREGEN_CLASSES[0]) => {
    audio.playNetSuccess();
    
    const finalPlayer: Character = {
      id: 'player_apex',
      name: pregen.name,
      role: pregen.role,
      isPlayer: true,
      isAlly: true,
      ref: pregen.stats.ref,
      dex: pregen.stats.dex,
      tech: pregen.stats.tech,
      cool: pregen.stats.cool,
      move: pregen.stats.move,
      hp: pregen.stats.body * 5 + 10,
      maxHp: pregen.stats.body * 5 + 10,
      spHead: pregen.spHead,
      spTorso: pregen.spTorso,
      initiative: 0,
      weapons: pregen.weapons.map(w => ({ ...w, id: `wpn_pregen_${Date.now()}_${Math.random()}` })),
      currentWeaponId: `wpn_pregen_${Date.now()}_0`,
      isCovered: false,
      isDead: false,
      criticalInjuries: [],
      stealthState: 'none',
      facedownPenalty: false,
      x: 2,
      y: 2,
      int: pregen.stats.int,
      will: pregen.stats.will,
      luck: pregen.stats.luck,
      body: pregen.stats.body,
      emp: pregen.stats.emp,
      humanity: { current: pregen.stats.emp * 10, max: pregen.stats.emp * 10 },
      skills: pregen.skills,
      eurobucks: 100,
      gear: ['Smart Comm Agent', 'Cyberware Plate'],
      lifepath: {
        background: pregen.story,
        motivation: 'Securing the subnet and survival.',
        personality: 'Bold and professional',
        enemy: 'Maelstrom boosters'
      }
    };

    onSaveCharacter(finalPlayer);
  };

  // Convert settings and finalize character builder
  const handleFinalizeBuild = () => {
    audio.playAlert();
    const calculatedHp = (stats.body + stats.will) * 3 + 10;
    const maxHL = stats.emp * 10;

    let weaponsAllocated: Weapon[] = [];
    let headSp = 11;
    let torsoSp = 11;

    shoppingCart.forEach(id => {
      const item = GEAR_SHOPPING_LIST.find(g => g.id === id);
      if (!item) return;
      if (item.type === 'weapon') {
        weaponsAllocated.push({
          id: `wpn_built_${Date.now()}_${Math.random()}`,
          name: item.name,
          type: item.id === 'item_monoblade' ? 'melee' : item.id === 'item_pistol' ? 'pistol' : item.id === 'item_shotgun' ? 'shotgun' : 'rifle',
          damage: item.damage || '3d6',
          ammo: item.maxAmmo || 8,
          maxAmmo: item.maxAmmo || 8,
          autofireRating: item.id === 'item_rifle' ? 3 : undefined
        });
      } else if (item.type === 'armor') {
        headSp = item.sp || 11;
        torsoSp = item.sp || 11;
      }
    });

    if (weaponsAllocated.length === 0) {
      weaponsAllocated.push({ id: 'wpn_pistol', name: 'Militech Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 });
    }

    const finalPlayer: Character = {
      id: 'player_apex',
      name: `${name} (${role})`,
      role: role,
      isPlayer: true,
      isAlly: true,
      ref: stats.ref,
      dex: stats.dex,
      tech: stats.tech,
      cool: stats.cool,
      move: stats.move,
      hp: calculatedHp,
      maxHp: calculatedHp,
      spHead: headSp,
      spTorso: torsoSp,
      initiative: 0,
      weapons: weaponsAllocated,
      currentWeaponId: weaponsAllocated[0].id,
      isCovered: false,
      isDead: false,
      criticalInjuries: [],
      stealthState: 'none',
      facedownPenalty: false,
      x: 3,
      y: 3,
      int: stats.int,
      will: stats.will,
      luck: stats.luck,
      body: stats.body,
      emp: stats.emp,
      humanity: { current: maxHL, max: maxHL },
      skills: customSkills,
      eurobucks: Math.max(10, 500 - currentShoppingCartCost),
      gear: ['Cyberdeck Zetatech', 'Holo Projector'],
      lifepath: {
        background: 'Born in Night City central slums under Scavenger blockades.',
        motivation: 'Redeeming local district turfs.',
        personality: 'Moody and rash',
        enemy: 'Arasaka Corporate Security enforcer'
      }
    };

    onSaveCharacter(finalPlayer);
  };

  // Render Onboarding Selection Step
  if (operatorGate === 'profiling') {
    return (
      <div className="fixed inset-0 bg-[#05050b]/98 z-[12000] flex items-center justify-center p-4 overflow-y-auto font-mono text-xs shadow-2xl crt-overlay select-none">
        <div className="w-full max-w-2xl border-2 border-[#ff00ff] bg-[#0c0c16]/95 rounded-lg p-6 relative overflow-hidden shadow-[0_0_24px_rgba(255,0,255,0.2)] space-y-6 text-center">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#ff00ff] animate-pulse"></div>

          <div>
            <span className="text-[9px] text-[#ff00ff] font-extrabold tracking-widest block uppercase">// SYSTEM CONFIGURATION PROTOCOL //</span>
            <h2 className="text-xl font-black text-white mt-1 uppercase tracking-widest text-glow-magenta">
              SYSTEM ORIENTATION: DETERMINE OPERATIONAL CAPACITY
            </h2>
            <div className="w-16 h-[1.5px] bg-[#ff00ff] mx-auto mt-2"></div>
          </div>

          <p className="text-gray-400 text-[10px] leading-relaxed max-w-md mx-auto">
            "ARE YOU AN EXPERIENCED CYBERPUNK RED OPERATIVE?" Select registration mode to align neural processors for the tracking grids.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            {/* Action 1: Fast-Track (Point Buy) */}
            <button
              onClick={() => {
                audio.playNetSuccess();
                setOperatorGate('experienced');
              }}
              className="p-5 border border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-500/10 hover:border-cyan-400 rounded-lg text-left transition-all hover:scale-103 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-black text-cyan-400 tracking-wider uppercase block">✔️ FAST-TRACK PROFILES</span>
                <span className="text-sm font-extrabold text-white mt-1 block uppercase">EXPERIENCED MODE</span>
              </div>
              <p className="text-[9.5px] text-gray-500 leading-snug mt-3">
                Ditch backstory wizards and slow stepper pages! Slashes UI immediately into a single condensed पॉइंट-बाय buy grid to click and finalize in under 30 seconds!
              </p>
            </button>

            {/* Action 2: Granular registration stepper */}
            <button
              onClick={() => {
                audio.playUIBeep();
                setOperatorGate('beginner');
                setWizardStep(0);
              }}
              className="p-5 border border-[#ff00ff]/40 bg-pink-950/10 hover:bg-pink-500/10 hover:border-pink-400 rounded-lg text-left transition-all hover:scale-103 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-black text-pink-400 tracking-wider uppercase block">🎓 GRANULAR ASSIGNMENT</span>
                <span className="text-sm font-extrabold text-white mt-1 block uppercase">BEGINNER NARRATIVE</span>
              </div>
              <p className="text-[9.5px] text-gray-500 leading-snug mt-3">
                Provides modular, progressive wizard dots guiding you systematically through name/role selection, lifepath generators, points stats configurations, and gear.
              </p>
            </button>
          </div>

          {/* Canonical PREGEN Selector matrix options */}
          <div className="border-t border-gray-800 pt-5 space-y-3">
            <span className="text-[9.5px] text-[#ff00ff] font-bold block uppercase tracking-widest">// CANONICAL QUICK-LOAD REGISTERED AGENTS //</span>
            
            <p className="text-[9px] text-gray-500 max-w-md mx-auto">
              Skip creation entirely! Instantly mount an official core rules preset sheet directly onto the tracking tactical boards:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-2xl mx-auto pt-1">
              {PREGEN_CLASSES.map(p => (
                <button
                  key={p.role}
                  onClick={() => handleLoadPregenClass(p)}
                  className="p-2 border border-zinc-800 bg-black/60 hover:bg-emerald-900/10 hover:border-emerald-500 text-zinc-300 hover:text-white rounded text-[8px] font-mono uppercase tracking-tight transition cursor-pointer text-center flex flex-col items-center justify-center leading-normal"
                >
                  <span className="font-extrabold text-[#00ffff]">{p.role}</span>
                  <span className="text-[6.5px] text-gray-550 truncate mt-0.5 max-w-[64px] block">{p.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onClose}
              className="text-[10px] text-gray-550 uppercase tracking-widest hover:text-white cursor-pointer font-bold block mx-auto underline"
            >
              Cancel Orientation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // EXPERIENCED FAST-TRACK DASHBOARD (Point Buy)
  if (operatorGate === 'experienced') {
    return (
      <div className="fixed inset-0 bg-[#06060c]/98 z-[12000] flex items-center justify-center p-4 overflow-y-auto font-mono text-xs crt-overlay select-none">
        <div className="w-full max-w-4xl border-2 border-cyan-400 bg-[#0d0d1a]/95 rounded-lg p-5 relative overflow-hidden shadow-[0_0_24px_rgba(34,211,238,0.25)] space-y-4">
          
          <div className="flex justify-between items-center border-b border-gray-800 pb-2 flex-wrap gap-2">
            <div>
              <span className="text-[8px] text-cyan-400 uppercase font-black tracking-widest block">// OPERATIVE PROTOCOL: EXPERIENCED POINT-BUY //</span>
              <h2 className="text-base font-black text-white mt-0.5">FAST-TRACK SINGLE-SCREEN CUSTOMIZATION</h2>
            </div>
            
            <button
              onClick={() => setOperatorGate('profiling')}
              className="text-[9px] border border-[#ff00ff]/30 text-[#ff00ff] px-2.5 py-1 rounded hover:bg-[#ff00ff]/5 cursor-pointer uppercase font-black"
            >
              Back to orient
            </button>
          </div>

          {/* Three point counters in a single row */}
          <div className="bg-black/60 border border-zinc-850 p-3 rounded grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center font-bold">
            <div className="bg-cyan-950/15 border border-cyan-500/20 py-2 rounded">
              <span className="text-gray-500 block text-[8px] uppercase tracking-wider">Spent Stat Points</span>
              <span className="text-cyan-400 text-lg font-black tracking-widest">{currentSpentStatPoints} / {STAT_POINTS_LIMIT} PTS</span>
            </div>
            <div className="bg-[#ff00ff]/5 border border-[#ff00ff]/20 py-2 rounded">
              <span className="text-gray-500 block text-[8px] uppercase tracking-wider">Designated Character Role</span>
              <select
                value={role}
                onChange={(e) => { audio.playUIBeep(); setRole(e.target.value as any); }}
                className="bg-black text-pink-400 border border-pink-500/30 rounded font-black font-mono p-1 text-[10px] uppercase outline-none mt-1"
              >
                <option value="Solo">Solo</option>
                <option value="Netrunner">Netrunner</option>
                <option value="Techie">Techie</option>
                <option value="Medtech">Medtech</option>
                <option value="Rockerboy">Rockerboy</option>
              </select>
            </div>
            <div className="bg-yellow-500/5 border border-yellow-500/20 py-2 rounded">
              <span className="text-gray-500 block text-[8px] uppercase tracking-wider">Starting Cart Budget</span>
              <span className="text-yellow-400 text-lg font-black tracking-widest">{currentShoppingCartCost} / {SHOPPING_BUDGET} Eb</span>
            </div>
          </div>

          {/* Main fast customize area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            
            {/* Grid 1: 10 Core Stats allocation */}
            <div className="bg-[#05050f]/80 border border-zinc-805 p-3 rounded space-y-2.5">
              <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest border-b border-cyan-950 block pb-1">// ALLOCATE CORE STATS</span>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {(Object.keys(stats) as Array<keyof typeof stats>).map(key => (
                  <div key={key} className="flex justify-between items-center bg-black/40 p-1.5 rounded border border-white/5">
                    <span className="text-[10px] font-black uppercase text-gray-300">{key}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStatChange(key, 'dec')}
                        className="w-5 h-5 bg-black hover:border-cyan-400 border border-zinc-700 text-center font-bold text-[10px] tracking-widest"
                      >
                        -
                      </button>
                      <span className="text-white font-extrabold text-[11px] w-6 text-center">{stats[key]}</span>
                      <button
                        onClick={() => handleStatChange(key, 'inc')}
                        className="w-5 h-5 bg-black hover:border-cyan-400 border border-zinc-700 text-center font-bold text-[10px] tracking-widest"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid 2: Skills allocations buy */}
            <div className="bg-[#05050f]/80 border border-zinc-805 p-3 rounded space-y-2.5">
              <span className="text-[10px] text-pink-400 font-extrabold uppercase tracking-widest border-b border-pink-950 block pb-1">// SKILLS INTENSITY</span>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {Object.keys(customSkills).map(key => (
                  <div key={key} className="flex justify-between items-center bg-black/40 p-1.5 rounded border border-white/5">
                    <span className="text-[9.5px] font-black uppercase text-gray-300 truncate max-w-[100px]">{key}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSkillChange(key, 'dec')}
                        className="w-5 h-5 bg-black hover:border-pink-400 border border-zinc-700 text-center font-bold text-[10px]"
                      >
                        -
                      </button>
                      <span className="text-white font-extrabold text-[10px] w-6 text-center">{customSkills[key]}</span>
                      <button
                        onClick={() => handleSkillChange(key, 'inc')}
                        className="w-5 h-5 bg-black hover:border-pink-400 border border-zinc-700 text-center font-bold text-[10px]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid 3: Instant Gear Shopping ledger */}
            <div className="bg-[#05050f]/80 border border-zinc-805 p-3 rounded space-y-2.5">
              <span className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-widest border-b border-yellow-950 block pb-1">// GEAR SHOPPING SHOP</span>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {GEAR_SHOPPING_LIST.map(g => {
                  const isBought = shoppingCart.includes(g.id);
                  return (
                    <div
                      key={g.id}
                      onClick={() => handleToggleCartItem(g.id, g.cost)}
                      className={`p-2 border rounded transition-all cursor-pointer flex flex-col justify-between ${
                        isBought
                          ? 'border-yellow-400 bg-yellow-500/10 text-white'
                          : 'border-zinc-800 bg-black/40 text-gray-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-[9px] uppercase">{g.name}</span>
                        <span className="text-[8.5px] text-glow-yellow">{g.cost} Eb</span>
                      </div>
                      <p className="text-[7.5px] text-gray-500 mt-1 truncate">{g.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="flex gap-3 justify-end items-center border-t border-gray-800 pt-3">
            <label className="flex items-center gap-2 font-black text-gray-300">
              <span>Agent designation name:</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-black border border-cyan-400/30 text-cyan-400 px-3 py-1 text-[11px] rounded outline-none font-bold"
              />
            </label>

            <button
              onClick={handleFinalizeBuild}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-black uppercase text-[11px] rounded flex items-center gap-1.5 border border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)] cursor-pointer"
            >
              <Save className="w-4 h-4 animate-pulse" /> FINALIZE AGENT
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modular Stepper Wizard (Beginner Guided Narrative step mode)
  return (
    <div className="fixed inset-0 bg-[#06060c]/98 z-[12000] flex items-center justify-center p-4 overflow-y-auto font-mono text-xs crt-overlay select-none">
      <div className="w-full max-w-2xl border-2 border-indigo-500 bg-[#0c0c16]/95 rounded-lg p-5 relative overflow-hidden shadow-[0_0_24px_rgba(99,102,241,0.25)] space-y-4">
        <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500"></div>

        {/* Header stepper dots */}
        <div className="flex justify-between items-center border-b border-gray-850 pb-2">
          <div>
            <span className="text-[8px] text-indigo-400 uppercase font-black tracking-widest block">// STEPPER NARRATIVE ASSIGNMENT //</span>
            <h2 className="text-sm font-black text-white mt-0.5 uppercase tracking-wide">
              {wizardStep === 0 && 'STEP 1: DESIGNATE BIOLOGICAL DATA'}
              {wizardStep === 1 && 'STEP 2: CONFIRM STATS MATRIX'}
              {wizardStep === 2 && 'STEP 3: CHROME GEAR SHOPPING'}
            </h2>
          </div>
          
          {/* Guided progress dots step indicators */}
          <div className="flex gap-1">
            {[0, 1, 2].map(idx => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all duration-150 ${
                  wizardStep === idx ? 'bg-indigo-500 w-4 shadow-[0_0_6px_rgba(99,102,241,0.8)]' : 'bg-zinc-800'
                }`}
              ></div>
            ))}
          </div>
        </div>

        {/* STEP 1: Name and Role selection */}
        {wizardStep === 0 && (
          <div className="space-y-4 py-2">
            <p className="text-gray-400 leading-relaxed text-[10px]">
              Complete your biological signature registration. Character role designates starting weapon allocations and active abilities.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1 block">
                <span className="text-gray-500 block uppercase font-black text-[9px]">Challenger agent name:</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black border border-indigo-500/30 text-white p-2 text-xs rounded outline-none font-bold"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-gray-500 block uppercase font-black text-[9px]">Cyberpunk Core Class Role:</span>
                <select
                  value={role}
                  onChange={(e) => { audio.playUIBeep(); setRole(e.target.value as any); }}
                  className="w-full bg-black border border-indigo-500/30 text-indigo-400 p-2 text-xs rounded font-black uppercase outline-none"
                >
                  <option value="Solo">Solo</option>
                  <option value="Netrunner">Netrunner</option>
                  <option value="Techie">Techie</option>
                  <option value="Medtech">Medtech</option>
                  <option value="Rockerboy">Rockerboy</option>
                </select>
              </label>
            </div>

            <div className="bg-black/40 border border-zinc-800 p-3 rounded text-zinc-400 flex items-center gap-3">
              <AlertCircle className="text-indigo-400 w-5 h-5 flex-shrink-0" />
              <p className="text-[9.5px] leading-snug">
                {role === 'Netrunner' && "NETRUNNER: Mounts virtual subnets and custom viruses. Extremely high hacking capabilities."}
                {role === 'Solo' && "SOLO: Lethal master of raw weaponry checks. High combat speed, reflexes, and ablate protection."}
                {role === 'Techie' && "TECHIE: Custom equipment modifications and item inventions. Masters basicTech."}
                {role === 'Medtech' && "MEDTECH: Restores biological systems and coordinates tissue medical operations."}
                {role === 'Rockerboy' && "ROCKERBOY: High social charisma. Influences crowds to direct street loyalties."}
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Stats matrix point buy allocator */}
        {wizardStep === 1 && (
          <div className="space-y-4 py-1">
            <div className="flex justify-between items-center bg-black/40 border border-zinc-800 p-2 rounded">
              <span className="text-gray-400 text-[10px]">Spent Stats: <span className="font-extrabold text-white">{currentSpentStatPoints} / {STAT_POINTS_LIMIT} PTS</span></span>
              <span className="text-[9px] text-[#ff00ff] font-bold uppercase tracking-widest">MIN: 2 | MAX: 8 LIMITS</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pb-1">
              {(Object.keys(stats) as Array<keyof typeof stats>).map(key => (
                <div key={key} className="p-2 border border-zinc-850 bg-black/40 rounded flex flex-col items-center justify-center text-center space-y-1">
                  <span className="text-[9px] font-black uppercase text-gray-550 block">{key}</span>
                  <span className="text-white font-extrabold text-sm block">{stats[key]}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStatChange(key, 'dec')}
                      className="w-5 h-5 bg-black hover:border-indigo-400 border border-zinc-700 text-center font-bold"
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleStatChange(key, 'inc')}
                      className="w-5 h-5 bg-black hover:border-indigo-400 border border-zinc-700 text-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Gear Shopping */}
        {wizardStep === 2 && (
          <div className="space-y-4 py-1">
            <div className="flex justify-between items-center bg-black/40 border border-zinc-800 p-2 rounded">
              <span className="text-gray-400 text-[10px]">Shopping Budget: <span className="font-extrabold text-white">{currentShoppingCartCost} / {SHOPPING_BUDGET} Eb</span></span>
              <span className="text-[8.5px] text-yellow-400 font-black uppercase">REMAINING: {SHOPPING_BUDGET - currentShoppingCartCost} Eb</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
              {GEAR_SHOPPING_LIST.map(g => {
                const bought = shoppingCart.includes(g.id);
                return (
                  <div
                    key={g.id}
                    onClick={() => handleToggleCartItem(g.id, g.cost)}
                    className={`p-2 border rounded transition-all cursor-pointer flex justify-between items-center ${
                      bought ? 'border-yellow-400 bg-yellow-500/10 text-white' : 'border-zinc-800 bg-black/40 text-gray-400 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <span className="text-[9.5px] font-black uppercase block leading-none">{g.name}</span>
                      <span className="text-[7.5px] text-gray-500 font-mono mt-1 block truncate max-w-[170px]">{g.desc}</span>
                    </div>
                    <span className="text-[9px] font-mono text-yellow-500 font-black">{g.cost} Eb</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation bottom control keys footer banner */}
        <div className="flex justify-between items-center border-t border-gray-850 pt-3">
          <button
            onClick={() => {
              audio.playUIBeep();
              if (wizardStep === 0) {
                setOperatorGate('profiling');
              } else {
                setWizardStep(prev => prev - 1);
              }
            }}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-white font-mono uppercase text-[10px] rounded cursor-pointer font-bold"
          >
            ← PREVIOUS
          </button>

          {wizardStep < 2 ? (
            <button
              onClick={() => {
                audio.playUIBeep();
                setWizardStep(prev => prev + 1);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-mono uppercase text-[10px] rounded cursor-pointer font-bold"
            >
              NEXT STEP →
            </button>
          ) : (
            <button
              onClick={handleFinalizeBuild}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono uppercase text-[10px] rounded cursor-pointer font-bold border border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)] flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" /> FINALIZE CHAR
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
