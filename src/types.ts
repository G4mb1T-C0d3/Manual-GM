export type WeaponType = 'pistol' | 'shotgun' | 'rifle' | 'melee';

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  damage: string; // e.g., '3d6', '5d6'
  ammo: number;
  maxAmmo: number;
  autofireRating?: number; // max multiplier, normally 3
}

export interface Character {
  id: string;
  name: string;
  role?: string;
  isPlayer: boolean;
  isAlly: boolean;
  ref: number;
  dex: number;
  tech: number;
  cool: number;
  move?: number; // MOVE stat (1 MOVE = 2m movement per turn)
  hp: number;
  maxHp: number;
  spHead: number;
  spTorso: number;
  initiative: number;
  weapons: Weapon[];
  currentWeaponId: string;
  isCovered: boolean;
  isDead: boolean;
  criticalInjuries: string[];
  stealthState: 'none' | 'hidden' | 'ambushing';
  facedownPenalty: boolean;
  tauntText?: string;
  tauntTimer?: number; // block ticks to show speech bubbles
  x?: number; // Grid X (1 to N)
  y?: number; // Grid Y (1 to N)
  actionSpent?: boolean; // turn economy action tracking
  moveActionSpent?: boolean; // turn economy move action tracking
  deployed?: boolean; // Roster deployment state
  int?: number;
  will?: number;
  luck?: number;
  body?: number;
  emp?: number;
  humanity?: { current: number; max: number };
  skills?: Record<string, number>;
  eurobucks?: number;
  gear?: string[];
  lifepathExtended?: Record<string, string>;
  lifepath?: {
    background: string;
    motivation: string;
    personality: string;
    enemy: string;
  };
}

export type NetNodeType = 'access_point' | 'password' | 'control_node' | 'black_ice' | 'data_file';

export interface BlackICE {
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  speed: number;
  attack: number;
  damage: string; // e.g. '2d6' direct to Synapse
  description: string;
}

export interface NetNode {
  id: string;
  floor: number;
  name: string;
  type: NetNodeType;
  status: 'hidden' | 'revealed' | 'bypassed' | 'completed';
  description: string;
  info: string;
  blackICE?: BlackICE;
  controlOption?: {
    controlled: boolean;
    name: string;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string; // game clock
  type: 'combat' | 'netrun' | 'system' | 'damage' | 'heal' | 'audio';
  message: string;
}

export interface Gig {
  id: string;
  title: string;
  employer: string;
  dangerRating: 'Easy' | 'Medium' | 'Hard' | 'Deadly';
  premise: string;
  primaryObjective: string;
  secondaryObjective: string;
  battleArenaLayout: {
    width: number;
    height: number;
    environment: string;
  };
}

export interface MapObstacle {
  x: number;
  y: number;
  name: string;
  icon: string; // e.g. 'server' | 'bed' | 'debris' | 'console' | 'shield' | 'zap'
  angle?: number; // GM custom rotation angle in flat isometric space
}

export interface GameState {
  player: Character;
  synapseHp: number;
  maxSynapseHp: number;
  netdeck: {
    programs: Array<{ name: string; type: string; used: boolean; desc: string }>;
    credits: number;
  };
  enemies: Character[];
  combatActive: boolean;
  round: number;
  turnIndex: number; // index in current turn order
  turnOrder: string[]; // list of character IDs
  logs: LogEntry[];
  netArchitecture: NetNode[];
  currentNetFloor: number;
  selectedNetNodeId: string | null;
  currentGig?: Gig | null;
  manualNpcControl?: boolean; // GM manually controls NPC actions
  customObstacles?: MapObstacle[]; // GM customized map obstacles
}
