import React, { useState } from 'react';
import { GameState, Gig, Character, NetNode, Weapon, MapObstacle } from '../types';
import { audio } from '../audio';
import { getGameTime } from '../utils';
import { Target, Shield, Compass, ChevronRight, Zap, RefreshCw, Cpu, Award, FolderOpen, List, Sparkles } from 'lucide-react';

const FIXERS_AND_CORPS = [
  "Rogue (The Afterlife)",
  "Arasaka Corporation (Black-Ops Division)",
  "Militech Tactical Operations Office",
  "Spider Bates (Local Net-Fixer)",
  "Trace Santiago (Aldecaldos Nomad Leader)",
  "Mr. Hands (Pacificia Fixer Contact)"
];

const PREMISES = [
  "A rival corporate research unit has cached a localized database core containing military-grade chrome blueprints. Standard retrieval is high-risk.",
  "An unstable rogue Techie in the Combat Zone has loaded an illegal net-proxy server to upload Black Chrome specs to the open web. Silencing them immediately is required.",
  "Maelstrom booster scangers have kidnapped a corporate defector with a high-SP cyberware core. Secure the defector before they parse their mind algorithms.",
  "A Militech black site is preparing a high-payload synapse strike against standard street runners in the district. Infiltrate and take down their primary power grid cells."
];

const ENVIRONMENTS = [
  "Arasaka Research server core zone, slick white floors and humming neon wires.",
  "A back-alley cyberware clinic smelling of coolant oil and biological scrap tissue.",
  "A ruined container yard near Night City ports, surrounded by razor wire and toxic slag barrels.",
  "An abandoned metro command station, retrofitted as a booster gang sub-base."
];

interface MissionGeneratorProps {
  logs: any[];
  currentGig: Gig | null | undefined;
  onLoadGig: (gig: Gig, enemies: Character[], netArch: NetNode[], customObstacles?: MapObstacle[]) => void;
}

