import React, { useState, useEffect } from 'react';
import { Character, Weapon } from '../types';
import { audio } from '../audio';
import { Cpu, Shuffle, User, Shield, Target, Zap, RotateCcw, AlertCircle, Save, Award, ShoppingCart } from 'lucide-react';

const LIFEPATH_TABLES = {
  origins: [
    "North American (Night City native or Metroplex survivor)",
    "Asiatic (Arasaka Hub native, Tokyo neon sector, or Neo-China)",
    "European (Sovereign Euro-Theater, high orbital habit, or Berlin squatter)",
    "African (Neo-Zaire high-speed rail corridor or Somali Trade Zone)",
    "Middle Eastern (Gulf oil dome, Cairo merchant, or Jerusalem DMZ)",
    "South American (Neo-Rio corporate enclave or Amazonian bio-harvester)"
  ],
  personalities: [
    "Shy and secretive, prefers shadows and encrypted logs",
    "Rebellious, antisocial, and violent, eager to throw lead at corporate suits",
    "Arrogant, proud, and aloof, believes style is the ultimate defense",
    "Moody, rash, and headstrong, laughs during heavy shotguns sprays",
    "Friendly, charismatic, and outgoing, uses conversation as a weapon",
    "Cold, analytical, and professional, speaks in code and handles tasks"
  ],
  clothingStyles: [
    "Generic Chic (practical standard day-to-day fashion)",
    "Bohemian (flashy retro, artistic, non-conformist rebel threads)",
    "Urban Flash (fluorescent street armor, glowing laces, chrome accents)",
    "Nomad Leathers (protective survival hide, dust filters, and bandoliers)",
    "High Chrome (completely reflective mirror outerwear, liquid-metal shine)",
    "Corporate Clean (monochrome pressed suits, subtle carbonweave fibers)"
  ],
  gimmicks: [
    "Glowing bio-luminescent fiber tattoos on forearms",
    "Surgically implanted mirrorshades reflecting magenta neon",
    "Strange, spiked fiber-optic synthetic hair color",
    "Exposed custom processor slot on the neck template",
    "Body modification piercings radiating electromagnetic feedback",
    "Deep signature kinetic scars from monoblade wire slices"
  ],
  valuedPersons: [
    "A parent who vanished in a corporate reclamation strike",
    "A sibling who became a booster gang lieutenant in the Combat Zone",
    "A former lover who double-crossed you for 500 Eurobucks",
    "A street Fixer who taught you how to read encrypted grid data",
    "An old military mentor who handed you your first Militech pistol",
    "Yourself - nobody else in Night City is worth risking chrome for"
  ],
  possessions: [
    "A tuned, high-precision custom heavy pistol cell",
    "A rare, pre-collapse antique mechanical wrist watch",
    "A custom-coded micro audio recording chip with blackmail databases",
    "A worn, toy holographic projector from childhood days",
    "An iconic vintage leather jacket with glowing collar rails",
    "A private digital diary containing Arasaka terminal security codes"
  ],
  families: [
    "Corporate Executives (ruthless politicians living in guarded enclaves)",
    "Combat Zone Refugees (clinging to survival in abandoned concrete structures)",
    "Arasaka Training Academy (groomed from youth to protect private asset banks)",
    "Nomad Pack Wanderers (traveling trade highways in heavy land-iron convoys)",
    "Street Gang Royalty (heirs to local turf, black market cargo, and block defense)",
    "High Orbit Space Laborers (spent youth in low-gravity weld stations)"
  ],
  environments: [
    "A secure high-end corporate arcology protected by automatic turrets",
    "A cramped, run-down techno suburban squat with shared grid lines",
    "The lawless, burning Combat Zone streets",
    "Inside a dusty, loud Nomad vehicle convoy cruising the rust deserts",
    "A rusty, claustrophobic orbital station under zero-g operations",
    "A hyper-populated, neon street market alleyway in central Night City"
  ],
  disasters: [
    "Incarcerated in a digital Arasaka black-site block prison for 1 standard year",
    "Lost your biological sibling to a fast-moving corporate cyberware harvesting gang",
    "Double crossed by a street Fixer, leaving you with heavy hit bounties",
    "Accidentally fried a local subnet database, causing collateral cyberdeck burns",
    "Suffered neural feedback overload, leaving gaps in your motor recall",
    "Your whole combat crew was flatlined in a scrap sector raid"
  ],
  ambitions: [
    "Exacting extreme physical vengeance on the corporation that ruined your family",
    "Acquiring 50,000 Eurobucks to buy permanent passport rights to Elysium High Orbit",
    "Becoming a legendary Solo featured on the frontpage of screaming news feeds",
    "Building an armored street sanctuary sheltering cybernetic outcasts",
    "Dethroning the local district kingpins and establishing a sovereign tech turf",
    "Wiping your criminal database clean and assuming a clean Corpo identity"
  ]
};

const ROLE_STATS_TEMPLATES = {
  Solo: { int: 6, ref: 8, dex: 8, tech: 5, cool: 6, will: 6, luck: 5, move: 7, body: 7, emp: 6 },
  Netrunner: { int: 8, ref: 6, dex: 7, tech: 8, cool: 6, will: 5, luck: 6, move: 6, body: 5, emp: 7 },
  Techie: { int: 7, ref: 6, dex: 6, tech: 8, cool: 5, will: 6, luck: 6, move: 6, body: 6, emp: 6 },
  Medtech: { int: 7, ref: 6, dex: 6, tech: 8, cool: 6, will: 6, luck: 5, move: 6, body: 6, emp: 7 },
  Rockerboy: { int: 6, ref: 7, dex: 7, tech: 4, cool: 8, will: 6, luck: 6, move: 7, body: 5, emp: 7 }
};

