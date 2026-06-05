import React, { useState, useEffect, useRef } from 'react';
import { NetNode, LogEntry, Character } from '../types';
import { getGameTime, rollD10 } from '../utils';
import { audio } from '../audio';
import BreachMinigame from './BreachMinigame';
import {
  Cpu, Lock, Unlock, ArrowDownCircle, ShieldAlert, Key, FolderOpen,
  ChevronDown, Layers, Terminal, Play, Zap, HelpCircle, Shield, Eye, Activity, RotateCcw
} from 'lucide-react';

interface NetrunGridProps {
  netArchitecture: NetNode[];
  currentNetFloor: number;
  synapseHp: number;
  maxSynapseHp: number;
  credits: number;
  player: Character;
  updateState: (newState: {
    netArchitecture?: NetNode[];
    currentNetFloor?: number;
    synapseHp?: number;
    credits?: number;
    logs?: LogEntry[];
    player?: Character;
  }) => void;
  logs: LogEntry[];
  onTurretHackSuccess: () => void;
  onJackOut?: () => void;
}

export default function NetrunGrid({
  netArchitecture,
  currentNetFloor,
  synapseHp,
  maxSynapseHp,
  credits,
  player,
  updateState,
  logs,
  onTurretHackSuccess,
  onJackOut,
}: NetrunGridProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(netArchitecture[0]?.id || '');
  const [netActionBudget, setNetActionBudget] = useState<number>(3);
  const [activePrograms, setActivePrograms] = useState<Array<{ name: string; type: string; desc: string }>>([
    { name: 'Worm.EXE', type: 'Utility', desc: '+2 to next Hacking interface check' },
    { name: 'Sword.EXE', type: 'Attack', desc: 'Slices Black-ICE for 15 REZ point damage' },
    { name: 'Shield.EXE', type: 'Defense', desc: 'Absorbs 10 cognitive neural biofeedback shock' }
  ]);
  const [isBreaching, setIsBreaching] = useState(false);
  const [breachTargetNode, setBreachTargetNode] = useState<NetNode | null>(null);
  
  // Cyberpunk Core Rules Netrunner Status Props
  const [cloakBuffer, setCloakBuffer] = useState<number>(0);
  const [vibeMode, setVibeMode] = useState<'normal' | 'pathfinder_success' | 'threat_encountered' | 'beam_attack'>('normal');
  const [lastCheckResult, setLastCheckResult] = useState<string>('System idle. Ready for command deck entry.');

  // Canvas ref for retro 3D Wireframe Black ICE rotating octahedron
  const wireframeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cubeAnimRef = useRef<number | null>(null);

  const selectedNode = netArchitecture.find(n => n.id === selectedNodeId) || netArchitecture[0];

  // Monitor threat detection to switch background vibe modes automatically
  useEffect(() => {
    if (selectedNode && selectedNode.type === 'black_ice' && selectedNode.status !== 'completed' && selectedNode.blackICE && selectedNode.blackICE.hp > 0) {
      setVibeMode('threat_encountered');
    } else {
      setVibeMode('normal');
    }
  }, [selectedNodeId, selectedNode]);

  useEffect(() => {
    const canvas = wireframeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angleX = 0;
    let angleY = 0;

    // Revolving octahedron threat
    const vertices = [
      [0, 1.25, 0],
      [1, 0, 1],
      [1, 0, -1],
      [-1, 0, -1],
      [-1, 0, 1],
      [0, -1.25, 0]
    ];

    const faces = [
      [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1],
      [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]
    ];

    const draw = () => {
      cubeAnimRef.current = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Spin speed increases dramatically if in danger threat node
      const speedMultiplier = vibeMode === 'threat_encountered' ? 3.5 : 1.0;
      angleX += 0.012 * speedMultiplier;
      angleY += 0.010 * speedMultiplier;

      const projected: Array<[number, number]> = [];
      const scale = vibeMode === 'threat_encountered' ? 62 : 48;
      const originX = width / 2;
      const originY = height / 2;

      vertices.forEach(v => {
        let y1 = v[1] * Math.cos(angleX) - v[2] * Math.sin(angleX);
        let z1 = v[1] * Math.sin(angleX) + v[2] * Math.cos(angleX);
        let x2 = v[0] * Math.cos(angleY) + z1 * Math.sin(angleY);
        let z2 = -v[0] * Math.sin(angleY) + z1 * Math.cos(angleY);

        const dist = 3.2;
        const scaleFactor = scale / (z2 + dist);
        const px = x2 * scaleFactor + originX;
        const py = y1 * scaleFactor + originY;
        projected.push([px, py]);
      });

      // Adaptive color rendering
      if (vibeMode === 'threat_encountered') {
        ctx.strokeStyle = '#ff003c'; // Cyberpunk Red
        ctx.shadowColor = '#ff5500';
        ctx.shadowBlur = 12;
      } else if (vibeMode === 'pathfinder_success') {
        ctx.strokeStyle = '#39ff14'; // Matrix toxic Green
        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 15;
      } else {
        ctx.strokeStyle = '#ff00ff'; // Neon Magenta
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 6;
      }
      ctx.lineWidth = 1.8;

      faces.forEach(face => {
        const p1 = projected[face[0]];
        const p2 = projected[face[1]];
        const p3 = projected[face[2]];

        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.lineTo(p3[0], p3[1]);
        ctx.closePath();
        ctx.stroke();
      });

      // Pulse particle orbits in threat_encountered mode
      if (vibeMode === 'threat_encountered') {
        ctx.fillStyle = '#ff0055';
        for (let i = 0; i < 3; i++) {
          const particleT = Date.now() * 0.003 + i * 2;
          const px = originX + Math.cos(particleT) * 45;
          const py = originY + Math.sin(particleT * 1.5) * 20;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.shadowBlur = 0;
    };

    draw();

    return () => {
      if (cubeAnimRef.current) cancelAnimationFrame(cubeAnimRef.current);
    };
  }, [selectedNodeId, vibeMode]);

  const addLog = (message: string, type: 'netrun' | 'system' = 'netrun') => {
    const newE: LogEntry = {
      id: `log_net_${Date.now()}_${Math.random()}`,
      timestamp: getGameTime(),
      type,
      message
    };
    return newE;
  };

  const checkActionBudgetAndNotify = (): boolean => {
    if (netActionBudget <= 0) {
      audio.playGlitch();
      alert("💥 DEC DEVIATION: No deck processing cycles remaining this turn! Click 'END NETRUNNER TURN' to refresh cycles.");
      return false;
    }
    return true;
  };

  // Turn budget reset
  const handleEndTurn = () => {
    audio.playUIBeep();
    setNetActionBudget(3);
    const msg = `🔋 TURN END: Cyberdeck cooling cycles executed. Processors refreshed to [3 / 3] Action Points (AP).`;
    updateState({
      logs: [addLog(msg, 'system'), ...logs]
    });
    setLastCheckResult("Deck AP budget refreshed. CPU cycles normalized.");
  };

  // 1. Interface Ability: SCAN (1 AP)
  const handleScanNet = () => {
    if (!checkActionBudgetAndNotify()) return;
    audio.playNetChirp();

    const info = `LEVEL 01 ACCESS PORT: OK // FLOOR DETAILS UNVEILED // Latency: 9ms`;
    setLastCheckResult(`[SCAN AP-01]: Node configuration logged. Threat metrics initialized.`);
    setNetActionBudget(prev => prev - 1);

    const msg = `📡 SCAN INTERFACE: Spent 1 AP. Analyzed hardware signatures. Nodes revealed.`;
    updateState({
      logs: [addLog(msg), ...logs]
    });
  };

  // 2. Interface Ability: PATHFINDER (1 AP)
  const handlePathfinderNet = () => {
    if (!checkActionBudgetAndNotify()) return;
    audio.playNetChirp();

    // Pathfinder roll: d10 + Interface (say +7) against DV 12
    const roll = rollD10();
    const interfaceBonus = 7;
    const totalCheck = roll.total + interfaceBonus;
    const dvResult = 12;
    const success = totalCheck >= dvResult;

    setNetActionBudget(prev => prev - 1);
    
    if (success) {
      audio.playNetSuccess();
      setVibeMode('pathfinder_success');
      setTimeout(() => setVibeMode('normal'), 3000);

      // Reveal all layers
      const nextArch = netArchitecture.map(node => {
        return { ...node, status: node.status === 'hidden' ? ('revealed' as const) : node.status };
      });

      const successMsg = `⚡ PATHFINDER SUCCESS: Rolled (${roll.total} + ${interfaceBonus}) = ${totalCheck} vs DV 12! Illuminated all hidden paths down the elevator stack with toxic green cascading raw code!`;
      setLastCheckResult(`Pathfinder Check SUCCESS: Roll ${totalCheck} >= DV 12. Full architecture mapped.`);
      
      updateState({
        netArchitecture: nextArch,
        logs: [addLog(successMsg, 'system'), ...logs]
      });
    } else {
      audio.playNetFailure();
      const failMsg = `⚠️ PATHFINDER INSUFFICIENT: Rolled (${roll.total} + ${interfaceBonus}) = ${totalCheck} vs DV 12. Deep subnet layers remain cloaked in data haze.`;
      setLastCheckResult(`Pathfinder Check FAILED: Roll ${totalCheck} < DV 12. Nodes remain cloaked.`);
      updateState({
        logs: [addLog(failMsg), ...logs]
      });
    }
  };

  // Node navigation
  const handleSelectNode = (node: NetNode) => {
    if (node.floor > currentNetFloor && node.status === 'hidden') {
      alert("⚠️ SUB DETOUR: Secure matrix. Perform scanned Pathfinder checks to locate path!");
      return;
    }
    audio.playUIBeep();
    setSelectedNodeId(node.id);
  };

  // Password / terminal decrypt minigame starter
  const handleInitiateBreach = (node: NetNode) => {
    if (!checkActionBudgetAndNotify()) return;
    setBreachTargetNode(node);
    setIsBreaching(true);
  };

  const handleBreachSuccess = () => {
    setIsBreaching(false);
    if (!breachTargetNode) return;

    setNetActionBudget(prev => prev - 1);

    const nextArch = netArchitecture.map(node => {
      if (node.id === breachTargetNode.id) {
        return { ...node, status: 'completed' as const };
      }
      if (node.floor === breachTargetNode.floor + 1) {
        return { ...node, status: 'revealed' as const };
      }
      return node;
    });

    let successMsg = `🔓 INTERFACE DEC SUCCESSFUL: Security gate bypassed on ${breachTargetNode.name}! `;
    if (breachTargetNode.type === 'control_node') {
      successMsg += `🤖 Hacked ceiling heavy autogun CC-01! Applied override code to join combat turn initiative sequence!`;
      onTurretHackSuccess();
    } else {
      successMsg += `Data elevators unlocked. Ascending deeper into register files.`;
    }

    setLastCheckResult(`Breach Decrypt Success on floor ${breachTargetNode.floor}. AP spent.`);
    updateState({
      netArchitecture: nextArch,
      currentNetFloor: Math.max(currentNetFloor, breachTargetNode.floor + 1),
      logs: [addLog(successMsg, 'system'), ...logs]
    });

    const nextNode = nextArch.find(n => n.floor === breachTargetNode.floor + 1);
    if (nextNode) {
      setSelectedNodeId(nextNode.id);
    }
  };

  const handleBreachFailure = () => {
    setIsBreaching(false);
    if (!breachTargetNode) return;

    setNetActionBudget(prev => prev - 1);

    // Apply immediate Brainburn Biofeedback direct damage to physical HP
    const bioFeedbackDmg = Math.floor(Math.random() * 6) + 5; // 5-10 cognitive feedback points
    const nextPlayerHp = Math.max(0, player.hp - bioFeedbackDmg);
    const nextSynHp = Math.max(0, synapseHp - bioFeedbackDmg);

    const failMsg = `💥 COGNITIVE SHOCK BURST: Alternating vector mismatch on ${breachTargetNode.name}. Biosensor surge handles -${bioFeedbackDmg} physical brainfry damage directly inside runner's synthetic cortex!`;
    setLastCheckResult(`Breach Failed. Sustained ${bioFeedbackDmg} direct Biofeedback damage.`);
    
    updateState({
      synapseHp: nextSynHp,
      player: { ...player, hp: nextPlayerHp, isDead: nextPlayerHp <= 0 },
      logs: [addLog(failMsg), ...logs]
    });
  };

  // 3. Interface Ability: SLIDE (1 AP)
  const handleSlideNet = () => {
    if (!checkActionBudgetAndNotify()) return;
    if (!selectedNode.blackICE) {
      alert("Slide calculations require an active Hostile Black ICE program!");
      return;
    }
    audio.playNetChirp();
    setNetActionBudget(prev => prev - 1);

    const roll = rollD10();
    const slideCheck = roll.total + 7; // Dex / Net bonus
    const iceEsc = (selectedNode.blackICE.speed || 5) + 7;
    const success = slideCheck >= iceEsc;

    let text = '';
    let nextArch = [...netArchitecture];

    if (success) {
      audio.playNetSuccess();
      text = `🏃 SLIDE EVADE SUCCESS: Check ${slideCheck} vs Speed DV ${iceEsc}. Netrunner slips around ${selectedNode.blackICE.name} to the next server core!`;
      setLastCheckResult(`Slide Success vs ${selectedNode.blackICE.name} (${slideCheck} vs DV ${iceEsc})`);

      nextArch = netArchitecture.map(node => {
        if (node.id === selectedNode.id) {
          return { ...node, status: 'completed' as const };
        }
        if (node.floor === selectedNode.floor + 1) {
          return { ...node, status: 'revealed' as const };
        }
        return node;
      });

      updateState({
        netArchitecture: nextArch,
        currentNetFloor: Math.max(currentNetFloor, selectedNode.floor + 1),
        logs: [addLog(text), ...logs]
      });

      const nextNode = nextArch.find(n => n.floor === selectedNode.floor + 1);
      if (nextNode) {
        setSelectedNodeId(nextNode.id);
      }
    } else {
      audio.playNetFailure();
      setVibeMode('threat_encountered');
      text = `💥 SLIDE ENTRAPMENT FAILED: Check ${slideCheck} vs speed DV ${iceEsc}. Apex runner trapped by firewall! ICE starts immediate brainfeed purge cycle!`;
      setLastCheckResult(`Slide FAILED. Netrunner trapped on Floor ${selectedNode.floor}.`);
      updateState({
        logs: [addLog(text), ...logs]
      });
      handleBlackIceAttack();
    }
  };

  // 4. Black ICE Counterattack Engine
  const handleBlackIceAttack = () => {
    if (!selectedNode.blackICE) return;
    audio.playGlitch();

    setTimeout(() => {
      audio.playNetFailure();
      
      // Calculate ice attack roll d10 + attack vs d10 + player.ref (Evasion defense)
      const iceAttackRoll = rollD10().total + selectedNode.blackICE.attack;
      const playerEvasion = rollD10().total + 8; // Evasion index
      
      let finalDamage = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 4; // 2d6 + 4
      
      // Apply Cloak buffer defenses if active
      if (cloakBuffer > 0) {
        finalDamage = Math.max(2, finalDamage - cloakBuffer);
      }

      const nextPlayerHp = Math.max(0, player.hp - finalDamage);
      const nextSynHp = Math.max(0, synapseHp - finalDamage);

      const logText = `👿 ${selectedNode.blackICE.name} COUNTERSTRIKE: Spews neural shockwave fire. Rolled ${iceAttackRoll} vs Evasion ${playerEvasion}. Searing blast deals -${finalDamage} DIRECT PHYSICAL HP Damage & Synaptic damage! [HP Remaining: ${nextPlayerHp}/${player.maxHp}]`;
      setLastCheckResult(`ICE Attack hit runner for ${finalDamage} damage! Physical HP critical.`);
      
      updateState({
        synapseHp: nextSynHp,
        player: { ...player, hp: nextPlayerHp, isDead: nextPlayerHp <= 0 },
        logs: [addLog(logText, 'netrun'), ...logs]
      });
    }, 450);
  };

  // 5. Interface Ability: INTERFACE / Activate PROGRAM (Sword.EXE) (1 AP)
  const handleDeploySword = () => {
    if (!checkActionBudgetAndNotify()) return;
    if (!selectedNode.blackICE) {
      alert("Deploying Sword.EXE program requires a hostile Black ICE node program!");
      return;
    }
    audio.playGlitch();
    setNetActionBudget(prev => prev - 1);
    setVibeMode('beam_attack');
    setTimeout(() => setVibeMode('normal'), 800);

    const checkRoll = rollD10();
    const interfaceBonus = 7;
    const finalAttack = checkRoll.total + interfaceBonus;
    const defenderEvasionSpeed = selectedNode.blackICE.speed + 7; // Evasion DV threshold
    const isHit = finalAttack >= defenderEvasionSpeed;

    let successMsg = `⚔️ DEPLOY [SWORD.EXE]: Interface roll (${checkRoll.total} + ${interfaceBonus}) = ${finalAttack} vs ICE Evasion DV ${defenderEvasionSpeed}. `;
    let nextArch = [...netArchitecture];

    if (isHit) {
      audio.playNetSuccess();
      const dmg = 15; // static heavy program slash
      const currentIceHp = selectedNode.blackICE.hp;
      const nextIceHp = Math.max(0, currentIceHp - dmg);

      nextArch = netArchitecture.map(node => {
        if (node.id === selectedNode.id && node.blackICE) {
          return {
            ...node,
            blackICE: { ...node.blackICE, hp: nextIceHp },
            status: nextIceHp <= 0 ? ('completed' as const) : node.status
          };
        }
        if (node.floor === selectedNode.floor + 1 && nextIceHp <= 0) {
          return { ...node, status: 'revealed' as const };
        }
        return node;
      });

      successMsg += `DIRECT HIT! Slices program matrix registry for ${dmg} REZ structural damage! `;
      if (nextIceHp <= 0) {
        successMsg += `ICE program flatlined! Subnet sector completely safe.`;
        setLastCheckResult(`Sword.EXE Hit! Flatlined ${selectedNode.blackICE.name}.`);
      } else {
        successMsg += `ICE Integrity status: [${nextIceHp}/${selectedNode.blackICE.maxHp} REZ]`;
        setLastCheckResult(`Sword.EXE Hit! Deals 15 damage. ${nextIceHp} REZ remaining.`);
      }

      updateState({
        netArchitecture: nextArch,
        currentNetFloor: nextIceHp <= 0 ? Math.max(currentNetFloor, selectedNode.floor + 1) : currentNetFloor,
        logs: [addLog(successMsg, 'system'), ...logs]
      });

      if (nextIceHp <= 0) {
        const nextNode = nextArch.find(n => n.floor === selectedNode.floor + 1);
        if (nextNode) {
          setSelectedNodeId(nextNode.id);
        }
      }
    } else {
      audio.playNetFailure();
      successMsg += `INTERFACE MISS! Black ICE evade matrix redirected the attack vector.`;
      setLastCheckResult(`Sword.EXE attack MISSED vs ${selectedNode.blackICE.name}.`);
      updateState({
        logs: [addLog(successMsg), ...logs]
      });
      handleBlackIceAttack();
    }
  };

  // 6. Interface Ability: CLOAK (1 AP)
  const handleCloakNet = () => {
    if (!checkActionBudgetAndNotify()) return;
    audio.playNetChirp();
    setNetActionBudget(prev => prev - 1);

    const nextCloak = Math.min(6, cloakBuffer + 2);
    setCloakBuffer(nextCloak);

    const logText = `🛡️ CLOAK DEPLOYED: Spent 1 AP. Netrunner trail encryption strengthened. Absorbs +${nextCloak} biofeedback damage points.`;
    setLastCheckResult(`Cloak Buff active: +${nextCloak} defense protection.`);
    updateState({
      logs: [addLog(logText, 'system'), ...logs]
    });
  };

  // 7. Interface Ability: VIRUS (1 AP)
  const handleVirusNet = () => {
    if (!checkActionBudgetAndNotify()) return;
    audio.playNetChirp();
    setNetActionBudget(prev => prev - 1);

    const roll = rollD10().total + 7;
    const success = roll >= 12;

    if (success) {
      audio.playNetSuccess();
      const bonusCredits = 1000;
      const totalCredits = credits + bonusCredits;
      const successMsg = `🦠 VIRUS INSTALLED: Spent 1 AP. Decrypted local sub-processor node cleanly. Harvested security bypass cash: +${bonusCredits}¢ credits!`;
      setLastCheckResult(`Virus check SUCCEEDED (+1000¢ credits unlocked).`);
      updateState({
        credits: totalCredits,
        logs: [addLog(successMsg, 'system'), ...logs]
      });
    } else {
      audio.playNetFailure();
      const failMsg = `⚠️ VIRUS EXPIRED: Spent 1 AP. Roll failed to disrupt sector register arrays. Sub-system purged.`;
      setLastCheckResult(`Virus check FAILED.`);
      updateState({
        logs: [addLog(failMsg), ...logs]
      });
    }
  };

  // 8. Data File harvesting
  const handleHarvestDataFile = (node: NetNode) => {
    if (!checkActionBudgetAndNotify()) return;
    audio.playNetSuccess();
    setNetActionBudget(prev => prev - 1);

    const award = 2500;
    const nextCredits = credits + award;

    const nextArch = netArchitecture.map(n => {
      if (n.id === node.id) {
        return { ...n, status: 'completed' as const };
      }
      return n;
    });

    const msg = `💰 DATA FILE HARVESTED: Spent 1 AP. Downloaded corp mainframe dossiers! +${award}¢ local credits retrieved. Wallet total: ${nextCredits}¢`;
    setLastCheckResult(`Data exfiltrated successfully. Accumulated +2500¢ credits.`);

    updateState({
      netArchitecture: nextArch,
      credits: nextCredits,
      logs: [addLog(msg, 'system'), ...logs]
    });
  };

  // 9. Interactive emergency Jack Out safety safety checks
  const handleEmergencyJackOut = () => {
    audio.playUIBeep();
    
    // Scan if any revealed, incomplete Black ICE is alive
    const hasLiveIce = netArchitecture.some(node => {
      return node.type === 'black_ice' && node.status !== 'completed' && node.blackICE && node.blackICE.hp > 0;
    });

    if (hasLiveIce) {
      // Must roll d10 + Interface (7) against DV 10 to jack out safely
      const check = rollD10();
      const totalCheck = check.total + 7;
      const success = totalCheck >= 10;

      if (success) {
        audio.playNetSuccess();
        const logsMsg = `⚡ DISCONNECTION SAFE: Rolled (${check.total} + 7) = ${totalCheck} vs DV 10. Cyberdeck safely isolated and jacked out without biofeedback shock!`;
        updateState({
          logs: [addLog(logsMsg, 'system'), ...logs]
        });
        if (onJackOut) onJackOut();
      } else {
        audio.playNetFailure();
        const shockDmg = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2; // 2d6
        const nextHp = Math.max(0, player.hp - shockDmg);
        const nextSynHp = Math.max(0, synapseHp - shockDmg);

        const logsMsg = `💥 SHOCK INFLICTED: Rolled (${check.total} + 7) = ${totalCheck} vs DV 10 (FAILED). Cortex fried! Sustained -${shockDmg} direct physical damage! Emergency systems disconnected anyway.`;
        updateState({
          synapseHp: nextSynHp,
          player: { ...player, hp: nextHp, isDead: nextHp <= 0 },
          logs: [addLog(logsMsg, 'netrun'), ...logs]
        });
        if (onJackOut) onJackOut();
      }
    } else {
      // Disconnect safely with no rolls
      audio.playNetSuccess();
      const msgChirp = `⚡ JACK OUT SUCCESS: Connection closed cleanly. No active ICE program hazard detected. Returning to grid viewport.`;
      updateState({
        logs: [addLog(msgChirp, 'system'), ...logs]
      });
      if (onJackOut) onJackOut();
    }
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-12 gap-6 transition-all duration-300 ${vibeMode === 'threat_encountered' ? 'animate-shake' : ''}`}>
      
      {/* 5-floor subnet wireframe levels list (md:col-span-5) */}
      <div className={`md:col-span-5 bg-[#0a0a14]/90 border rounded-lg p-4 space-y-4 shadow-xl relative transition-all duration-350 ${
        vibeMode === 'pathfinder_success' 
          ? 'border-emerald-500 shadow-[0_0_20px_rgba(57,255,20,0.3)] cyber-matrix-green-code' 
          : vibeMode === 'threat_encountered'
          ? 'border-red-500/60 shadow-[0_0_20px_rgba(255,0,0,0.2)] bg-[#100306]/95'
          : 'border-emerald-500/30 shadow-[0_0_15px_rgba(0,255,100,0.1)]'
      }`}>
        <div className="absolute top-0 right-4 flex gap-1 translate-y-[-50%]">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded ${
            vibeMode === 'threat_encountered' ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-500 text-black'
          }`}>
            {vibeMode === 'threat_encountered' ? '🔴 DANGER:_THREAT_ACTIVE' : '🟢 DECK_ONLINE_TRON'}
          </span>
        </div>

        <div className="border-b border-emerald-500/20 pb-2.5 flex justify-between items-center">
          <span className="text-xs font-mono font-bold text-[#39ff14]/80 uppercase tracking-widest flex items-center gap-1.5 glow-green">
            <Layers className="w-4 h-4 text-[#39ff14] animate-pulse" /> SUBNETWORK ARCHITECTURE
          </span>
          <div className="flex gap-2">
            <button
              onClick={handlePathfinderNet}
              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/30 border border-emerald-400/40 text-[#39ff14] font-mono text-[9px] rounded transition-all uppercase cursor-pointer flex items-center gap-1"
              title="Locate hidden nodes"
            >
              <Eye className="w-3 h-3 text-emerald-400" /> PATHFINDER
            </button>
            <button
              onClick={handleScanNet}
              className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-mono text-[9px] rounded transition-all uppercase cursor-pointer"
              title="Obtain floor metrics"
            >
              SCAN
            </button>
          </div>
        </div>

        {/* Stack list layers */}
        <div className="flex flex-col gap-2.5">
          {netArchitecture
            .slice()
            .reverse() 
            .map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isHidden = node.status === 'hidden' && node.floor > currentNetFloor;
              const isCompleted = node.status === 'completed';

              return (
                <button
                  key={node.id}
                  onClick={() => handleSelectNode(node)}
                  disabled={isHidden}
                  className={`w-full p-3 border rounded text-left font-mono text-xs transition-all relative flex items-center justify-between cursor-pointer ${
                    isHidden
                      ? 'border-gray-950 bg-black/50 text-gray-700 opacity-25 cursor-not-allowed'
                      : isSelected
                      ? 'border-[#39ff14] bg-[#39ff14]/10 text-white shadow-[0_0_12px_rgba(57,255,20,0.25)]'
                      : 'border-white/5 bg-[#07060d] hover:bg-emerald-950/15 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {node.floor === currentNetFloor && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#39ff14] animate-pulse"></span>
                    )}

                    <div className="flex flex-col items-center justify-center bg-black/60 border border-white/5 rounded w-10 h-10">
                      <span className="text-[9px] text-gray-500 uppercase tracking-tighter">LV.0{node.floor}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-emerald-400/60 rotate-180 mt-[-1px]" />
                    </div>

                    <div className="flex flex-col pl-1.5">
                      <span className={`font-bold uppercase tracking-wider text-[11px] ${
                        isCompleted ? 'text-gray-500 line-through' : isSelected ? 'text-[#39ff14] font-black' : 'text-gray-200'
                      }`}>
                        {node.name}
                      </span>
                      <span className="text-[9px] text-gray-500">{node.type.replace('_', ' ').toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    {isCompleted ? (
                      <Unlock className="w-4 h-4 text-emerald-400 animate-pulse" />
                    ) : node.type === 'black_ice' && node.blackICE && node.blackICE.hp > 0 ? (
                      <ShieldAlert className="w-4 h-4 text-red-500 animate-bounce" />
                    ) : node.type === 'password' || node.type === 'control_node' ? (
                      <Lock className="w-4 h-4 text-yellow-400 animate-pulse" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* Interactive Command & Combat Center (md:col-span-7) */}
      <div className={`md:col-span-7 bg-[#0a0a14]/90 border rounded-lg p-5 flex flex-col justify-between shadow-2xl min-h-[490px] transition-all duration-350 ${
        vibeMode === 'threat_encountered' 
          ? 'border-red-500 bg-[#140206] shadow-[0_0_25px_rgba(255,0,0,0.15)] text-red-100' 
          : 'border-[#ff00ff]/30 shadow-[0_0_20px_rgba(255,0,255,0.06)] text-white'
      }`}>
        <div className="space-y-4">
          
          {/* Header & turn state */}
          <div className="border-b border-white/5 pb-3 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h4 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-0.5">
                💻 CYBERDECK MATRIX CONSOLE // FLOOR.0{selectedNode.floor}
              </h4>
              <h3 className="text-sm font-mono font-black uppercase tracking-wider">
                {selectedNode.name}
              </h3>
            </div>

            {/* Turn Budget Actions Indicators */}
            <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 border border-white/10 rounded font-mono text-xs">
              <span className="text-yellow-400 font-bold uppercase text-[9px] tracking-wider">AP BUFFER:</span>
              <div className="flex gap-1">
                {[1, 2, 3].map(ap => (
                  <span 
                    key={ap} 
                    className={`h-3 w-5 rounded-sm transition ${
                      ap <= netActionBudget 
                        ? vibeMode === 'threat_encountered' ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-[#39ff14] shadow-[0_0_6px_#39ff14]' 
                        : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold">({netActionBudget}/3 AP)</span>
            </div>
          </div>

          {/* Node Spec details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-black/50 border border-white/5 rounded p-4 flex flex-col justify-between text-xs font-mono">
              <div>
                <span className="text-gray-500 uppercase tracking-widest text-[9px] block mb-1 font-bold">Register Hardware Spec:</span>
                <p className="text-zinc-300 leading-relaxed text-glow">{selectedNode.description}</p>
              </div>
              
              <div className="bg-[#0f0e1a]/80 p-2 text-[10px] text-cyan-400 border border-cyan-500/20 rounded mt-3">
                <span className="font-bold uppercase tracking-wider text-cyan-300 text-[8px] block mb-0.5">CYBERWARE GOAL:</span>
                {selectedNode.info}
              </div>
            </div>

            {/* Vector wireframe view */}
            <div className={`border rounded p-3 flex flex-col items-center justify-center min-h-[170px] relative transition-all duration-350 ${
              vibeMode === 'threat_encountered' 
                ? 'bg-black/90 border-red-500/40 shadow-[0_0_15px_rgba(255,0,0,0.25)]' 
                : 'bg-[#05050a] border-[#ff00ff]/20'
            }`}>
              {/* Particle laser streaks during beam attack vibe mode */}
              {vibeMode === 'beam_attack' && (
                <div className="absolute inset-0 bg-cyan-400/25 z-10 flex items-center justify-center">
                  <div className="relative w-full h-1 bg-cyan-400 glow-cyan animate-pulse laser-beam-effect flex justify-around">
                    <span className="h-6 w-6 rounded-full bg-cyan-300 animate-ping" />
                    <span className="h-6 w-6 rounded-full bg-cyan-300 animate-ping delay-100" />
                  </div>
                </div>
              )}

              <canvas
                ref={wireframeCanvasRef}
                width={140}
                height={125}
                className="w-32 h-28"
              />
              <span className="text-[9px] font-mono text-gray-500 absolute bottom-1.5 uppercase tracking-wider">
                {vibeMode === 'threat_encountered' ? '⚡ HAZARD_DETECTED_REZ_MATRIX' : 'READY_VECTOR_BUFFER'}
              </span>
            </div>
          </div>

          {/* Core rule interface suite */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase tracking-widest font-bold">
              <span>CYBERPUNK RED INTERFACE ABILITIES</span>
              {cloakBuffer > 0 && (
                <span className="text-cyan-400 uppercase">🛡️ CLOAK DEPLOYED (+{cloakBuffer} SP)</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              
              {selectedNode.type === 'access_point' && selectedNode.status !== 'completed' && (
                <button
                  onClick={() => {
                    if (!checkActionBudgetAndNotify()) return;
                    audio.playNetSuccess();
                    setNetActionBudget(prev => prev - 1);
                    setLastCheckResult(`Overrode Handshake AP. Processors synapsed.`);

                    updateState({
                      netArchitecture: netArchitecture.map(n => n.id === selectedNode.id ? { ...n, status: 'completed' as const } : n),
                      currentNetFloor: Math.max(currentNetFloor, 2),
                      logs: [addLog(`🔓 Access terminal linked. Subnet blueprints downloaded to cyberdeck core caches. Advanced to floor 2.`), ...logs]
                    });

                    const nNode = netArchitecture.find(n => n.floor === 2);
                    if (nNode) setSelectedNodeId(nNode.id);
                  }}
                  className="p-3 bg-black hover:bg-emerald-950/80 border border-emerald-500/40 hover:border-emerald-400 text-white rounded transition text-left cursor-pointer flex flex-col justify-center"
                >
                  <span className="font-black text-[#39ff14] uppercase text-[11px] flex items-center gap-1">🌐 OVERRIDE AP ACCESS [1 AP]</span>
                  <span className="text-[10px] text-gray-400">Establish high-bandwidth physical deck link.</span>
                </button>
              )}

              {(selectedNode.type === 'password' || selectedNode.type === 'control_node') && selectedNode.status !== 'completed' && (
                <button
                  onClick={() => handleInitiateBreach(selectedNode)}
                  className="p-3 bg-black hover:bg-yellow-950/80 border border-yellow-500/40 hover:border-yellow-400 text-white rounded transition text-left cursor-pointer flex flex-col justify-center animate-pulse"
                >
                  <span className="font-black text-yellow-500 uppercase text-[11px] flex items-center gap-1">⚡ INTERFACE INJECT: BREACH [1 AP]</span>
                  <span className="text-[10px] text-gray-400">Launch alternate HEX decrypt protocol.</span>
                </button>
              )}

              {selectedNode.type === 'black_ice' && selectedNode.status !== 'completed' && selectedNode.blackICE && (
                <>
                  <button
                    onClick={handleDeploySword}
                    className="p-3 bg-black hover:bg-pink-950/80 border border-[#ff00ff]/45 hover:border-[#ff00ff] text-white rounded transition text-left cursor-pointer flex flex-col justify-center"
                  >
                    <span className="font-black text-[#ff00ff] uppercase text-[11px] flex items-center gap-1">⚔️ INTERFACE ATTACK: SWORD [1 AP]</span>
                    <span className="text-[10px] text-gray-400">Deals 15 REZ point matrix strike against warden.</span>
                  </button>
                  <button
                    onClick={handleSlideNet}
                    className="p-3 bg-black hover:bg-teal-950/80 border border-cyan-500/40 hover:border-cyan-400 text-white rounded transition text-left cursor-pointer flex flex-col justify-center"
                  >
                    <span className="font-black text-cyan-400 uppercase text-[11px] flex items-center gap-1">🏃 INTERFACE EVADE: SLIDE [1 AP]</span>
                    <span className="text-[10px] text-gray-400">Slide past ICE program. Roll vs Evasion speed.</span>
                  </button>
                </>
              )}

              {selectedNode.type === 'data_file' && selectedNode.status !== 'completed' && (
                <button
                  onClick={() => handleHarvestDataFile(selectedNode)}
                  className="p-3 bg-black hover:bg-emerald-950/80 border border-emerald-500/40 hover:border-emerald-400 text-white rounded transition text-left cursor-pointer flex flex-col justify-center"
                >
                  <span className="font-black text-[#39ff14] uppercase text-[11px] flex items-center gap-1">💾 TACTICAL HARVEST: DATA [1 AP]</span>
                  <span className="text-[10px] text-gray-400">Exfiltrate commercial register directories for credits.</span>
                </button>
              )}

              {selectedNode.status === 'completed' && (
                <div className="col-span-1 sm:col-span-2 p-2 bg-emerald-500/5 border border-emerald-500/25 text-[#39ff14] rounded text-center text-xs">
                  ⚡ SECURE: Complete system override established. Level terminal operates under runner directories.
                </div>
              )}

              <button
                onClick={handleCloakNet}
                className="p-3 bg-black hover:bg-zinc-900 border border-zinc-700/60 hover:border-zinc-500 text-white rounded transition text-left cursor-pointer flex flex-col justify-center"
              >
                <span className="font-black text-zinc-300 uppercase text-[11px] flex items-center gap-1">🛡️ ABILITY DEPLOY: CLOAK [1 AP]</span>
                <span className="text-[10px] text-gray-400">Deploys protective shroud to buffer direct HP strikes.</span>
              </button>

              <button
                onClick={handleVirusNet}
                className="p-3 bg-black hover:bg-violet-950/60 border border-violet-500/30 hover:border-violet-400 text-white rounded transition text-left cursor-pointer flex flex-col justify-center"
              >
                <span className="font-black text-violet-400 uppercase text-[11px] flex items-center gap-1">🦠 ABILITY DEPLOY: VIRUS [1 AP]</span>
                <span className="text-[10px] text-gray-400">Subvert network registers to siphon system cash.</span>
              </button>

            </div>
          </div>
        </div>

        {/* Real-time Operator check logs */}
        <div className="space-y-3 mt-4">
          <div className="p-3 rounded border border-cyan-500/20 bg-cyan-950/10 text-xs font-mono">
            <span className="text-gray-500 font-bold uppercase text-[9px] block">OPERATOR MATRIX ECHO:</span>
            <span className="text-[#a5f3fc] mt-1 block italic">{lastCheckResult}</span>
          </div>

          {/* Turn control or emergency Jack Out */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1 border-t border-white/5">
            <button
              onClick={handleEndTurn}
              className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-850 uppercase text-[10px] tracking-wider text-white border border-zinc-800 rounded font-black cursor-pointer transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-yellow-500" /> END CYBER-DECK TURN (COOLING)
            </button>
            <button
              onClick={handleEmergencyJackOut}
              className="flex-1 py-2.5 bg-red-950/40 hover:bg-red-900 border border-red-500 text-red-200 uppercase text-[11px] tracking-widest font-black rounded cursor-pointer transition-all flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
            >
              <Zap className="w-4 h-4 text-red-500" /> ⚡ SAFETY JACK OUT (DISCONNECT)
            </button>
          </div>
        </div>

      </div>

      {/* Real-time alternating vector match breach minigame overlay */}
      {isBreaching && breachTargetNode && (
        <BreachMinigame
          targetSequence={breachTargetNode.floor === 2 ? ['1C', 'E9', '55'] : ['FF', 'BD']}
          onSuccess={handleBreachSuccess}
          onFailure={handleBreachFailure}
          onClose={() => setIsBreaching(false)}
        />
      )}
    </div>
  );
}
