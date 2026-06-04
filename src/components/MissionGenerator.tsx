import React, { useState } from 'react';
import { GameState, Gig, Character, NetNode, Weapon } from '../types';
import { audio } from '../audio';
import { getGameTime } from '../utils';
import { Target, Shield, Compass, ChevronRight, Zap, RefreshCw, Cpu, Award } from 'lucide-react';

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
  onLoadGig: (gig: Gig, enemies: Character[], netArch: NetNode[]) => void;
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

export default function MissionGenerator({ logs, currentGig, onLoadGig }: MissionGeneratorProps) {
  const [generatedGig, setGeneratedGig] = useState<Gig | null>(null);
  const [popupBlocked, setPopupBlocked] = useState<boolean>(false);

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

    // Objectives mapping
    let primary = "Retrieve the physical data-storage core on coordinate G-09.";
    let secondary = "Download corporate ledger ledger from Floor 3 Net password.";
    let gridW = 10;
    let gridH = 10;

    if (danger === 'Easy') {
      primary = "Retrieve the physical ledger drive.";
      secondary = "Bypass the security gate terminal without alarms.";
      gridW = 8;
      gridH = 8;
    } else if (danger === 'Medium') {
      primary = "Eliminate the rogue tech specialist.";
      secondary = "Infiltrate and disable the ceiling bullet turret CC-01 control node.";
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

    // Attempt auto-opening in a new window/tab
    setTimeout(() => {
      const opened = openGigInNewWindow(gig);
      if (!opened) {
        setPopupBlocked(true);
      }
    }, 150);
  };

  const handleLoadToSystem = () => {
    if (!generatedGig) return;

    audio.playAlert();

    // 1. Generate enemies based on danger rating
    const listEnemies: Character[] = [];
    const rating = generatedGig.dangerRating;

    const baseWeaponPistol: Weapon = { id: 'wpn_g_pistol', name: 'Militech Heavy Pistol', type: 'pistol', damage: '3d6', ammo: 8, maxAmmo: 8 };
    const baseWeaponShotgun: Weapon = { id: 'wpn_g_shot', name: 'Pump Action Shotgun', type: 'shotgun', damage: '5d6', ammo: 4, maxAmmo: 4 };
    const baseWeaponRifle: Weapon = { id: 'wpn_g_rifle', name: 'Assault Rifle', type: 'rifle', damage: '5d6', ammo: 30, maxAmmo: 30, autofireRating: 3 };
    const baseMeleeClaws: Weapon = { id: 'wpn_g_melee', name: 'Cyber Wolvers', type: 'melee', damage: '3d6', ammo: 1, maxAmmo: 1 };

    if (rating === 'Easy') {
      // Arasaka Cop Security (Low-mid threat)
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
        tauntText: "NCPD clear, you're trespassing on Arasaka grid!",
        x: 6, y: 5
      });
    } else if (rating === 'Medium') {
      // Street Samurai and Rogue Techie
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
        tauntText: "My claws are faster than your reflex board!",
        x: 7, y: 6
      });
      listEnemies.push({
        id: 'enemy_techie1',
        name: 'Rogue Booster Techie',
        isPlayer: false,
        isAlly: false,
        ref: 5, dex: 5, tech: 8, cool: 4, move: 5,
        hp: 30, maxHp: 30,
        spHead: 7, spTorso: 7,
        weapons: [baseWeaponPistol],
        currentWeaponId: 'wpn_g_pistol',
        initiative: 0,
        isCovered: true,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "Turret calibration online, get shredded!",
        x: 8, y: 7
      });
    } else if (rating === 'Hard') {
      // Militech Soldier + Medtechie
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
        tauntText: "Target locked, executing full-metal suppressive spray!",
        x: 9, y: 8
      });
      listEnemies.push({
        id: 'enemy_medtech1',
        name: 'Booster Combat Medtech',
        isPlayer: false,
        isAlly: false,
        ref: 6, dex: 6, tech: 8, cool: 5, move: 6,
        hp: 35, maxHp: 35,
        spHead: 7, spTorso: 11,
        weapons: [baseWeaponShotgun],
        currentWeaponId: 'wpn_g_shot',
        initiative: 0,
        isCovered: true,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "Prepping speedheal injectors, hold the sector!",
        x: 8, y: 9
      });
    } else {
      // DEADLY: Militech Strike Soldier, Street Samurai, Rogue Techie!
      listEnemies.push({
        id: 'enemy_militech_sol2',
        name: 'Commander Militech Elite',
        isPlayer: false,
        isAlly: false,
        ref: 8, dex: 7, tech: 6, cool: 7, move: 6,
        hp: 55, maxHp: 55,
        spHead: 14, spTorso: 14, // Heavy Metal Gear!
        weapons: [baseWeaponRifle],
        currentWeaponId: 'wpn_g_rifle',
        initiative: 0,
        isCovered: false,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "You stumbled into a direct execution block, gonk!",
        x: 10, y: 8
      });
      listEnemies.push({
        id: 'enemy_com_sam1',
        name: 'Maelstrom Street Predator',
        isPlayer: false,
        isAlly: false,
        ref: 8, dex: 8, tech: 4, cool: 5, move: 8,
        hp: 40, maxHp: 40,
        spHead: 7, spTorso: 11,
        weapons: [baseMeleeClaws],
        currentWeaponId: 'wpn_g_melee',
        initiative: 0,
        isCovered: false,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "Ripping your cyberdeck apart with high-frequency chrome!",
        x: 9, y: 10
      });
      listEnemies.push({
        id: 'enemy_tech_boss',
        name: 'Arasaka Defect Cyber-techie',
        isPlayer: false,
        isAlly: false,
        ref: 6, dex: 6, tech: 9, cool: 5, move: 6,
        hp: 35, maxHp: 35,
        spHead: 11, spTorso: 11,
        weapons: [baseWeaponShotgun],
        currentWeaponId: 'wpn_g_shot',
        initiative: 0,
        isCovered: true,
        isDead: false,
        criticalInjuries: [],
        stealthState: 'none',
        facedownPenalty: false,
        tauntText: "Subnet grid closed, preparing feedback neuron fried!",
        x: 11, y: 9
      });
    }

    // 2. Generate customized Subnet Net Architecture matched to difficulty
    const listNodes: NetNode[] = [];
    const floorLimit = rating === 'Easy' ? 3 : rating === 'Medium' ? 4 : rating === 'Hard' ? 5 : 6;

    // Floor 1 Access Point
    listNodes.push({
      id: `${generatedGig.id}_f1`,
      floor: 1,
      name: `Access Point AP-${Math.floor(Math.random() * 90) + 10}`,
      type: 'access_point',
      status: 'revealed',
      description: 'Physical junction terminal located in sector walls.',
      info: 'Interface Hack Success grants immediate Net Architecture maps of higher nodes.'
    });

    if (floorLimit >= 3) {
      listNodes.push({
        id: `${generatedGig.id}_f2`,
        floor: 2,
        name: `Subnet Encryption Password Block`,
        type: 'password',
        status: 'hidden',
        description: 'Military encryption gate safeguarding higher levels.',
        info: 'Requires standard Breach Decryption minigame to unlock.'
      });
    }

    if (floorLimit >= 4) {
      const turretName = `Automated Turret MC-0${Math.floor(Math.random() * 4) + 1}`;
      listNodes.push({
        id: `${generatedGig.id}_f3`,
        floor: 3,
        name: `${turretName} Controller Node`,
        type: 'control_node',
        status: 'hidden',
        description: `Active floor heavy autogun defense system block.`,
        info: 'If Hijacked via Net Control, boots up as an active combat ally to shred Maelstrom boosters!',
        controlOption: {
          controlled: false,
          name: turretName
        }
      });
    }

    if (floorLimit >= 5) {
      const iceHp = rating === 'Hard' ? 25 : 35;
      const iceAttack = rating === 'Hard' ? 6 : 8;
      const iceDmg = rating === 'Hard' ? '2d6' : '3d6';
      
      listNodes.push({
        id: `${generatedGig.id}_f4`,
        floor: 4,
        name: `VIRTUAL BRUTE: HELLHOUND V2`,
        type: 'black_ice',
        status: 'hidden',
        description: 'Glowing red digital hound programmed to melt Netrunner synthetic brain lobes.',
        info: `Attacks deal ${iceDmg} direct fire. Base Rez Armor: ${iceHp}.`,
        blackICE: {
          name: 'HELLHOUND PRO',
          type: 'Anti-Personnel Killer ICE',
          hp: iceHp,
          maxHp: iceHp,
          speed: 7,
          attack: iceAttack,
          damage: iceDmg,
          description: 'A terrifying digital program targeting hacker cortex.'
        }
      });
    }

    if (floorLimit >= 6) {
      listNodes.push({
        id: `${generatedGig.id}_f5`,
        floor: 5,
        name: `Arasaka Secret Files Databank`,
        type: 'data_file',
        status: 'hidden',
        description: 'Encrypted blueprint catalog indexing Black Chrome specs.',
        info: 'Extracting this ledger awards a whopping +3500¢ local corporate credit!'
      });
    }

    // Default file if not 6 levels to ensure file harvesting is possible
    if (floorLimit < 6) {
      listNodes.push({
        id: `${generatedGig.id}_f${floorLimit}`,
        floor: floorLimit,
        name: `Targeted Corporate Ledgers Core`,
        type: 'data_file',
        status: 'hidden',
        description: 'Physical ledger coordinates matching fixer gig specifications.',
        info: `Provides +2000¢ data cash directly to wallet memory.`
      });
    }

    onLoadGig(generatedGig, listEnemies, listNodes);
    setGeneratedGig(null);
  };

  return (
    <div className="bg-[#0b0b14]/95 border border-gray-800 p-5 rounded-lg space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
        <span className="text-xs font-mono font-bold text-pink-400 uppercase tracking-widest flex items-center gap-1.5">
          <Cpu className="text-pink-400 w-4 h-4" /> SCREENSCREAMSHEET & GIG DISPATCH
        </span>
        <button
          onClick={handleGenerateProceduralGig}
          className="px-3 py-1.5 bg-pink-500/10 border border-pink-500/30 hover:bg-pink-500 hover:text-black rounded text-[10px] uppercase font-black tracking-wider transition cursor-pointer flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> PROCEDURAL_SCAN_CORES
        </button>
      </div>

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
              onClick={handleLoadToSystem}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-mono font-black uppercase text-xs tracking-wider rounded border border-red-500 cursor-pointer text-center flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)]"
            >
              🔌 LOAD Screamsheet & SPAWN GANG BOOTY
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-7 text-xs text-gray-500 font-mono space-y-2 border border-dashed border-gray-800 rounded">
          {currentGig ? (
            <div className="space-y-1.5 px-4 text-left">
              <div className="flex justify-between text-[#ffffff]">
                <strong className="text-pink-400 text-xs text-glow-magenta uppercase">CURRENT ACTIVE GIG:</strong>
                <span className="text-yellow-400 text-[10px] uppercase font-black">[{currentGig.dangerRating}]</span>
              </div>
              <p className="font-bold text-white uppercase text-xs mt-1">{currentGig.title}</p>
              <div className="text-[10px] text-gray-400 space-y-1">
                <p>📍 PREMISE: {currentGig.premise}</p>
                <p>🔥 FIELD ARENA dimensions: {currentGig.battleArenaLayout.width}x{currentGig.battleArenaLayout.height}</p>
                <p className="text-emerald-400">🥅 Primary Objective: {currentGig.primaryObjective}</p>
              </div>
              
              <div className="pt-2.5">
                <button
                  onClick={() => { audio.playUIBeep(); openGigInNewWindow(currentGig); }}
                  className="w-full py-2 bg-[#091524] hover:bg-[#11263d] border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 rounded font-mono text-[10px] uppercase font-bold cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  🖥️ OPEN ACTIVE GIG DOSSIER IN NEW WINDOW
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4">
              <p>NO ACTIVE SCREAMSHEET DETECTED</p>
              <p className="text-[10px] text-gray-600">Click "PROCEDURAL_SCAN_CORES" above to scan for live corporate contracts.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