// Edgerunner 6 tables per role (mapped via 1d10 roll)
const EDGERUNNER_STAT_ROLLS = {
  Solo: [
    { int: 5, ref: 8, dex: 7, tech: 4, cool: 6, will: 5, luck: 5, move: 6, body: 6, emp: 5 },
    { int: 6, ref: 8, dex: 7, tech: 4, cool: 6, will: 6, luck: 6, move: 5, body: 6, emp: 6 },
    { int: 6, ref: 8, dex: 8, tech: 5, cool: 6, will: 6, luck: 5, move: 7, body: 7, emp: 6 },
    { int: 7, ref: 7, dex: 8, tech: 5, cool: 7, will: 6, luck: 6, move: 6, body: 6, emp: 5 },
    { int: 5, ref: 8, dex: 8, tech: 6, cool: 5, will: 7, luck: 5, move: 6, body: 7, emp: 6 },
    { int: 6, ref: 8, dex: 8, tech: 5, cool: 7, will: 6, luck: 7, move: 6, body: 6, emp: 6 }
  ],
  Netrunner: [
    { int: 8, ref: 6, dex: 7, tech: 8, cool: 6, will: 5, luck: 6, move: 6, body: 5, emp: 7 },
    { int: 7, ref: 6, dex: 7, tech: 8, cool: 6, will: 6, luck: 5, move: 6, body: 6, emp: 7 },
    { int: 8, ref: 6, dex: 6, tech: 7, cool: 6, will: 6, luck: 6, move: 6, body: 5, emp: 8 },
    { int: 8, ref: 7, dex: 6, tech: 8, cool: 5, will: 5, luck: 7, move: 5, body: 6, emp: 7 },
    { int: 7, ref: 6, dex: 7, tech: 8, cool: 7, will: 5, luck: 6, move: 6, body: 5, emp: 7 },
    { int: 8, ref: 6, dex: 8, tech: 8, cool: 5, will: 6, luck: 5, move: 6, body: 6, emp: 6 }
  ],
  Techie: [
    { int: 7, ref: 6, dex: 6, tech: 8, cool: 5, will: 6, luck: 6, move: 6, body: 6, emp: 6 },
    { int: 7, ref: 6, dex: 7, tech: 8, cool: 6, will: 5, luck: 5, move: 6, body: 6, emp: 6 },
    { int: 8, ref: 5, dex: 6, tech: 8, cool: 5, will: 6, luck: 6, move: 5, body: 7, emp: 6 },
    { int: 6, ref: 7, dex: 6, tech: 8, cool: 6, will: 6, luck: 6, move: 6, body: 5, emp: 7 },
    { int: 7, ref: 6, dex: 6, tech: 8, cool: 5, will: 7, luck: 5, move: 6, body: 6, emp: 7 },
    { int: 8, ref: 6, dex: 6, tech: 8, cool: 6, will: 6, luck: 6, move: 6, body: 5, emp: 5 }
  ],
  Medtech: [
    { int: 7, ref: 6, dex: 6, tech: 8, cool: 6, will: 6, luck: 5, move: 6, body: 6, emp: 7 },
    { int: 8, ref: 6, dex: 5, tech: 8, cool: 5, will: 6, luck: 6, move: 6, body: 6, emp: 7 },
    { int: 7, ref: 5, dex: 6, tech: 8, cool: 6, will: 6, luck: 6, move: 5, body: 7, emp: 7 },
    { int: 7, ref: 7, dex: 6, tech: 8, cool: 6, will: 5, luck: 5, move: 6, body: 6, emp: 8 },
    { int: 8, ref: 6, dex: 6, tech: 7, cool: 6, will: 6, luck: 6, move: 6, body: 5, emp: 7 },
    { int: 6, ref: 6, dex: 7, tech: 8, cool: 5, will: 7, luck: 5, move: 6, body: 6, emp: 7 }
  ],
  Rockerboy: [
    { int: 6, ref: 7, dex: 7, tech: 4, cool: 8, will: 6, luck: 6, move: 7, body: 5, emp: 7 },
    { int: 5, ref: 7, dex: 7, tech: 5, cool: 8, will: 6, luck: 5, move: 7, body: 6, emp: 7 },
    { int: 6, ref: 6, dex: 8, tech: 4, cool: 8, will: 5, luck: 6, move: 6, body: 5, emp: 8 },
    { int: 6, ref: 7, dex: 6, tech: 5, cool: 7, will: 6, luck: 7, move: 7, body: 6, emp: 7 },
    { int: 7, ref: 6, dex: 7, tech: 4, cool: 8, will: 6, luck: 5, move: 6, body: 5, emp: 8 },
    { int: 6, ref: 7, dex: 7, tech: 5, cool: 8, will: 6, luck: 6, move: 6, body: 6, emp: 6 }
  ]
};