export function openGigInNewWindow(gig: Gig) {
  const newWin = window.open("", "_blank");
  if (!newWin) {
    return false;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${gig.title} // SCREAMSHEET DOSSIER</title>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body {
          background-color: #030308;
          color: #e2e8f0;
          font-family: 'JetBrains Mono', monospace;
          padding: 2.5rem;
          margin: 0;
          border-top: 6px solid #ff0055;
        }
        .header {
          border-bottom: 2px dashed #ff0055;
          padding-bottom: 1.5rem;
          margin-bottom: 2rem;
          position: relative;
        }
        .hazard-banner {
          height: 12px;
          background: repeating-linear-gradient(
            45deg,
            #eab308,
            #eab308 10px,
            #030308 10px,
            #030308 20px
          );
          margin-bottom: 1.5rem;
          border: 1px solid #eab30833;
        }
        h1 {
          font-family: 'Space Grotesk', sans-serif;
          color: #fff;
          font-size: 1.8rem;
          text-transform: uppercase;
          margin: 0;
          letter-spacing: 2px;
          text-shadow: 0 0 10px rgba(255, 0, 85, 0.5);
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .meta-item {
          background-color: #090911;
          border: 1px solid #27272a;
          padding: 1rem;
          border-radius: 4px;
        }
        .meta-label {
          color: #71717a;
          font-size: 0.75rem;
          text-transform: uppercase;
          margin-bottom: 0.35rem;
          letter-spacing: 1px;
        }
        .meta-value {
          font-size: 1.05rem;
          font-weight: bold;
          color: #22d3ee;
        }
        .danger-badge {
          display: inline-block;
          font-size: 0.75rem;
          padding: 0.25rem 0.6rem;
          background-color: #ff0055;
          color: #fff;
          font-weight: 800;
          border-radius: 2px;
          text-transform: uppercase;
          box-shadow: 0 0 8px rgba(255, 0, 85, 0.4);
        }
        .premise-box {
          background-color: rgba(255, 0, 85, 0.04);
          border-left: 4px solid #ff0055;
          padding: 1rem 1.25rem;
          margin-bottom: 2rem;
          font-style: italic;
          line-height: 1.5;
          color: #cbd5e1;
        }
        .objectives-box {
          background-color: #090911;
          border: 1px solid #ff005530;
          padding: 1.5rem;
          border-radius: 4px;
          margin-bottom: 2rem;
        }
        .objectives-title {
          font-family: 'Space Grotesk', sans-serif;
          color: #eab308;
          font-size: 1.15rem;
          margin-top: 0;
          margin-bottom: 1rem;
          text-transform: uppercase;
          border-bottom: 1px solid #27272a;
          padding-bottom: 0.5rem;
          letter-spacing: 1px;
        }
        .objective-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 1.2rem;
        }
        .obj-bullet-p { color: #ff0055; font-size: 1.1rem; }
        .obj-bullet-s { color: #22d3ee; font-size: 1.1rem; }
        .btn-container {
          display: flex;
          gap: 1rem;
        }
        .print-btn {
          background: #ff0055;
          color: white;
          padding: 0.75rem 1.5rem;
          border: 1px solid #ff0055;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: bold;
          text-transform: uppercase;
          cursor: pointer;
          letter-spacing: 1px;
          transition: all 0.2s;
          margin-top: 1rem;
          flex-1;
        }
        .print-btn:hover {
          background: #030308;
          color: #ff0055;
          box-shadow: 0 0 12px rgba(255, 0, 85, 0.4);
        }
        .print-btn.secondary {
          background-color: #27272a;
          border-color: #27272a;
        }
        .print-btn.secondary:hover {
          background-color: #030308;
          color: #e2e8f0;
          border-color: #52525b;
        }
        .tech-footer {
          text-align: center;
          font-size: 0.7rem;
          color: #52525b;
          margin-top: 3.5rem;
          border-top: 1px dashed #27272a;
          padding-top: 1rem;
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      <div class="hazard-banner"></div>
      <div class="header">
        <h1>NIGHT CITY WIRE // REGIONAL NETRUN EXPLOIT CONTRACT</h1>
        <div style="font-size: 0.75rem; color: #ff0055; margin-top: 0.5rem; font-weight: bold; letter-spacing: 1.5px;">
          CLASSIFIED SCREAMSHEET SOURCE // EXP-SEC_ID: ${gig.id}
        </div>
      </div>

      <div style="font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; margin-bottom: 1.5rem; color: #eab308; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
        ${gig.title}
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <div class="meta-label">Contracting Fixer Liaison</div>
          <div class="meta-value">${gig.employer}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Threat Analysis / Danger Index</div>
          <div style="margin-top: 0.25rem;">
            <span class="danger-badge" style="background-color: ${
              gig.dangerRating === 'Deadly' ? '#ef4444' :
              gig.dangerRating === 'Hard' ? '#f97316' :
              gig.dangerRating === 'Medium' ? '#eab308' : '#10b981'
            }">${gig.dangerRating}</span>
          </div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Arena Simulation Bounds</div>
          <div class="meta-value" style="color: #eab308;">${gig.battleArenaLayout.width} x ${gig.battleArenaLayout.height} Matrix Grid</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Target Zone Environment Profile</div>
          <div class="meta-value" style="color: #fff;">${gig.battleArenaLayout.environment}</div>
        </div>
      </div>

      <div class="meta-label">Decoded Mission Narrative Overview</div>
      <div class="premise-box">
        "${gig.premise}"
      </div>

      <div class="objectives-box">
        <div class="objectives-title">Primary & Secondary Tactics</div>
        <div class="objective-item">
          <span class="obj-bullet-p">⚫</span>
          <div>
            <strong>CORE PRIMARY OBJECTIVE:</strong><br>
            <span style="color: #fff; line-height: 1.5;">${gig.primaryObjective}</span>
          </div>
        </div>
        <div class="objective-item">
          <span class="obj-bullet-s">⚫</span>
          <div>
            <strong>TACTICAL SECONDARY OBJECTIVE:</strong><br>
            <span style="color: #e2e8f0; line-height: 1.5;">${gig.secondaryObjective}</span>
          </div>
        </div>
      </div>

      <div class="btn-container">
        <button class="print-btn" onclick="window.print()">🖨️ Telemetry Hardcopy Print (Ctrl+P)</button>
        <button class="print-btn secondary" onclick="window.close()">✖️ Terminate Connection Link</button>
      </div>

      <div class="tech-footer">
        © 2077 Night City Afterlife Operations. Data-link secured via DeepMind RetroNet. Handshaking credentials: EXP-8A34-D501-E63A
      </div>
    </body>
    </html>
  `;

  newWin.document.write(htmlContent);
  newWin.document.close();
  return true;
}

// 4 CYBERPUNK RED PRELOADED CORE BLUEPRINTS REGISTRY
const CORE_RULEBOOK_GIGS: Array<{
  gig: Gig;
  enemies: Character[];
  netNodes: NetNode[];
  obstacles: MapObstacle[];
}> = [
  {
    gig: {
      id: "core_gig_exec_extraction",
      title: "EXEC EXTRACTION: ARASAKA SAFEHOUSE",
      employer: "Rogue (The Afterlife)",
      dangerRating: "Hard",
      premise: "Extract head corporate defector Chef Director Kenji from a sleek Arasaka safehouse before corporate scrubber agents flatline his biological systems.",
      primaryObjective: "Locate Chef Kenji on penthouse floor assets block and guide him to extraction.",
      secondaryObjective: "Breach safehouse encryption terminal at Coordinate (3,8) to steal corporate security keys.",
      battleArenaLayout: {
        width: 12,
        height: 12,
        environment: "Slick corporate penthouse, neon lights reflecting on wet glass roofs."
      }
    },
    enemies: [
      {
        id: 'enemy_arasaka_cop',
        name: 'Arasaka Security Cop',
        isPlayer: false,
        isAlly: false,
        ref: 7, dex: 6, tech: 5, cool: 5, move: 6,
        hp: 35, maxHp: 35,
        spHead: 11, spTorso: 12,
        initiative: 0,
        weapons: [{ id: 'wpn_g_pistol', name: 'Militech Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 }],
        currentWeaponId: 'wpn_g_pistol',
        isCovered: true,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "Sec corps in position! Eliminate the intruder runner!",
        x: 9, y: 4,
        deployed: true
      },
      {
        id: 'enemy_cyber_samurai',
        name: 'Cyber-Samurai Elite',
        isPlayer: false,
        isAlly: false,
        ref: 8, dex: 8, tech: 5, cool: 6, move: 8,
        hp: 45, maxHp: 45,
        spHead: 11, spTorso: 11,
        initiative: 0,
        weapons: [{ id: 'wpn_g_melee', name: 'Cyber Wolvers', type: 'melee', damage: '3d6', ammo: 1, maxAmmo: 1 }],
        currentWeaponId: 'wpn_g_melee',
        isCovered: false,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "Your digital deck cannot save your flesh from high frequency claws!",
        x: 7, y: 9,
        deployed: true
      }
    ],
    obstacles: [
      { x: 3, y: 8, name: 'Safehouse Terminal', icon: 'console', angle: 0 },
      { x: 5, y: 4, name: 'Server Columns', icon: 'server', angle: 90 },
      { x: 2, y: 2, name: 'Luxe Couch', icon: 'bed', angle: 45 },
      { x: 8, y: 7, name: 'Glass Partition Debris', icon: 'debris', angle: 0 }
    ],
    netNodes: [
      {
        id: 'exec_f1',
        floor: 1,
        name: 'Arasaka Safehouse AP',
        type: 'access_point',
        status: 'revealed',
        description: 'Physical junction port located in server core walls.',
        info: 'Interface Hack Success grants immediate access to password levels.'
      },
      {
        id: 'exec_f2',
        floor: 2,
        name: 'Safehouse Password Block',
        type: 'password',
        status: 'hidden',
        description: 'Military-grade encryption gate safeguarding security controls.',
        info: 'Requires Breach Decryption mechanics to bypass.'
      },
      {
        id: 'exec_f3',
        floor: 3,
        name: 'Security Turret CC-01 Node',
        type: 'control_node',
        status: 'hidden',
        description: 'Wall automated turret defense system driver.',
        info: 'If Hijacked via Net Control, boots up as an active combat ally!',
        controlOption: {
          controlled: false,
          name: 'Wall Heavy Turret CC-01'
        }
      },
      {
        id: 'exec_f4',
        floor: 4,
        name: 'CLASSIFIED Commercial Ledger',
        type: 'data_file',
        status: 'hidden',
        description: 'Secured databank storing corporate financial links.',
        info: 'Harvesting this file awards +3500¢ credits.'
      }
    ]
  },
  {
    gig: {
      id: "core_gig_nomad_ambush",
      title: "NOMAD AMBUSH: BADLANDS CONTAINER YARD",
      employer: "Trace Santiago (Aldecaldos Nomad Leader)",
      dangerRating: "Medium",
      premise: "Militech retrieval teams have cornered a friendly Nomad cargo transport convoy in a ruined container park. Slip behind their cordon line, disable terminal grid and clean sector.",
      primaryObjective: "Secure smuggled Nomad vehicle coordinates registry at terminal.",
      secondaryObjective: "Siphon transit records from the server stack terminal.",
      battleArenaLayout: {
        width: 10,
        height: 10,
        environment: "Ruined container yard smelling of fuel, iron scrap, and toxic slag barrels."
      }
    },
    enemies: [
      {
        id: 'enemy_nomad_warrior',
        name: 'Militech Scout Trooper',
        isPlayer: false,
        isAlly: false,
        ref: 7, dex: 7, tech: 5, cool: 5, move: 6,
        hp: 30, maxHp: 30,
        spHead: 7, spTorso: 7,
        initiative: 0,
        weapons: [{ id: 'wpn_g_pistol', name: 'Militech Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 }],
        currentWeaponId: 'wpn_g_pistol',
        isCovered: true,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "Militech patrol! Standard sector cleanse procedures authorized!",
        x: 8, y: 6,
        deployed: true
      },
      {
        id: 'enemy_convoy_guard',
        name: 'Nomad Heavy Road Raider',
        isPlayer: false,
        isAlly: false,
        ref: 6, dex: 7, tech: 6, cool: 5, move: 6,
        hp: 35, maxHp: 35,
        spHead: 11, spTorso: 11,
        initiative: 0,
        weapons: [{ id: 'wpn_g_shot', name: 'Pump Action Shotgun', type: 'shotgun', damage: '5d6', ammo: 4, maxAmmo: 4 }],
        currentWeaponId: 'wpn_g_shot',
        isCovered: false,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "Dust to dust, corp gonks! Get off our highway!",
        x: 5, y: 8,
        deployed: true
      }
    ],
    obstacles: [
      { x: 4, y: 5, name: 'Scrap Metal Pile', icon: 'debris', angle: 45 },
      { x: 2, y: 4, name: 'Industrial Console', icon: 'console', angle: 0 },
      { x: 8, y: 3, name: 'Storage Server Stack', icon: 'server', angle: 270 }
    ],
    netNodes: [
      {
        id: 'nomad_f1',
        floor: 1,
        name: 'Nomad Proxy Access Point',
        type: 'access_point',
        status: 'revealed',
        description: 'Physical link hidden under scrap dashboards.',
        info: 'Connection links local matrix nodes.'
      },
      {
        id: 'nomad_f2',
        floor: 2,
        name: 'Convoy Security Passcode',
        type: 'password',
        status: 'hidden',
        description: 'Standard key verification firewall block.',
        info: 'Bypass unlocks coordinates databank.'
      },
      {
        id: 'nomad_f3',
        floor: 3,
        name: 'Transit Ledger Records',
        type: 'data_file',
        status: 'hidden',
        description: 'Encrypted Militech shipment manifests.',
        info: 'Harvesting awards +2000¢ cash credits.'
      }
    ]
  },
  {
    gig: {
      id: "core_gig_maelstrom_raid",
      title: "COMBAT ZONE RAID: MAELSTROM CLINIC",
      employer: "Mr. Hands (Pacificia Fixer Contact)",
      dangerRating: "Deadly",
      premise: "Maelstrom booster gangers are using a retrofitted old metro command sub-station as a biological chop clinic and illegal black subnet server. Purge with extreme force.",
      primaryObjective: "Infiltrate clinic core cells and deactivate the Cyber-Scythe Boss.",
      secondaryObjective: "Siphon credits from Maelstrom data vault ledger archives.",
      battleArenaLayout: {
        width: 12,
        height: 12,
        environment: "An abandoned metro command station, retrofitted as Maelstrom booster base."
      }
    },
    enemies: [
      {
        id: 'enemy_mael_booster',
        name: 'Maelstrom Red-Eye Guard',
        isPlayer: false,
        isAlly: false,
        ref: 7, dex: 7, tech: 5, cool: 5, move: 6,
        hp: 38, maxHp: 38,
        spHead: 11, spTorso: 11,
        initiative: 0,
        weapons: [{ id: 'wpn_g_shot', name: 'Pump Action Shotgun', type: 'shotgun', damage: '5d6', ammo: 4, maxAmmo: 4 }],
        currentWeaponId: 'wpn_g_shot',
        isCovered: true,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "Clinic offline! We chew intruders up for scrap spare chrome!",
        x: 6, y: 8,
        deployed: true
      },
      {
        id: 'enemy_mael_boss',
        name: 'CYBER-SCYTHE BOSSMaster',
        isPlayer: false,
        isAlly: false,
        ref: 8, dex: 8, tech: 6, cool: 6, move: 8,
        hp: 55, maxHp: 55,
        spHead: 12, spTorso: 14,
        initiative: 0,
        weapons: [{ id: 'wpn_g_melee', name: 'Cyber Wolvers', type: 'melee', damage: '3d6', ammo: 1, maxAmmo: 1 }],
        currentWeaponId: 'wpn_g_melee',
        isCovered: false,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "Unleashing mechanical claws! Mutilating grid matrix elements!",
        x: 10, y: 9,
        deployed: true
      }
    ],
    obstacles: [
      { x: 5, y: 3, name: 'Chop Clinic Bed', icon: 'bed', angle: 90 },
      { x: 9, y: 5, name: 'Maelstrom Console', icon: 'console', angle: 0 },
      { x: 3, y: 10, name: 'Exhaust Vent Cooling Shield', icon: 'server', angle: 180 },
      { x: 8, y: 8, name: 'Industrial Server Tower', icon: 'server', angle: 0 }
    ],
    netNodes: [
      {
        id: 'mael_f1',
        floor: 1,
        name: 'Clinic Subnet Access Point',
        type: 'access_point',
        status: 'revealed',
        description: 'Glow green command AP terminal wire.',
        info: 'Establish handshake connection.'
      },
      {
        id: 'mael_f2',
        floor: 2,
        name: 'Red-Eye Encrypted Gate',
        type: 'password',
        status: 'hidden',
        description: 'Triple firewall passcode locks.',
        info: 'Interface decryption opens security controllers.'
      },
      {
        id: 'mael_f3',
        floor: 3,
        name: 'Clinic Security Controller',
        type: 'control_node',
        status: 'hidden',
        description: 'CC-01 heavy autogun security link.',
        info: 'Hack auto weapons to aid in field combat.',
        controlOption: {
          controlled: false,
          name: 'Clinic Machine Gun CC-01'
        }
      },
      {
        id: 'mael_f4',
        floor: 4,
        name: 'Warden Program: HELLHOUND V2',
        type: 'black_ice',
        status: 'hidden',
        description: 'Glowing red cybernetic watchdog watchdog.',
        info: 'REZ: 25. High Biofeedback direct brainfry shock.',
        blackICE: {
          name: 'Maelstrom HELLHOUND',
          type: 'Anti-Personnel Killer ICE',
          hp: 25,
          maxHp: 25,
          speed: 6,
          attack: 7,
          damage: '2d6',
          description: 'Thermal digital program targeting neural cortex.'
        }
      },
      {
        id: 'mael_f5',
        floor: 5,
        name: 'Scythe Class Vault Ledger',
        type: 'data_file',
        status: 'hidden',
        description: 'Digital cache indexing cybertech loot registers.',
        info: 'Harvesting awards +3500¢ credits.'
      }
    ]
  },
  {
    gig: {
      id: "core_gig_militech_netrun",
      title: "CORPORATE NETRUN: MILITECH MAINNODE",
      employer: "Spider Bates (Local Net-Fixer)",
      dangerRating: "Deadly",
      premise: "A high-security Militech node is storing raw black budget prototype specs in its deepest floor stacks. Jack in, dismantle their cobra ICE, and extract the dataset.",
      primaryObjective: "Breach deep network mainframe stack to retrieve Militech archives.",
      secondaryObjective: "Hijack automated defense turret companion cells on Floor 3.",
      battleArenaLayout: {
        width: 10,
        height: 10,
        environment: "Slick server matrix chambers, glass columns with humming neon bundles."
      }
    },
    enemies: [
      {
        id: 'enemy_militech_enf',
        name: 'Militech Heavy Enforcer',
        isPlayer: false,
        isAlly: false,
        ref: 7, dex: 6, tech: 6, cool: 6, move: 5,
        hp: 45, maxHp: 45,
        spHead: 12, spTorso: 12,
        initiative: 0,
        weapons: [{ id: 'wpn_g_rifle', name: 'Assault Rifle', type: 'rifle', damage: '5d6', ammo: 30, maxAmmo: 30, autofireRating: 3 }],
        currentWeaponId: 'wpn_g_rifle',
        isCovered: false,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "Terminal compromised! Engaging heavy fire suppressive spray!",
        x: 7, y: 5,
        deployed: true
      },
      {
        id: 'enemy_cybersec_agent',
        name: 'Net-Response Cyber-Sec Patrol',
        isPlayer: false,
        isAlly: false,
        ref: 8, dex: 7, tech: 8, cool: 6, move: 7,
        hp: 35, maxHp: 35,
        spHead: 11, spTorso: 11,
        initiative: 0,
        weapons: [{ id: 'wpn_g_pistol', name: 'Militech Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 }],
        currentWeaponId: 'wpn_g_pistol',
        isCovered: true,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "Subnet breach trace complete. Preparing neuron shockwave fried!",
        x: 8, y: 8,
        deployed: true
      }
    ],
    obstacles: [
      { x: 3, y: 5, name: 'Mainframe Cooling Station', icon: 'server', angle: 0 },
      { x: 7, y: 3, name: 'Venting Rail Guard', icon: 'debris', angle: 90 },
      { x: 2, y: 8, name: 'Militech Control Desk', icon: 'console', angle: 180 }
    ],
    netNodes: [
      {
        id: 'mnet_f1',
        floor: 1,
        name: 'Central Mainframe Access Point',
        type: 'access_point',
        status: 'revealed',
        description: 'Main physical access terminal input port.',
        info: 'Establish initial physical link connection.'
      },
      {
        id: 'mnet_f2',
        floor: 2,
        name: 'Militech Firewall Password Key',
        type: 'password',
        status: 'hidden',
        description: 'High performance corporate system firewall wall.',
        info: 'Requires standard Breach hex minigame to bypass.'
      },
      {
        id: 'mnet_f3',
        floor: 3,
        name: 'Turret MC-03 Security Core',
        type: 'control_node',
        status: 'hidden',
        description: 'Central automated heavy machine gun terminal loop.',
        info: 'Interface hack siphons key code registries to hijack defense turret companion.',
        controlOption: {
          controlled: false,
          name: 'Militech Turret MC-03'
        }
      },
      {
        id: 'mnet_f4',
        floor: 4,
        name: 'Warden Virtual: ASP V1 COBRA',
        type: 'black_ice',
        status: 'hidden',
        description: 'Highly kinetic glowing virtual digital cobra watchdog.',
        info: 'REZ: 30. High Evasion. Spews synaptic burn biofeedback shock.',
        blackICE: {
          name: 'ASP V1 COBRA',
          type: 'Synaptic Burner ICE',
          hp: 30,
          maxHp: 30,
          speed: 7,
          attack: 8,
          damage: '3d6',
          description: 'Advanced Militech anti-hostile cyberware sentinel.'
        }
      },
      {
        id: 'mnet_f5',
        floor: 5,
        name: 'Militech Secret Archives File',
        type: 'data_file',
        status: 'hidden',
        description: 'Deep black project blueprint databases.',
        info: 'Harvesting records awards +4500¢ credits.'
      }
    ]
  }
];

export default function MissionGenerator({ logs, currentGig, onLoadGig }: MissionGeneratorProps) {
  const [generatedGig, setGeneratedGig] = useState<Gig | null>(null);
  const [popupBlocked, setPopupBlocked] = useState<boolean>(false);
  const [displayTab, setDisplayTab] = useState<'directory' | 'procedural'>('directory');

  const handleGenerateProceduralGig = () => {
    audio.playNetSuccess();
    setPopupBlocked(false);

    const id = `gig_${Date.now()}`;
    const titleCandidates = [
      "The Arasaka Mind-Scrape Run",
      "Combat Zone Cable-Bypass",
      "Militech Core Recovery Protocol",
      "Black Market Chrome Recapture",
      "The Maelstrom Subnet Crash"
    ];
    const dangers: Array<'Easy' | 'Medium' | 'Hard' | 'Deadly'> = ['Easy', 'Medium', 'Hard', 'Deadly'];
    const danger = dangers[Math.floor(Math.random() * dangers.length)];
    const title = titleCandidates[Math.floor(Math.random() * titleCandidates.length)] + ` [${danger}]`;
    const employer = FIXERS_AND_CORPS[Math.floor(Math.random() * FIXERS_AND_CORPS.length)];
    const premise = PREMISES[Math.floor(Math.random() * PREMISES.length)];
    const environment = ENVIRONMENTS[Math.floor(Math.random() * ENVIRONMENTS.length)];

    let primary = "Retrieve the physical data-storage core on coordinate G-09.";
    let secondary = "Download corporate ledger database from central mainframe console.";
    let gridW = 10;
    let gridH = 10;

    if (danger === 'Easy') {
      primary = "Retrieve the physical ledger drive.";
      secondary = "Bypass the security gate terminal without alarms.";
      gridW = 8;
      gridH = 8;
    } else if (danger === 'Medium') {
      primary = "Eliminate the rogue tech specialist.";
      secondary = "Infiltrate and disable security CC-01 control node.";
      gridW = 10;
      gridH = 10;
    } else if (danger === 'Hard') {
      primary = "Extract the corporate defector out of the shipping zone.";
      secondary = "Siphon over 1500¢ credits from the local corporate databank node.";
      gridW = 12;
      gridH = 12;
    } else {
      primary = "Destroy the Arasaka terminal cells and flatline core guards.";
      secondary = "Purge the deadly HELLHOUND cyber-ice program from Subnet stream.";
      gridW = 12;
      gridH = 12;
    }

    const gig: Gig = {
      id,
      title,
      employer,
      dangerRating: danger,
      premise,
      primaryObjective: primary,
      secondaryObjective: secondary,
      battleArenaLayout: {
        width: gridW,
        height: gridH,
        environment
      }
    };

    setGeneratedGig(gig);

    setTimeout(() => {
      const opened = openGigInNewWindow(gig);
      if (!opened) {
        setPopupBlocked(true);
      }
    }, 150);
  };

  const handleLoadProceduralToSystem = () => {
    if (!generatedGig) return;
    audio.playAlert();

    const listEnemies: Character[] = [];
    const rating = generatedGig.dangerRating;

    const baseWeaponPistol: Weapon = { id: 'wpn_g_pistol', name: 'Militech Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 };
    const baseWeaponShotgun: Weapon = { id: 'wpn_g_shot', name: 'Pump Action Shotgun', type: 'shotgun', damage: '5d6', ammo: 4, maxAmmo: 4 };
    const baseWeaponRifle: Weapon = { id: 'wpn_g_rifle', name: 'Assault Rifle', type: 'rifle', damage: '5d6', ammo: 30, maxAmmo: 30, autofireRating: 3 };
    const baseMeleeClaws: Weapon = { id: 'wpn_g_melee', name: 'Cyber Wolvers', type: 'melee', damage: '3d6', ammo: 1, maxAmmo: 1 };

    if (rating === 'Easy') {
      listEnemies.push({
        id: 'enemy_arasaka_sec1',
        name: 'Arasaka Security Guard',
        isPlayer: false,
        isAlly: false,
        ref: 6, dex: 6, tech: 5, cool: 5, move: 6,
        hp: 30, maxHp: 30,
        spHead: 7, spTorso: 7,
        initiative: 0,
        weapons: [baseWeaponPistol],
        currentWeaponId: 'wpn_g_pistol',
        isCovered: true,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "NCPD scan clear, you are trespassing on private cyberdeck sectors!",
        x: 6, y: 5,
        deployed: true
      });
    } else if (rating === 'Medium') {
      listEnemies.push({
        id: 'enemy_street_sam1',
        name: 'Razor Street Samurai',
        isPlayer: false,
        isAlly: false,
        ref: 8, dex: 8, tech: 5, cool: 5, move: 7,
        hp: 35, maxHp: 35,
        spHead: 7, spTorso: 11,
        weapons: [baseMeleeClaws],
        currentWeaponId: 'wpn_g_melee',
        initiative: 0,
        isCovered: false,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "High frequency blades are faster than your reflex nodes!",
        x: 7, y: 6,
        deployed: true
      });
    } else if (rating === 'Hard') {
      listEnemies.push({
        id: 'enemy_militech_sol1',
        name: 'Militech Strike Soldier',
        isPlayer: false,
        isAlly: false,
        ref: 7, dex: 7, tech: 6, cool: 6, move: 6,
        hp: 45, maxHp: 45,
        spHead: 11, spTorso: 12,
        weapons: [baseWeaponRifle],
        currentWeaponId: 'wpn_g_rifle',
        initiative: 0,
        isCovered: false,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "Hostile intruder detected, executing full suppressive spray!",
        x: 9, y: 8,
        deployed: true
      });
    } else {
      listEnemies.push({
        id: 'enemy_militech_sol2',
        name: 'Commander Militech Elite',
        isPlayer: false,
        isAlly: false,
        ref: 8, dex: 7, tech: 6, cool: 7, move: 6,
        hp: 55, maxHp: 55,
        spHead: 14, spTorso: 14,
        weapons: [baseWeaponRifle],
        currentWeaponId: 'wpn_g_rifle',
        initiative: 0,
        isCovered: false,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "You stumbled into a direct corporate execution sector, gonk!",
        x: 10, y: 8,
        deployed: true
      });
    }

    const listNodes: NetNode[] = [];
    const floorLimit = rating === 'Easy' ? 3 : rating === 'Medium' ? 4 : rating === 'Hard' ? 5 : 6;

    listNodes.push({
      id: `${generatedGig.id}_f1`,
      floor: 1,
      name: `Access Point AP-${Math.floor(Math.random() * 90) + 10}`,
      type: 'access_point',
      status: 'revealed',
      description: 'Physical junction terminal in server core walls.',
      info: 'Interface Hack Success grants coordinate schemas.'
    });

    if (floorLimit >= 3) {
      listNodes.push({
        id: `${generatedGig.id}_f2`,
        floor: 2,
        name: `Subnet Encryption Password Block`,
        type: 'password',
        status: 'hidden',
        description: 'Military encryption firewall gate.',
        info: 'Requires alternating vector decryptions.'
      });
    }

    if (floorLimit >= 4) {
      listNodes.push({
        id: `${generatedGig.id}_f3`,
        floor: 3,
        name: `Automated Turret MC-01 Controller`,
        type: 'control_node',
        status: 'hidden',
        description: 'Active floor autogun defense module.',
        info: 'Convert turret code to join player combat turn grid.',
        controlOption: {
          controlled: false,
          name: 'Heavy Gun MC-01'
        }
      });
    }

    if (floorLimit >= 5) {
      listNodes.push({
        id: `${generatedGig.id}_f4`,
        floor: 4,
        name: `Virtual Brute: HELLHOUND V2`,
        type: 'black_ice',
        status: 'hidden',
        description: 'Thermal digital program targeting neural cortex.',
        info: 'Spews biofeedback brainfry. REZ: 25.',
        blackICE: {
          name: 'HELLHOUND V2',
          type: 'Anti-Personnel Killer ICE',
          hp: 25,
          maxHp: 25,
          speed: 7,
          attack: 7,
          damage: '2d6',
          description: 'Fierce virtual cobra targeting biological systems.'
        }
      });
    }

    listNodes.push({
      id: `${generatedGig.id}_f${floorLimit}`,
      floor: floorLimit,
      name: `Arasaka Secret Files Databank`,
      type: 'data_file',
      status: 'hidden',
      description: 'Blueprint databases detailing black projects.',
      info: 'Harvesting ledger index awards +2500¢ credits.'
    });

    // Load to App
    onLoadGig(generatedGig, listEnemies, listNodes, []);
    setGeneratedGig(null);
  };

  const handleLoadCoreGig = (coreItem: typeof CORE_RULEBOOK_GIGS[0]) => {
    audio.playAlert();
    onLoadGig(
      coreItem.gig,
      coreItem.enemies,
      coreItem.netNodes,
      coreItem.obstacles
    );
  };

  return (
    <div className="bg-[#0b0b14]/95 border border-gray-800 p-5 rounded-lg space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2.5 flex-wrap gap-2">
        <span className="text-xs font-mono font-bold text-pink-400 uppercase tracking-widest flex items-center gap-1.5 glow-magenta">
          <Cpu className="text-pink-400 w-4 h-4 animate-pulse" /> NIGHT SCREAMSHEET DATABASE & DISPATCHER
        </span>
        
        {/* Sub Navigation Selectors */}
        <div className="flex bg-black/60 border border-white/5 p-1 rounded text-[10px] font-mono">
          <button
            onClick={() => setDisplayTab('directory')}
            className={`px-3 py-1 rounded transition font-black uppercase flex items-center gap-1 cursor-pointer ${
              displayTab === 'directory' ? 'bg-pink-500 text-black font-extrabold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" /> Core Directory
          </button>
          <button
            onClick={() => setDisplayTab('procedural')}
            className={`px-3 py-1 rounded transition font-black uppercase flex items-center gap-1 cursor-pointer ${
              displayTab === 'procedural' ? 'bg-pink-500 text-black font-extrabold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Procedural Scanner
          </button>
        </div>
      </div>

      {displayTab === 'directory' ? (
        <div className="space-y-4">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            📶 SECURED RETRONET MATRIX: Load authentic Cyberpunk Red core-rulebook scenarios directly into local sessions:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CORE_RULEBOOK_GIGS.map((item) => (
              <div 
                key={item.gig.id} 
                className="bg-black/50 border border-zinc-800 hover:border-pink-500/50 p-4 rounded-lg flex flex-col justify-between space-y-3 transition group relative overflow-hidden"
              >
                {/* Visual Accent */}
                <span className="absolute top-0 right-0 h-10 w-10 bg-radial from-pink-500/15 to-transparent pointer-events-none" />

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                    <span className="text-pink-500 tracking-wider">FIXER: {item.gig.employer}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] ${
                      item.gig.dangerRating === 'Deadly' ? 'bg-red-950 text-red-400 border border-red-500/20' : 
                      item.gig.dangerRating === 'Hard' ? 'bg-orange-950 text-orange-400 border border-orange-500/25' : 
                      'bg-yellow-950 text-yellow-400 border border-yellow-500/25'
                    }`}>{item.gig.dangerRating.toUpperCase()}</span>
                  </div>
                  
                  <h4 className="text-white font-mono font-black tracking-wide text-xs group-hover:text-pink-400 transition">
                    {item.gig.title}
                  </h4>
                  
                  <p className="text-[10px] text-zinc-400 italic line-clamp-2">
                    "{item.gig.premise}"
                  </p>
                </div>

                <div className="text-[9px] font-mono text-zinc-500 space-y-1 bg-zinc-950/40 p-2.5 rounded border border-white/5">
                  <div className="flex justify-between">
                    <span>📐 GRIDS REALM:</span>
                    <span className="text-cyan-400 font-bold">{item.gig.battleArenaLayout.width}x{item.gig.battleArenaLayout.height} Area</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💀 NPC COMBATANTS:</span>
                    <span className="text-orange-400 font-bold">{item.enemies.map(e => e.name).join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>📡 SUBNET LEVELS:</span>
                    <span className="text-emerald-400 font-bold">{item.netNodes.length} Elevator Floors</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { audio.playUIBeep(); openGigInNewWindow(item.gig); }}
                    className="flex-1 py-1.5 bg-[#091524] hover:bg-[#11263d] border border-cyan-500/30 text-cyan-300 rounded font-mono text-[9px] uppercase tracking-wider cursor-pointer text-center"
                  >
                    🖥️ PREVIEW SCREAMSHEET
                  </button>
                  <button
                    onClick={() => handleLoadCoreGig(item)}
                    className="flex-1 py-1.5 bg-pink-600 hover:bg-pink-700 text-white font-mono text-[9.5px] uppercase font-black tracking-widest rounded border border-pink-500 cursor-pointer text-center shadow-[0_0_8px_rgba(236,72,153,0.3)] hover:shadow-[0_0_12px_rgba(236,72,153,0.55)] transition-all"
                  >
                    🔌 LOAD CORE GIG STATE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            🎰 PROCEDURAL SIMULATOR CELL: Generate synthetic corporate data contracts sequentially to acquire custom cash limits:
          </p>

          {generatedGig ? (
            <div className="space-y-4 bg-black/40 border-2 border-dashed border-pink-500/30 p-4 rounded-lg font-mono text-xs">
              
              <div className="flex justify-between items-center bg-[#200a12] p-2 rounded border border-pink-600/20 text-glow-magenta font-black">
                <span className="uppercase text-white tracking-widest">GIG REGISTER: {generatedGig.title}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  generatedGig.dangerRating === 'Deadly' ? 'bg-red-600 text-white' :
                  generatedGig.dangerRating === 'Hard' ? 'bg-orange-500 text-black' :
                  generatedGig.dangerRating === 'Medium' ? 'bg-yellow-500 text-black' : 'bg-emerald-500 text-black'
                }`}>
                  {generatedGig.dangerRating}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                <div>
                  <span className="text-gray-500 font-bold uppercase text-[9px]">Fixer Contact / Contractor</span>
                  <p className="text-cyan-400 font-bold">{generatedGig.employer}</p>
                </div>
                <div>
                  <span className="text-gray-500 font-bold uppercase text-[9px]">Battle Arena Grid Matrix</span>
                  <p className="text-yellow-400 font-bold">
                    {generatedGig.battleArenaLayout.width} x {generatedGig.battleArenaLayout.height} Area
                  </p>
                </div>
              </div>

              <div className="space-y-1 bg-black/50 p-3 rounded border border-white/5">
                <span className="text-gray-500 font-bold uppercase text-[9px] block">Contract Scenario Premise</span>
                <p className="leading-relaxed text-gray-300 italic">"{generatedGig.premise}"</p>
              </div>

              <div className="space-y-2">
                <span className="text-pink-400 font-bold uppercase text-[9px] block">MISSION OBJECTIVES</span>
                <div className="space-y-1.5 text-gray-300">
                  <div className="flex items-start gap-1.5">
                    <span className="text-red-500">🔴</span>
                    <p><strong>Primary:</strong> {generatedGig.primaryObjective}</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-cyan-400">🔵</span>
                    <p><strong>Secondary:</strong> {generatedGig.secondaryObjective}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-[10px] text-gray-500 border-t border-gray-800 pt-3">
                <p>📁 ENVIRONMENT TYPE: {generatedGig.battleArenaLayout.environment}</p>
                <p>🤖 SUBNET NODE DEPTH REGISTERED: {generatedGig.dangerRating === 'Easy' ? '3 levels suitable for Level 1 Netrunners' : '5-6 levels high encrypted Black-ICE wardens'}</p>
              </div>

              {popupBlocked && (
                <div className="bg-yellow-950/20 border border-yellow-500/20 text-yellow-450 p-2.5 rounded text-[10px] leading-relaxed font-bold uppercase tracking-wider animate-pulse">
                  ⚠️ DIGITAL DETOUR: Browser popup blocker bypassed the auto-opening connection. Please utilize the "PREVIEW DOSSIER" button below.
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1.5">
                <button
                  onClick={() => { audio.playUIBeep(); openGigInNewWindow(generatedGig); }}
                  className="w-full py-2 bg-gradient-to-r from-cyan-900/40 to-blue-900/40 hover:from-cyan-900/60 hover:to-blue-900/60 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] uppercase font-bold rounded cursor-pointer transition-all text-center flex items-center justify-center gap-1"
                >
                  🖥️ PREVIEW CONTRACT DOSSIER IN NEW WINDOW
                </button>

                <button
                  onClick={handleLoadProceduralToSystem}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-mono font-black uppercase text-xs tracking-wider rounded border border-red-500 cursor-pointer text-center flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                >
                  🔌 LOAD Screamsheet & SPAWN GANG BOOTY
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-7 text-xs text-gray-500 font-mono space-y-3 border border-dashed border-gray-800 rounded">
              <p>NO ACTIVE SIMULATOR TARGET DETECTED</p>
              <p className="text-[10px] text-gray-600">Click the matrix trigger button below to capture procedural signals.</p>
              
              <button
                onClick={handleGenerateProceduralGig}
                className="mx-auto px-4 py-2 bg-pink-500/10 border border-pink-500/30 hover:bg-pink-500 hover:text-black rounded text-[10px] uppercase font-black tracking-wider transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> PROCEDURAL_SCAN_CORES
              </button>
            </div>
          )}
        </div>
      )}

      {currentGig && (
        <div className="bg-black/40 border border-zinc-800/60 p-3 rounded text-xs font-mono space-y-1">
          <div className="flex justify-between text-zinc-200">
            <span className="text-[10px] text-pink-400 font-black tracking-widest">🛡️ ACTIVE GIG STATUS:</span>
            <span className="text-yellow-400 font-black">[{currentGig.dangerRating}]</span>
          </div>
          <strong className="text-white text-xs block uppercase mt-1">{currentGig.title}</strong>
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-normal">Screamsheet context is linked dynamically to tactical grids & subnet wireframe.</span>
        </div>
      )}
    </div>
  );
}
