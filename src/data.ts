import { GameState } from './types';

export const INITIAL_STATE: GameState = {
  player: {
    id: 'player_apex',
    name: 'Apex (Netrunner-Solo)',
    isPlayer: true,
    isAlly: true,
    ref: 8,
    dex: 8,
    tech: 7,
    cool: 8,
    hp: 45,
    maxHp: 45,
    spHead: 11,
    spTorso: 11,
    initiative: 0,
    weapons: [
      { id: 'wpn_pistol', name: 'Militech Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 },
      { id: 'wpn_shotgun', name: 'Militech Hellfire Shotgun', type: 'shotgun', damage: '5d6', ammo: 4, maxAmmo: 4 },
      { id: 'wpn_monoblade', name: 'Kendachi Monoblade', type: 'melee', damage: '3d6', ammo: 1, maxAmmo: 1 },
      { id: 'wpn_rifle_autofire', name: 'Arasaka Assault Rifle (Autofire)', type: 'rifle', damage: '5d6', ammo: 30, maxAmmo: 30, autofireRating: 3 }
    ],
    currentWeaponId: 'wpn_pistol',
    isCovered: false,
    isDead: false,
    criticalInjuries: [],
    stealthState: 'none',
    facedownPenalty: false
  },
  synapseHp: 30,
  maxSynapseHp: 30,
  netdeck: {
    programs: [
      { name: 'Sword', type: 'Combat', used: false, desc: 'Deals 3d6 damage to Black ICE Rez.' },
      { name: 'Shield', type: 'Defense', used: false, desc: 'Prevents the next 1 brain damage packet from Black ICE.' },
      { name: 'Eraser', type: 'Anti-Program', used: false, desc: 'Instantly breaks non-ICE virtual nodes.' },
      { name: 'Worm', type: 'Utility', used: false, desc: 'Grants +2 bonus to Breach Protocol or Passwords.' }
    ],
    credits: 1500
  },
  enemies: [
    {
      id: 'enemy_razer',
      name: 'Razer (Maelstrom Wolvers)',
      isPlayer: false,
      isAlly: false,
      ref: 8,
      dex: 8,
      tech: 5,
      cool: 6,
      hp: 35,
      maxHp: 35,
      spHead: 7,
      spTorso: 7,
      initiative: 0,
      weapons: [
        { id: 'razer_claws', name: 'Leveled Cyber Wolvers', type: 'melee', damage: '3d6', ammo: 1, maxAmmo: 1 }
      ],
      currentWeaponId: 'razer_claws',
      isCovered: false,
      isDead: false,
      criticalInjuries: [],
      stealthState: 'none',
      facedownPenalty: false,
      tauntText: "Your chrome belongs to me, gonk!"
    },
    {
      id: 'enemy_sledge',
      name: 'Sledge (Maelstrom Brute)',
      isPlayer: false,
      isAlly: false,
      ref: 6,
      dex: 5,
      tech: 4,
      cool: 4,
      hp: 45,
      maxHp: 45,
      spHead: 11,
      spTorso: 11,
      initiative: 0,
      weapons: [
        { id: 'sledge_shotgun', name: 'Heavy Pump Shotgun', type: 'shotgun', damage: '5d6', ammo: 4, maxAmmo: 4 }
      ],
      currentWeaponId: 'sledge_shotgun',
      isCovered: true,
      isDead: false,
      criticalInjuries: [],
      stealthState: 'none',
      facedownPenalty: false,
      tauntText: "Eat buckshot, flatliner!"
    },
    {
      id: 'enemy_nuke',
      name: 'Nuke (Maelstrom Gunner)',
      isPlayer: false,
      isAlly: false,
      ref: 7,
      dex: 6,
      tech: 6,
      cool: 5,
      hp: 30,
      maxHp: 30,
      spHead: 7,
      spTorso: 7,
      initiative: 0,
      weapons: [
        { id: 'nuke_rifle', name: 'Militech Assault Rifle', type: 'rifle', damage: '5d6', ammo: 30, maxAmmo: 30, autofireRating: 3 }
      ],
      currentWeaponId: 'nuke_rifle',
      isCovered: false,
      isDead: false,
      criticalInjuries: [],
      stealthState: 'none',
      facedownPenalty: false,
      tauntText: "Spray and pray, scavs! Get down!"
    }
  ],
  combatActive: false,
  round: 1,
  turnIndex: 0,
  turnOrder: [],
  logs: [
    { id: 'l_1', timestamp: '10:24:00', type: 'system', message: 'Cyberdeck booted successfully on Arasaka Net Port 09. Status Live.' },
    { id: 'l_2', timestamp: '10:24:05', type: 'system', message: 'Local tactical grid scanner reports 3 Maelstrom hostiles in combat-ready distance.' }
  ],
  netArchitecture: [
    {
      id: 'net_1',
      floor: 1,
      name: 'Access Point AP-09',
      type: 'access_point',
      status: 'revealed',
      description: 'Physical junction on the server wall.',
      info: 'Interface Hack Success grants immediate Net Architecture system maps.'
    },
    {
      id: 'net_2',
      floor: 2,
      name: 'Corpo Secured Gate',
      type: 'password',
      status: 'hidden',
      description: 'Encrypted code door blocking higher datastream access.',
      info: 'Requires a Cyberpunk 2077-style Breach Protocol decryption matrix.'
    },
    {
      id: 'net_3',
      floor: 3,
      name: 'Autoturret CC-01 Controller',
      type: 'control_node',
      status: 'hidden',
      description: 'Automated ceiling heavy defense machine gun controller.',
      info: 'If hijacked (Hacked Control), the turret boots up as an ally unit in active combat rounds to fire at boosters!',
      controlOption: {
        controlled: false,
        name: 'Automated Room Turret'
      }
    },
    {
      id: 'net_4',
      floor: 4,
      name: 'VIRTUAL WARDEN: HELLHOUND',
      type: 'black_ice',
      status: 'hidden',
      description: 'A terrifying, glowing neon hound of cyber killer algorithms.',
      info: 'Attempts to flame-strike your Synapse directly! Attacks deal 2d6 direct neural fire.',
      blackICE: {
        name: 'HELLHOUND',
        type: 'Killer Black ICE',
        hp: 25,
        maxHp: 25,
        speed: 6,
        attack: 6,
        damage: '2d6',
        description: 'Vicious data-warden that hunts Netrunner minds.'
      }
    },
    {
      id: 'net_5',
      floor: 5,
      name: 'Arasaka Black Market Databank',
      type: 'data_file',
      status: 'hidden',
      description: 'Classified commercial ledger index for cyberware transactions.',
      info: 'Harvesting this file awards a staggering +2500 virtual corporate credits!'
    }
  ],
  currentNetFloor: 1,
  selectedNetNodeId: 'net_1',
  manualNpcControl: false,
  customObstacles: [
    { x: 3, y: 4, name: 'Server Stack', icon: 'server' },
    { x: 5, y: 6, name: 'Cyber Clinic Bed', icon: 'bed' },
    { x: 7, y: 3, name: 'Debris Stack', icon: 'debris' },
    { x: 2, y: 8, name: 'Industrial Console', icon: 'console' }
  ]
};

export const STREET_SLANG_TAUNTS = [
  "Another corpse for the scavs!",
  "Your chrome belongs to me, gonk!",
  "Going to bleed you dry, Corporate puppet!",
  "Maelstrom owns this district!",
  "Dodge this, choomba!",
  "Heh, check out this trashy deck, cheap cyberware!",
  "Who let this solo stroll in with high SP?! Aim for the head!",
  "Did your processor lag out? Move, gonk!",
  "Say goodbye to your flesh suite!",
  "You're dealing with real tech-demons now!",
  "Is that a cyberdeck or a toaster, rookie?",
  "Corporate training doesn't save you from a street scrap!",
  "Target acquired. System purging commencing in 3... 2...",
  "I'll wipe your chip and sell your memories for pennies!",
  "My optic scanners detect high fear, low skill!",
  "Carbon fiber plates won't stop this blast, pig!",
  "I am the ghost in your machine, choom!",
  "A Solo but no style... standard amateur mistake!",
  "You're nothing but raw materials for our next mod project!",
  "Error: Target still breathing. Executing lethal resolution!",
  "Unregistered cyberware detected. Standard confiscation protocols apply!",
  "You smell like corpo-slum overflow!",
  "We're gonna rip those optical lenses clean out of your skull!",
  "Your reflex booster is defective! I saw that coming a mile away!",
  "Who's your ripperdoc? They ripped you off, gonk!",
  "Step onto my battlefield, pay with your biological heart!",
  "I've seen slag heaps with better processors than you!",
  "Your armor is melting, corporate meat sack!",
  "This net-grid is closed. Zero-rating your life support right now!",
  "Cyber-fire incoming! Let's watch you smoke!",
  "We'll convert your core to spare micro-batteries!",
  "No backup is coming. Corporate command already drafted your obituary!",
  "You're lagging, cyberware scrap! Upgrade or die!",
  "Lethal response authorized. Purging systemic threat!",
  "Is that all the kinetic punch you've got? Pathetic!",
  "Your neuro-mesh is ripe for a synapse fire!",
  "Nice neon lights. They make you an incredibly easy target!",
  "We are Maelstrom! Flesh is weak, steel is final!",
  "Scanning target... Threat rating: ABSOLUTELY TRASH!",
  "Your cyber-blade cuts like butter on a slag stove!",
  "Eat lead and heavy static, Solo scum!",
  "One called shot and you're just another pile of recycled scrap!"
];

export const CRITICAL_INJURIES_POOL = [
  { name: "Broken Leg", penalty: "-6m Movement, -2 Dodge rolls", damage: 5 },
  { name: "Collapsed Lung", penalty: "-2 DEX and -2 REF, heavy choking", damage: 5 },
  { name: "Brain Injury", penalty: "-2 INT (Interface Checks suffer minus 2)", damage: 5 },
  { name: "Torn Muscle", penalty: "-2 Melee attacks, damage roll reduction", damage: 5 },
  { name: "Temporary Blindness", penalty: "All shooting checks suffer -4 penalty", damage: 5 }
];

export const SLANG_HIT = [
  "Target neutralized, scratch another gonk!",
  "Your chrome is mine, choomba!",
  "Down into the dirt, corporate trash!",
  "Score one for the street! That's gotta hurt!",
  "Liquidating your assets! One bullet at a time!"
];

export const SLANG_MISS = [
  "Glitching optics! Stand still!",
  "Next ones burning through your skull!",
  "Just a warning shot, line-walker!",
  "Argh! Too much cyber-shake! recalibrating targets!",
  "You got lucky, flesh-sack! Enjoy the breeze!"
];

export const SLANG_DAMAGE_TAKEN = [
  "My SP is holding, you output!",
  "That all your cheap iron can do?",
  "Frag! You're gonna pay for that paint job!",
  "Just a scratch on my hardened chassis!",
  "Is that a wet toothpick or a monoblade, gonk?!"
];

export const SLANG_CRITICAL_INFLICTED = [
  "Flatlined! Call the Medtechie!",
  "Ripped right through your light armorjack!",
  "Look at you bleed, flesh-boy!",
  "Boom under the skull! Cybernetics malfunctioning!",
  "Say goodbye to that biological organ, choom!"
];