const ROLE_SKILLS_TEMPLATES = {
Solo: {
    perception: 6, concentration: 2, handgun: 6, shoulderArms: 6, brawling: 6,
    melee: 6, autofire: 4, heavyWeapons: 4, athletics: 6, resistTorture: 6,
    stealth: 6, endurance: 4, persuasion: 2, humanPerception: 2, conversation: 2,
    streetwise: 4, trading: 2, basicTech: 2, librarySearch: 2, firstAid: 2
  },
  Netrunner: {
    perception: 6, concentration: 2, handgun: 6, shoulderArms: 2, brawling: 2,
    melee: 2, autofire: 2, heavyWeapons: 2, athletics: 2, resistTorture: 4,
    stealth: 6, endurance: 2, persuasion: 2, humanPerception: 2, conversation: 2,
    streetwise: 2, trading: 2, basicTech: 6, librarySearch: 6, interface: 6
  },
  Techie: {
    perception: 6, concentration: 2, handgun: 4, shoulderArms: 2, brawling: 4,
    melee: 4, autofire: 2, heavyWeapons: 2, athletics: 4, resistTorture: 4,
    stealth: 4, endurance: 2, persuasion: 2, humanPerception: 2, conversation: 2,
    streetwise: 2, trading: 4, basicTech: 6, librarySearch: 2, firstAid: 6
  },
  Medtech: {
    perception: 4, concentration: 4, handgun: 4, shoulderArms: 2, brawling: 2,
    melee: 2, autofire: 2, heavyWeapons: 2, athletics: 4, resistTorture: 4,
    stealth: 2, endurance: 4, persuasion: 2, humanPerception: 4, conversation: 4,
    streetwise: 2, trading: 2, basicTech: 2, librarySearch: 4, firstAid: 6
  },
  Rockerboy: {
    perception: 4, concentration: 4, handgun: 4, shoulderArms: 2, brawling: 4,
    melee: 4, autofire: 2, heavyWeapons: 2, athletics: 4, resistTorture: 2,
    stealth: 4, endurance: 2, persuasion: 6, humanPerception: 6, conversation: 4,
    streetwise: 4, trading: 2, basicTech: 2, librarySearch: 2, firstAid: 2
  }
};

const ROLE_SPECIFIC_LIFEPATH_TABLES = {
  Solo: {
    workspace: [
      "Freelance Street Gladiator (gigs from fixers, bounty sweeps)",
      "Corporate Tactical Black-Ops Security Specialist (Arasaka, Militech)",
      "NCPD Special Riot SWAT Division (private military contractor)",
      "Organized Crime Combat Muscle (Maelstrom, Tyger Claws, Valentinos enforcer)",
      "Personal Bodyguard to VIP Execs and Media Idols",
      "Sovereign Combat Mech Pilot under South-Am Border Patrol"
    ],
    nemesis: [
      "A bitter companion Solo who claims you sabotaged their rifle range",
      "A Corporate Sniper whose tracking drone target you shot down",
      "An NCPD Sergeant seeking street reputation on your arrest sheet",
      "The leader of the Maelstrom scav pack who harvested your cohort",
      "Your former tactical training sergeant turned cyberpsychotic rogue",
      "An anonymous AI agent placing hits on active Solo registers"
    ],
    weaponChoice: [
      "Militech Crusader Shotgun",
      "Arasaka Heavy Assault Rifle (Autofire integrated)",
      "Carbon Fiber Cyberware-Wolvers",
      "Monoblade Heavy Wakizashi Sword",
      "Tsunami Arms Sniper Rail",
      "Budget Arms Carnage shotgun (extreme force ablation)"
    ]
  },
  Netrunner: {
    deckStyle: [
      "Custom-wired glass cyberdeck radiating pink plasma glow",
      "Stolen Arasaka military-grade heavy server cell deck",
      "Nomad scavenger scrap deck packed with secondary fuses",
      "Miniaturized wrist-wrap cyber-plate with physical tracking cables",
      "Brain-implanted internal neural processor with direct optic feeds",
      "Standard Zetatech civilian core modified with rapid cooling copper grids"
    ],
    clients: [
      "Underground radical media looking to leak corporate biohazard files",
      "Rival corporate agents executing espionage saboteur protocols",
      "Nomad scouts looking to disable highway automated gun towers",
      "Shadow rogue Netrunner cults researching old Net coordinate nodes",
      "A mysterious, self-aware rogue AI operating from inside Arasaka's main servers",
      "Street Fixers coordinating rapid credit-card database sweeps"
    ],
    rival: [
      "An elite Corporate Counter-Hacker with a custom Brain-ICE script",
      "Your former Net hacking teacher who sold out to NetWatch",
      "An ambitious junior runner looking to claim your subnet keys",
      "A digital black market broker who wants your custom code templates",
      "A cyber-scav looking to physically rip out your neural processor plug",
      "A ghost entity trapped in old subnet subroutines"
    ]
  }
};

const GEAR_SHOPPING_LIST = [
  { id: 'item_pistol', name: "Militech Heavy Pistol", type: "weapon", cost: 100, damage: "3d6", maxAmmo: 8, desc: "Standard heavy sidearm, excellent punch." },
  { id: 'item_shotgun', name: "Breach Pump Shotgun", type: "weapon", cost: 250, damage: "5d6", maxAmmo: 4, desc: "Spreads heavy kinetic pellets, triggers high ablation." },
  { id: 'item_monoblade', name: "Kendachi Monoblade", type: "weapon", cost: 200, damage: "3d6", maxAmmo: 1, desc: "Negates target armor SP under 11 completely!" },
  { id: 'item_rifle', name: "Arasaka Assault Rifle", type: "weapon", cost: 250, damage: "5d6", maxAmmo: 30, desc: "Includes autofire capabilities (double skill cost)." },
  { id: 'armor_light', name: "Light Armorjack (Head/Torso SP 11)", type: "armor", cost: 200, sp: 11, desc: "Standard light composite suite. High security, zero dex penalty." },
  { id: 'armor_medium', name: "Medium Armorjack (Head/Torso SP 12)", type: "armor", cost: 250, sp: 12, desc: "Reinforced fiber jacket. Provides higher protection." },
  { id: 'util_deck', name: "Zetatech Cyberdeck Core", type: "cyberware", cost: 100, desc: "Enables Netrunning grid interface. Core module." },
  { id: 'util_agent', name: "Corpo Smart Agent (Comm)", type: "cyberware", cost: 50, desc: "High-end smartphone. Decrypts signal feeds." },
  { id: 'util_epinephrine', name: "Combat Epinephrine Booster", type: "cyberware", cost: 100, desc: "Speed injectors +1 REF for 3 round limits." }
];

interface CharacterCreatorProps {
  onSaveCharacter: (char: Character) => void;
  onClose: () => void;
}

export default function CharacterCreator({ onSaveCharacter, onClose }: CharacterCreatorProps) {
  const [method, setMethod] = useState<'streetrat' | 'edgerunner' | 'complete'>('streetrat');
  const [role, setRole] = useState<'Solo' | 'Netrunner' | 'Techie' | 'Medtech' | 'Rockerboy'>('Solo');
  const [name, setName] = useState<string>('Morgan Cyber');

  // Unified 10 Stats State (Streetrat gets exact allocated, Edgerunner gets rolled array, Complete gets manually allocated)
  const [stats, setStats] = useState({
    int: 6, ref: 8, dex: 8, tech: 5, cool: 6, will: 6, luck: 5, move: 7, body: 7, emp: 6
  });

  // Complete point buy constraint
  const STAT_POINTS_LIMIT = 62;
  const currentSpentStatPoints = stats.int + stats.ref + stats.dex + stats.tech + stats.cool + stats.will + stats.luck + stats.move + stats.body + stats.emp;

  // Complete skills point template 
  const [customSkills, setCustomSkills] = useState<Record<string, number>>({
    perception: 2, concentration: 2, handgun: 2, shoulderArms: 2, brawling: 2,
    melee: 2, autofire: 2, heavyWeapons: 2, athletics: 2, resistTorture: 2,
    stealth: 2, endurance: 2, persuasion: 2, humanPerception: 2, conversation: 2,
    streetwise: 2, trading: 2, basicTech: 2, librarySearch: 2, firstAid: 2
  });

  const SKILL_POINTS_LIMIT = 86;

  // Helper calculating spent skill points (double cost for autofire and heavyWeapons)
  const calculateSpentSkillPoints = () => {
    let total = 0;
    for (const key in customSkills) {
      const level = customSkills[key];
      if (key === 'autofire' || key === 'heavyWeapons') {
        total += level * 2;
      } else {
        total += level;
      }
    }
    return total;
  };

  const currentSpentSkillPoints = calculateSpentSkillPoints();

  // Complete gear shoppers standard
  const [shoppingCart, setShoppingCart] = useState<string[]>(['item_pistol', 'armor_light']); // starter pistol and light jacket included by default
  const SHOPPING_BUDGET = 500;

  const getShoppingTotalCost = () => {
    return shoppingCart.reduce((total, itemId) => {
      const item = GEAR_SHOPPING_LIST.find(g => g.id === itemId);
      return total + (item ? item.cost : 0);
    }, 0);
  };

  const shoppingCostTotal = getShoppingTotalCost();

  // 10-part extended backstory lifepath state
  const [extendedLifepath, setExtendedLifepath] = useState<Record<string, string>>({});
  const [roleSpecificLifepath, setRoleSpecificLifepath] = useState<Record<string, string>>({});
  const [edgerunnerRollIndex, setEdgerunnerRollIndex] = useState<number | null>(null);

  // Auto-allocate stats for Streetrat when role changes
  useEffect(() => {
    if (method === 'streetrat') {
      setStats({ ...ROLE_STATS_TEMPLATES[role] });
    }
  }, [role, method]);

  // Roll lifepaths
  const handleRollAllLifepath = () => {
    audio.playNetSuccess();
    
    // Roll the 10 core tables
    const rolledCore: Record<string, string> = {};
    for (const key in LIFEPATH_TABLES) {
      const table = LIFEPATH_TABLES[key as keyof typeof LIFEPATH_TABLES];
      const rIdx = Math.floor(Math.random() * table.length);
      rolledCore[key] = table[rIdx];
    }
    setExtendedLifepath(rolledCore);

    // Roll role specific tables
    const rolledRole: Record<string, string> = {};
    if (role === 'Solo') {
      const soloTbl = ROLE_SPECIFIC_LIFEPATH_TABLES.Solo;
      rolledRole['workspace'] = soloTbl.workspace[Math.floor(Math.random() * 6)];
      rolledRole['nemesis'] = soloTbl.nemesis[Math.floor(Math.random() * 6)];
      rolledRole['weaponChoice'] = soloTbl.weaponChoice[Math.floor(Math.random() * 6)];
    } else if (role === 'Netrunner') {
      const netTbl = ROLE_SPECIFIC_LIFEPATH_TABLES.Netrunner;
      rolledRole['deckStyle'] = netTbl.deckStyle[Math.floor(Math.random() * 6)];
      rolledRole['clients'] = netTbl.clients[Math.floor(Math.random() * 6)];
      rolledRole['rival'] = netTbl.rival[Math.floor(Math.random() * 6)];
    } else {
      rolledRole['workspace'] = "Standard street services for your class";
      rolledRole['nemesis'] = "Local zone rival techies/medics";
    }
    setRoleSpecificLifepath(rolledRole);
  };

  useEffect(() => {
    handleRollAllLifepath();
  }, [role]);

  // Handle Edgerunner 1d10 roll for stats arrays
  const handleRollEdgerunnerStats = () => {
    audio.playAlert();
    const roll = Math.floor(Math.random() * 10) + 1; // 1d10
    const arrayIndex = (roll - 1) % 6; // 0 to 5 index representing 6 arrays
    setEdgerunnerRollIndex(roll);

    const arraySelection = EDGERUNNER_STAT_ROLLS[role][arrayIndex];
    setStats({ ...arraySelection });
  };

  // Complete Methods handlers
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
        const cost = (key === 'autofire' || key === 'heavyWeapons') ? 2 : 1;
        if (currentSpentSkillPoints + cost > SKILL_POINTS_LIMIT || val >= 6) return prev;
        return { ...prev, [key]: val + 1 };
      } else {
        if (val <= 1) return prev;
        return { ...prev, [key]: val - 1 };
      }
    });
  };

  // Shopper handlers
  const handleToggleShopItem = (itemId: string, cost: number) => {
    audio.playUIBeep();
    setShoppingCart(prev => {
      if (prev.includes(itemId)) {
        // remove
        return prev.filter(id => id !== itemId);
      } else {
        // add if within budget limits
        if (shoppingCostTotal + cost > SHOPPING_BUDGET) {
          alert("Eurobucks ledger limit exceeded! Deselect other items first.");
          return prev;
        }
        return [...prev, itemId];
      }
    });
  };

  const handleFinalize = () => {
    audio.playAlert();
    
    // 1. Calculate Core Attributes according to CP Red Math Formulas
    const hpAverage = Math.ceil((stats.body + stats.will) / 2);
    const calculatedHp = 10 + (5 * hpAverage);
    const maxHL = stats.emp * 10;

    // 2. Derive items purchased from complete Shopping Ledger or standards for rats
    let weaponsAllocated: Weapon[] = [];
    let spHeadVal = 7;
    let spTorsoVal = 7;

    if (method === 'complete') {
      // Map shopping cart items
      shoppingCart.forEach(itemId => {
        const item = GEAR_SHOPPING_LIST.find(g => g.id === itemId);
        if (!item) return;
        if (item.type === 'weapon') {
          weaponsAllocated.push({
            id: `wpn_custom_${Date.now()}_${Math.random()}`,
            name: item.name,
            type: item.id === 'item_monoblade' ? 'melee' : item.id === 'item_pistol' ? 'pistol' : item.id === 'item_shotgun' ? 'shotgun' : 'rifle',
            damage: item.damage || '3d6',
            ammo: item.maxAmmo || 8,
            maxAmmo: item.maxAmmo || 8,
            autofireRating: item.id === 'item_rifle' ? 3 : undefined
          });
        } else if (item.type === 'armor') {
          spHeadVal = item.sp || 7;
          spTorsoVal = item.sp || 7;
        }
      });

      // Default backup weapon if they bought no weapon (Streetrat rule)
      if (weaponsAllocated.length === 0) {
        weaponsAllocated.push({ id: 'wpn_pistol', name: 'Militech Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 });
      }
    } else {
      // Streetrat & Edgerunner template items
      if (role === 'Solo') {
        weaponsAllocated = [
          { id: 'wpn_rifle_autofire', name: 'Arasaka Assault Rifle (Autofire)', type: 'rifle', damage: '5d6', ammo: 30, maxAmmo: 30, autofireRating: 3 },
          { id: 'wpn_monoblade', name: 'Kendachi Monoblade', type: 'melee', damage: '3d6', ammo: 1, maxAmmo: 1 },
          { id: 'wpn_pistol', name: 'Militech Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 }
        ];
        spHeadVal = 11;
        spTorsoVal = 11;
      } else if (role === 'Netrunner') {
        weaponsAllocated = [
          { id: 'wpn_pistol', name: 'Militech Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 },
          { id: 'wpn_monoblade', name: 'Light Syringe Blade', type: 'melee', damage: '2d6', ammo: 1, maxAmmo: 1 }
        ];
        spHeadVal = 7;
        spTorsoVal = 7;
      } else {
        weaponsAllocated = [
          { id: 'wpn_pistol', name: 'Mustang Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 },
          { id: 'wpn_melee', name: 'Shock Baton', type: 'melee', damage: '2d6', ammo: 1, maxAmmo: 1 }
        ];
        spHeadVal = 7;
        spTorsoVal = 11;
      }
    }

    // 3. Skills setup
    const savingSkills = method === 'complete' ? customSkills : ROLE_SKILLS_TEMPLATES[role];

    // Combine 10-part narratives
    const summaryLifepathStr = `Born in ${extendedLifepath.origins || 'Night City'} having a ${extendedLifepath.personalities || 'street'} personality. Clothes: ${extendedLifepath.clothingStyles || 'Chic'}. Valued: ${extendedLifepath.valuedPersons || 'Self'}. Raised: ${extendedLifepath.environments || 'Zone'}. Tragedy: ${extendedLifepath.disasters || 'None'}. Ambition: ${extendedLifepath.ambitions || 'Credits'}.`;

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
      spHead: spHeadVal,
      spTorso: spTorsoVal,
      initiative: 0,
      weapons: weaponsAllocated,
      currentWeaponId: weaponsAllocated[0]?.id || 'wpn_pistol',
      isCovered: false,
      isDead: false,
      criticalInjuries: [],
      stealthState: 'none',
      facedownPenalty: false,
      x: 2,
      y: 2,
      int: stats.int,
      will: stats.will,
      luck: stats.luck,
      body: stats.body,
      emp: stats.emp,
      humanity: { current: maxHL, max: maxHL },
      skills: savingSkills,
      eurobucks: method === 'complete' ? (500 - shoppingCostTotal) : 100,
      gear: method === 'complete' ? shoppingCart : ['Agent', 'Cyberdeck Standard'],
      lifepathExtended: extendedLifepath,
      lifepath: {
        background: `Family background: ${extendedLifepath.families || 'Street'}. Raised in ${extendedLifepath.environments || 'Zone'}.`,
        motivation: extendedLifepath.ambitions || 'Revenge on Corporation.',
        personality: extendedLifepath.personalities || 'Cold and professional',
        enemy: extendedLifepath.disasters || 'Arasaka security operative'
      }
    };

    onSaveCharacter(finalPlayer);
  };

  return (
    <div className="fixed inset-0 bg-[#06060c]/98 z-50 flex items-center justify-center p-4 overflow-y-auto selection:bg-[#ff00ff] font-mono text-xs">
      <div className="w-full max-w-4xl border-2 border-cyan-400 bg-[#0d0d1a]/95 rounded-lg p-5 relative overflow-hidden shadow-[0_0_35px_rgba(0,255,255,0.25)] space-y-5">
        
        {/* Neon decorative cauton warning line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#ff00ff] via-[#00ffff] to-yellow-500 animate-pulse"></div>

        {/* Header bar titles */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800 pb-3">
          <div>
            <span className="text-[9px] text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded uppercase tracking-wider font-extrabold block w-fit">
              ARASAKA INFRASTRUCTURE GEN-MATRIX V2.7
            </span>
            <h2 className="text-lg font-black text-white mt-1 uppercase tracking-widest flex items-center gap-2">
              <Cpu className="text-cyan-400 w-5 h-5 animate-pulse" /> RE-CALIBRATE NEOSOLO CHROME SHEET
            </h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-red-500 hover:bg-red-500/10 text-red-400 text-[10px] rounded uppercase font-black cursor-pointer transition"
          >
            Abort Boot
          </button>
        </div>

        {/* Method Toggling Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Method 1: Streetrat */}
          <button
            onClick={() => { audio.playUIBeep(); setMethod('streetrat'); }}
            className={`p-3.5 border rounded text-left transition-all relative cursor-pointer flex flex-col justify-between ${
              method === 'streetrat'
                ? 'border-[#ff00ff] bg-[#ff00ff]/10 shadow-[0_0_12px_rgba(255,0,255,0.15)]'
                : 'border-gray-800 bg-black/40 text-gray-400 hover:border-gray-700 hover:text-white'
            }`}
          >
            <div>
              <span className="text-[10px] font-black uppercase text-[#ff00ff] tracking-wider block">METHOD 1: STREETRAT</span>
              <span className="text-sm font-extrabold text-white mt-1 block uppercase">CR Core Templates</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed mt-2.5">Forces exact Role Stat block templates and assigns predetermined 80 skill points. Randomly rolls the entire authentic 10-part Cyberpunk Lifepath.</p>
          </button>

          {/* Method 2: Edgerunner */}
          <button
            onClick={() => { audio.playUIBeep(); setMethod('edgerunner'); }}
            className={`p-3.5 border rounded text-left transition-all relative cursor-pointer flex flex-col justify-between ${
              method === 'edgerunner'
                ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_12px_rgba(234,179,8,0.15)]'
                : 'border-gray-800 bg-black/40 text-gray-400 hover:border-gray-700 hover:text-white'
            }`}
          >
            <div>
              <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider block">METHOD 2: EDGERUNNER</span>
              <span className="text-sm font-extrabold text-white mt-1 block uppercase">Fast & Dirty Roll arrays</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed mt-2.5">Rolls 1d10 to lock in one of 6 strict stat arrays per role. Assigns template skills and runs an automated Lifepath engine with role-specific background trackers.</p>
          </button>

          {/* Method 3: Complete Package */}
          <button
            onClick={() => { audio.playUIBeep(); setMethod('complete'); }}
            className={`p-3.5 border rounded text-left transition-all relative cursor-pointer flex flex-col justify-between ${
              method === 'complete'
                ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                : 'border-gray-800 bg-black/40 text-gray-400 hover:border-gray-700 hover:text-white'
            }`}
          >
            <div>
              <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider block">METHOD 3: COMPLETE</span>
              <span className="text-sm font-extrabold text-white mt-1 block uppercase">Manual Point-Buy Suite</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed mt-2.5">Spend 62 points across 10 stats (2-8 caps), buy starter skills using 86 points with double costs for heavy combat chipsets, and purchase armor/weapons with 500 Eurobucks.</p>
          </button>
        </div>

        {/* Basic settings and role togglers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/40 border border-gray-800 p-3.5 rounded-lg">
          <label className="block space-y-1.5">
            <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Challenger Bio-Tag (Stage Alias):</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#111122] border border-gray-700 p-2 text-white font-extrabold focus:border-cyan-400 focus:shadow-[0_0_8px_rgba(34,211,238,0.2)] outline-none rounded"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Role Specification template:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-[#111122] border border-gray-700 p-2 text-cyan-404 text-cyan-400 font-bold outline-none rounded"
            >
              <option value="Solo">Solo (Combat specialist, high kinetic armor, heavy rifles)</option>
              <option value="Netrunner">Netrunner (Virtual network invader, uses programs)</option>
              <option value="Techie">Techie (Hardware engineering & heavy structure repairs)</option>
              <option value="Medtech">Medtech (Combat surgical support with stabilizers)</option>
              <option value="Rockerboy">Rockerboy (Charismatic street poet, human manipulation)</option>
            </select>
          </label>
        </div>

        {/* Main Work Area split by method */}
        <div className="space-y-4 flex-1">
          
          {/* METHOD 1: STREETRAT */}
          {method === 'streetrat' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left card: Stats */}
              <div className="bg-[#10101f]/75 border border-gray-800 rounded p-3 space-y-2.5">
                <span className="text-pink-400 font-extrabold uppercase text-[10px] block border-b border-gray-800 pb-1">1. Exact Role Stats (Locked CR Block)</span>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  {Object.keys(stats).map(key => (
                    <div key={key} className="bg-black/30 p-1 rounded flex justify-between">
                      <span className="uppercase text-gray-500 font-bold">{key}:</span>
                      <span className="text-white font-black">{stats[key as keyof typeof stats]}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-2 rounded text-[10px] text-emerald-400 text-center">
                  Calculated Max Integrity: <b>{10 + 5 * Math.ceil((stats.body + stats.will) / 2)} HP</b> | HL limit: <b>{stats.emp * 10} Humanity</b>
                </div>
              </div>

              {/* Middle & Right column: 10-part Backstory rolled */}
              <div className="bg-[#10101f]/75 border border-gray-800 rounded p-3 col-span-2 space-y-3">
                <div className="flex justify-between items-center border-b border-gray-800 pb-1">
                  <span className="text-yellow-400 font-extrabold uppercase text-[10px] block">2. Rolled 10-part Authentic Lifepath narrative</span>
                  <button
                    onClick={handleRollAllLifepath}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-black uppercase text-[9px] px-2.5 py-1 rounded transition"
                  >
                    🎲 Roll Backstory
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] max-h-[190px] overflow-y-auto pr-1">
                  {Object.entries(extendedLifepath).map(([title, desc]) => (
                    <div key={title} className="bg-black/40 border border-white/5 p-2 rounded">
                      <span className="text-pink-500 font-black uppercase text-[8px] block">{title.replace(/([A-Z])/g, ' $1')}</span>
                      <p className="text-gray-300 italic">"{desc}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* METHOD 2: EDGERUNNER (Fast and Dirty) */}
          {method === 'edgerunner' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Left Card: 1d10 array roll */}
              <div className="bg-[#10101f]/75 border border-yellow-500/20 rounded p-3 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-yellow-400 font-black uppercase text-[10px] block border-b border-gray-800 pb-1">1. 1d10 Stat Lookup Block</span>
                  <p className="text-gray-500 text-[9px] mt-1.5 leading-relaxed">In Cyberpunk Red, Edgerunner stats are determined by rolling a d10 on six tailored arrays per role.</p>
                </div>

                <div className="bg-black/50 p-2.5 border border-gray-800 rounded text-center">
                  <span className="text-gray-400 block text-[10px]">Rolled d10:</span>
                  <span className="text-yellow-400 text-2xl font-black">{edgerunnerRollIndex || '--'}</span>
                  {edgerunnerRollIndex && (
                    <span className="text-[10px] text-gray-500 block mt-1">Array #{edgerunnerRollIndex} loaded!</span>
                  )}
                </div>

                <button
                  onClick={handleRollEdgerunnerStats}
                  className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-black uppercase text-[10px] rounded transition"
                >
                  🎲 Roll 1d10 Stat Arrays
                </button>
              </div>

              {/* Middle and Right: Role-specific background tables display */}
              <div className="bg-[#10101f]/75 border border-gray-800 rounded p-3 col-span-2 space-y-3">
                <span className="text-cyan-400 font-extrabold uppercase text-[10px] block border-b border-gray-800 pb-1">2. Role-specific Backstory matrix & core stats</span>
                
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {Object.keys(stats).map(key => (
                    <div key={key} className="bg-black/30 p-1.5 rounded flex justify-between">
                      <span className="uppercase text-gray-500 font-bold">{key}:</span>
                      <span className="text-white font-black">{stats[key as keyof typeof stats]}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-black/50 border border-white/5 p-2.5 rounded text-[10px] space-y-1.5">
                  <span className="text-yellow-400 font-extrabold uppercase text-[9px] block">Role Career parameters generated:</span>
                  {Object.entries(roleSpecificLifepath).map(([lTitle, lDesc]) => (
                    <p key={lTitle} className="text-gray-300">
                      <b className="uppercase text-pink-400 text-[8px]">{lTitle}:</b> "{lDesc}"
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* METHOD 3: COMPLETE POINT BUY */}
          {method === 'complete' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[350px] overflow-y-auto pr-1">
              
              {/* Stat point buy column */}
              <div className="bg-[#10101f]/75 border border-cyan-500/20 p-3 rounded space-y-3 text-[10px]">
                <div className="flex justify-between items-center border-b border-gray-800 pb-1">
                  <span className="text-cyan-400 font-black uppercase text-[10px]">1. buy 10 stats</span>
                  <span className={`px-1.5 py-0.5 rounded font-black ${currentSpentStatPoints === STAT_POINTS_LIMIT ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {currentSpentStatPoints} / {STAT_POINTS_LIMIT} PTS
                  </span>
                </div>

                <div className="space-y-1 bg-black/40 p-2 rounded">
                  {Object.entries(stats).map(([statKey, statVal]) => (
                    <div key={statKey} className="flex justify-between items-center py-0.5">
                      <span className="uppercase font-bold text-gray-300">{statKey} (2 to 8 cap)</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStatChange(statKey as any, 'dec')}
                          className="w-5 h-5 bg-black hover:border-gray-500 border border-gray-700 text-center font-black rounded text-[10px]"
                        >
                          -
                        </button>
                        <span className="font-extrabold text-cyan-400 text-center w-3">{statVal}</span>
                        <button
                          onClick={() => handleStatChange(statKey as any, 'inc')}
                          className="w-5 h-5 bg-black hover:border-gray-500 border border-gray-700 text-center font-black rounded text-[10px]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skill point buy column */}
              <div className="bg-[#10101f]/75 border border-pink-500/20 p-3 rounded space-y-3 text-[10px]">
                <div className="flex justify-between items-center border-b border-gray-800 pb-1">
                  <span className="text-pink-400 font-black uppercase text-[10px]">2. buy starter skills</span>
                  <span className={`px-1.5 py-0.5 rounded font-black ${currentSpentSkillPoints === SKILL_POINTS_LIMIT ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {currentSpentSkillPoints} / {SKILL_POINTS_LIMIT} PTS
                  </span>
                </div>

                <div className="space-y-1 max-h-[250px] overflow-y-auto bg-black/40 p-2 rounded">
                  {Object.entries(customSkills).map(([skKey, skVal]) => {
                    const isDiff = skKey === 'autofire' || skKey === 'heavyWeapons';
                    return (
                      <div key={skKey} className="flex justify-between items-center py-0.5">
                        <div className="flex flex-col">
                          <span className="capitalize text-gray-300">{skKey.replace(/([A-Z])/g, ' $1')}</span>
                          {isDiff && <span className="text-[7px] text-pink-400 uppercase">Difficult (Double Cost)</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSkillChange(skKey, 'dec')}
                            className="w-5 h-5 bg-black hover:border-gray-500 border border-gray-700 text-center font-black rounded text-[10px]"
                          >
                            -
                          </button>
                          <span className="font-extrabold text-pink-400 text-center w-3">{skVal}</span>
                          <button
                            onClick={() => handleSkillChange(skKey, 'inc')}
                            className="w-5 h-5 bg-black hover:border-gray-500 border border-gray-700 text-center font-black rounded text-[10px]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shopping Ledgers Column */}
              <div className="bg-[#10101f]/75 border border-yellow-500/20 p-3 rounded space-y-3 text-[10px]">
                <div className="flex justify-between items-center border-b border-gray-800 pb-1">
                  <span className="text-yellow-400 font-extrabold uppercase text-[10px] flex items-center gap-1">
                    <ShoppingCart className="w-3.5 h-3.5" /> 3. Shopping Ledger
                  </span>
                  <span className="font-black text-white px-1 border border-gray-750 bg-black/60">
                    Remaining: {SHOPPING_BUDGET - shoppingCostTotal} / {SHOPPING_BUDGET} EB
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                  {GEAR_SHOPPING_LIST.map(gItem => {
                    const selected = shoppingCart.includes(gItem.id);
                    return (
                      <button
                        key={gItem.id}
                        onClick={() => handleToggleShopItem(gItem.id, gItem.cost)}
                        className={`w-full p-2 rounded border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          selected
                            ? 'border-yellow-500 bg-yellow-500/10 text-white'
                            : 'border-gray-800 bg-black/40 text-gray-400 hover:border-gray-750 hover:text-white'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold">{gItem.name}</span>
                          <span className="font-black text-yellow-400">{gItem.cost} EB</span>
                        </div>
                        <p className="text-[8px] text-gray-500 leading-tight mt-1">{gItem.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Form Submit Footer buttons */}
        <div className="border-t border-gray-800 pt-3 flex justify-end gap-3 font-mono text-sm leading-none">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black/60 border border-gray-700 hover:border-gray-500 rounded font-black text-white text-xs cursor-pointer"
          >
            Abort Bios Rollup
          </button>
          
          <button
            onClick={handleFinalize}
            disabled={
              name.trim() === '' || 
              (method === 'complete' && (currentSpentStatPoints !== STAT_POINTS_LIMIT || currentSpentSkillPoints !== SKILL_POINTS_LIMIT))
            }
            className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-500 text-black font-black uppercase text-xs tracking-wider rounded flex items-center gap-1.5 cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(34,211,238,0.4)]"
          >
            <Save className="w-4 h-4" /> 💾 Deploy Biometrics to Active Deck
          </button>
        </div>

      </div>
    </div>
  );
}
