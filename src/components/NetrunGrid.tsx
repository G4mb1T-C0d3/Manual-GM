import React, { useState, useEffect, useRef } from 'react';
import { NetNode, LogEntry, Character } from '../types';
import { getGameTime, rollD10 } from '../utils';
import { audio } from '../audio';
import BreachMinigame from './BreachMinigame';
import {
  Cpu, Lock, Unlock, ArrowDownCircle, ShieldAlert, Key, FolderOpen,
  ChevronDown, Layers, Terminal, Play, Zap, HelpCircle
} from 'lucide-react';

interface NetrunGridProps {
  netArchitecture: NetNode[];
  currentNetFloor: number;
  synapseHp: number;
  maxSynapseHp: number;
  credits: number;
  player: Character; // Check attributes like INT for hack bonuses
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
}: NetrunGridProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(netArchitecture[0]?.id || '');
  const [activePrograms, setActivePrograms] = useState<Array<{ name: string; type: string; desc: string }>>([
    { name: 'Worm', type: 'Utility', desc: 'Increases interface checks' },
    { name: 'Sword', type: 'Attack', desc: 'Deals heavy damage to Black ICE' }
  ]);
  const [isBreaching, setIsBreaching] = useState(false);
  const [breachTargetNode, setBreachTargetNode] = useState<NetNode | null>(null);

  // Canvas ref for the spinning retro 3D Wireframe Black ICE / Daemon representation
  const wireframeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cubeAnimRef = useRef<number | null>(null);

  const selectedNode = netArchitecture.find(n => n.id === selectedNodeId) || netArchitecture[0];

  useEffect(() => {
    // Canvas 3D wireframe render loops mimicking old-school vector rasterizers
    const canvas = wireframeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angleX = 0;
    let angleY = 0;

    // Define 3D coordinates for a revolving virtual octahedron (threat daemon)
    const vertices = [
      [0, 1.2, 0], // Top vertex
      [1, 0, 1],
      [1, 0, -1],
      [-1, 0, -1],
      [-1, 0, 1],
      [0, -1.2, 0] // Bottom vertex
    ];

    const faces = [
      [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1],
      [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]
    ];

    const draw = () => {
      cubeAnimRef.current = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;
      
      // Clean canvas with transparent deep wireframe grid glow
      ctx.clearRect(0, 0, width, height);

      // Spin angles
      angleX += 0.015;
      angleY += 0.012;

      // Project vertices to 2D
      const projected: Array<[number, number]> = [];
      const scale = 50; // Size
      const originX = width / 2;
      const originY = height / 2;

      vertices.forEach(v => {
        // Rotate X
        let y1 = v[1] * Math.cos(angleX) - v[2] * Math.sin(angleX);
        let z1 = v[1] * Math.sin(angleX) + v[2] * Math.cos(angleX);

        // Rotate Y
        let x2 = v[0] * Math.cos(angleY) + z1 * Math.sin(angleY);
        let z2 = -v[0] * Math.sin(angleY) + z1 * Math.cos(angleY);

        // Simple perspective projection
        const dist = 3.5;
        const scaleFactor = scale / (z2 + dist);
        const px = x2 * scaleFactor + originX;
        const py = y1 * scaleFactor + originY;

        projected.push([px, py]);
      });

      // Draw vector faces
      ctx.strokeStyle = '#ff00ff'; // Neon Magenta wireframe lines
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 8;

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

      // Reset shadows
      ctx.shadowBlur = 0;
    };

    draw();

    return () => {
      if (cubeAnimRef.current) cancelAnimationFrame(cubeAnimRef.current);
    };
  }, [selectedNodeId]);

  // Insert hacker status messages to log
  const addLog = (message: string, type: 'netrun' | 'system' = 'netrun') => {
    const newE: LogEntry = {
      id: `log_net_${Date.now()}_${Math.random()}`,
      timestamp: getGameTime(),
      type,
      message
    };
    return newE;
  };

  // 1. Interface Ability: SCAN / Pathfinder
  const handleScanNet = () => {
    audio.playNetChirp();
    
    // Pathfinder Interface rolls
    const r = rollD10();
    const totalHack = player.tech + r.total; // Netrunning check index
    const successThreshold = 12;

    const visibleCount = totalHack >= successThreshold ? 5 : 3;

    // Set next layers status to revealed!
    const nextArch = netArchitecture.map(node => {
      if (node.floor <= visibleCount) {
        return { ...node, status: 'revealed' as const };
      }
      return node;
    });

    const msg = `⚡ PATHFINDER SCAN INITIATION: Roll ${totalHack} vs DV ${successThreshold}. Scanners reveal up to ${visibleCount} subnetwork floors successfully!`;
    
    updateState({
      netArchitecture: nextArch,
      logs: [addLog(msg), ...logs]
    });
  };

  // 2. Click a Net node to hack or decode
  const handleSelectNode = (node: NetNode) => {
    if (node.floor > currentNetFloor && node.status === 'hidden') {
      alert("This floor level is completely shrouded. Perform scanned Pathfinder operations first!");
      return;
    }
    audio.playUIBeep();
    setSelectedNodeId(node.id);
  };

  // Launching Breach Protocol minigame for Passwords/Locks
  const handleInitiateBreach = (node: NetNode) => {
    audio.playNetChirp();
    setBreachTargetNode(node);
    setIsBreaching(true);
  };

  // Decryption Success handler
  const handleBreachSuccess = () => {
    setIsBreaching(false);
    if (!breachTargetNode) return;

    // Set targeted floor node status to bypassed
    const nextArch = netArchitecture.map(node => {
      if (node.id === breachTargetNode.id) {
        return { ...node, status: 'completed' as const };
      }
      // Reveal the next floor above the current bypassed secure node
      if (node.floor === breachTargetNode.floor + 1) {
        return { ...node, status: 'revealed' as const };
      }
      return node;
    });

    let successMsg = `🔓 BREACH DECRYPT SUCCESSFUL: decrypted ${breachTargetNode.name}! `;
    
    // Trigger special functional rewards!
    if (breachTargetNode.type === 'control_node') {
      successMsg += `🤖 Hacked ceiling machine gun turret CC-01! Allied Turret actively joined the combat queue at initiative tick #6!`;
      onTurretHackSuccess(); // Inform parent to mutate active initiative lists
    } else {
      successMsg += `Security gate locks cracked open. Advancing to higher data levels.`;
    }

    updateState({
      netArchitecture: nextArch,
      currentNetFloor: Math.max(currentNetFloor, breachTargetNode.floor + 1),
      logs: [addLog(successMsg, 'system'), ...logs]
    });

    // Advance focus state
    const nextNode = nextArch.find(n => n.floor === breachTargetNode.floor + 1);
    if (nextNode) {
      setSelectedNodeId(nextNode.id);
    }
  };

  const handleBreachFailure = () => {
    setIsBreaching(false);
    if (!breachTargetNode) return;

    // Apply cognitive damage on failure feedback limits
    const bioFeedbackDamage = 6;
    const nextSynHp = Math.max(0, synapseHp - bioFeedbackDamage);

    updateState({
      synapseHp: nextSynHp,
      logs: [addLog(`💥 COGNITIVE SHOCK FAILURE: Decryption on ${breachTargetNode.name} collapsed. Searing digital voltage feedback deals -${bioFeedbackDamage} Synapse Damage.`, 'netrun'), ...logs]
    });
  };

  // 3. Slide Program action (Avoid index ICE checks)
  const handleSlideNet = () => {
    if (!selectedNode.blackICE) {
      alert("Slide is only used on hostile Black ICE encounters!");
      return;
    }
    audio.playNetChirp();

    const check = rollD10().total + 6; // Dex and net interface index
    const iceSpeed = selectedNode.blackICE.speed + 7;
    const success = check >= iceSpeed;

    let text = '';
    let nextArch = [...netArchitecture];

    if (success) {
      text = `🏃 SLIDE EVADE SUCCESSFUL: Interface check ${check} vs HELLHOUND speed DV ${iceSpeed}. Apex slides around ice warden up to the next floor!`;
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
      text = `💥 SLIDE EXPOSURE CRASH: Interface check ${check} vs speed DV ${iceSpeed} (FAILED). ICE intercepts your routing packets!`;
      updateState({
        logs: [addLog(text), ...logs]
      });
      // Attack from ICE
      handleBlackIceAttack();
    }
  };

  // ICE attacking netrunner synapse HP
  const handleBlackIceAttack = () => {
    if (!selectedNode.blackICE) return;
    setTimeout(() => {
      audio.playNetFailure();
      
      const dmg = 7; // static bio-flash points
      const nextSynHp = Math.max(0, synapseHp - dmg);

      updateState({
        synapseHp: nextSynHp,
        logs: [addLog(`👿 HELLHOUND ICE strike: Spews thermal core fire into synapse! -${dmg} neural HP deducted. [Synapse: ${nextSynHp}/${maxSynapseHp}]`, 'netrun'), ...logs]
      });
    }, 400);
  };

  // 4. Combat attack programs (SWORD vs ICE)
  const handleDeploySword = () => {
    if (!selectedNode.blackICE) {
      alert("Deploy Sword program requires a valid active Black ICE encounter!");
      return;
    }
    audio.playNetChirp();

    const attackRoll = rollD10().total + 7; // interface attack rating
    const iceDef = 12; // Hellhound defense floor
    const isHit = attackRoll >= iceDef;

    let text = `⚔️ DEPLOYING [SWORD.EXE]: Interface roll ${attackRoll} vs ICE Defense DV 12. `;
    let nextArch = [...netArchitecture];

    if (isHit) {
      const dmg = 15; // heavy program damage
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

      text += `HIT! Slices Hellhound sector for ${dmg} REZ structural damage! `;
      if (nextIceHp <= 0) {
        text += `Warden collapsed. Path to level ${selectedNode.floor + 1} is now secure.`;
      } else {
        text += `ICE Integrity remains: [${nextIceHp}/${selectedNode.blackICE.maxHp} REZ]`;
      }

      updateState({
        netArchitecture: nextArch,
        currentNetFloor: nextIceHp <= 0 ? Math.max(currentNetFloor, selectedNode.floor + 1) : currentNetFloor,
        logs: [addLog(text), ...logs]
      });

      if (nextIceHp <= 0) {
        const nextNode = nextArch.find(n => n.floor === selectedNode.floor + 1);
        if (nextNode) {
          setSelectedNodeId(nextNode.id);
        }
      }
    } else {
      text += `MISS! Sword calculations fail to dissect floating core registers.`;
      updateState({
        logs: [addLog(text), ...logs]
      });
      // ICE countered attack
      handleBlackIceAttack();
    }
  };

  // 5. Download Data files
  const handleHarvestDataFile = (node: NetNode) => {
    audio.playNetSuccess();
    
    const award = 2500;
    const nextCredits = credits + award;

    // mark completed
    const nextArch = netArchitecture.map(n => {
      if (n.id === node.id) {
        return { ...n, status: 'completed' as const };
      }
      return n;
    });

    const msg = `💰 DATA INFILTRATION COMPLETE: Recovered Arasaka Comercial Log indices! Earned +${award} cyber-space credits. Accumulated total: ${nextCredits}¢`;

    updateState({
      netArchitecture: nextArch,
      credits: nextCredits,
      logs: [addLog(msg, 'system'), ...logs]
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* 5-floor subnet wireframe list (md:col-span-5) */}
      <div className="md:col-span-5 bg-[#0a0a14]/90 border border-emerald-500/30 rounded-lg p-4 space-y-4 shadow-[0_0_20px_rgba(57,255,20,0.1)] relative">
        <div className="absolute top-0 right-4 flex gap-1 translate-y-[-50%]">
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-emerald-500 text-black uppercase tracking-wider rounded">TRON_DIAGRAM_V4.0</span>
        </div>

        <div className="border-b border-emerald-500/20 pb-2.5 flex justify-between items-center">
          <span className="text-xs font-mono font-bold text-[#39ff14]/80 uppercase tracking-widest flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#39ff14] animate-pulse" /> NETWORK_FORT_LEVELS
          </span>
          <button
            onClick={handleScanNet}
            className="px-2.5 py-1 bg-[#39ff14]/15 hover:bg-[#39ff14]/30 border border-[#39ff14]/40 text-[#39ff14] font-mono text-[10px] rounded transition-all uppercase cursor-pointer"
          >
            [📡 PATHFINDER CHECK]
          </button>
        </div>

        {/* Stack list representation */}
        <div className="flex flex-col gap-2.5">
          {netArchitecture
            .slice()
            .reverse() // Draw floor 5 at top, floor 1 at bottom!
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
                      ? 'border-gray-900 bg-black/40 text-gray-700 opacity-30 cursor-not-allowed'
                      : isSelected
                      ? 'border-[#39ff14] bg-[#39ff14]/5 text-white shadow-[0_0_12px_rgba(57,255,20,0.18)]'
                      : 'border-white/5 bg-[#07060d] hover:bg-emerald-900/10 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Glowing vertical marker for current run floor */}
                    {node.floor === currentNetFloor && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#39ff14] animate-pulse"></span>
                    )}

                    <div className="flex flex-col items-center justify-center bg-black/60 border border-white/5 rounded w-10 h-10">
                      <span className="text-[9px] text-gray-500 uppercase tracking-tighter">LV.0{node.floor}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-emerald-400/60 rotate-180 mt-[-1px]" />
                    </div>

                    <div className="flex flex-col pl-1.5">
                      <span className={`font-bold uppercase tracking-wider text-[11px] ${isCompleted ? 'text-gray-500 line-through' : isSelected ? 'text-[#39ff14]' : 'text-gray-200'}`}>
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

      {/* Node Interactive Controls (md:col-span-7) */}
      <div className="md:col-span-7 bg-[#0a0a14]/90 border border-[#ff00ff]/30 rounded-lg p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(255,0,255,0.08)] min-h-[460px]">
        {/* Node description info */}
        <div className="space-y-5">
          <div className="border-b border-white/5 pb-3">
            <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest mb-1">
              💻 ACTIVE_HACK_TERMINAL // LEVEL-0{selectedNode.floor}
            </h4>
            <h3 className="text-md font-mono font-black text-white uppercase tracking-wider">
              {selectedNode.name}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Wireframe details */}
            <div className="bg-black/40 border border-white/5 rounded p-4 flex flex-col justify-center text-xs font-mono">
              <span className="text-gray-500 uppercase tracking-widest text-[9px] mb-1 font-bold">Node Hardware Specs:</span>
              <p className="text-gray-300 mb-3 leading-relaxed">{selectedNode.description}</p>
              
              <div className="bg-[#0f0e1a] p-2 rounded border border-cyan-500/10 text-[10px] text-cyan-400">
                <span className="font-bold">SYSTEM OBJECTIVE: </span>
                {selectedNode.info}
              </div>
            </div>

            {/* Retro 3D revolving Wireframe element (glowing vector shapes) */}
            <div className="bg-[#06060c] border border-[#ff00ff]/20 rounded p-3 flex flex-col items-center justify-center min-h-[160px] relative">
              <canvas
                ref={wireframeCanvasRef}
                width={130}
                height={120}
                className="w-28 h-28"
              />
              <span className="text-[9px] font-mono text-gray-500 absolute bottom-1.5 uppercase tracking-wider">
                ICE_REZ_MATRIX_COORDINATES
              </span>
            </div>
          </div>

          {/* Program action launchers */}
          <div className="space-y-2">
            <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">
              Available Netrunner Interface Command Suite:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              {selectedNode.type === 'access_point' && selectedNode.status !== 'completed' && (
                <button
                  onClick={() => {
                    audio.playNetSuccess();
                    updateState({
                      netArchitecture: netArchitecture.map(n => n.id === selectedNode.id ? { ...n, status: 'completed' as const } : n),
                      currentNetFloor: Math.max(currentNetFloor, 2),
                      logs: [addLog(`🔓 Physical AP-09 interface override: System maps integrated into deck. Advanced to floor 2 secure codes.`), ...logs]
                    });
                    // trigger next selected
                    const nNode = netArchitecture.find(n => n.floor === 2);
                    if (nNode) setSelectedNodeId(nNode.id);
                  }}
                  className="p-3 bg-black hover:bg-emerald-900 border border-emerald-500/40 hover:border-emerald-400 text-white rounded transition text-left cursor-pointer flex flex-col justify-center"
                >
                  <span className="font-bold text-[#39ff14] uppercase text-[11px]">Override Handshake AP</span>
                  <span className="text-[10px] text-gray-400">Inject immediate digital interface bypass.</span>
                </button>
              )}

              {(selectedNode.type === 'password' || selectedNode.type === 'control_node') && selectedNode.status !== 'completed' && (
                <button
                  onClick={() => handleInitiateBreach(selectedNode)}
                  className="p-3 bg-black hover:bg-yellow-950 border border-yellow-500/40 hover:border-yellow-400 text-white rounded transition text-left cursor-pointer flex flex-col justify-center animate-pulse"
                >
                  <span className="font-bold text-yellow-500 uppercase text-[11px]">⚡ LAUNCH BREACH MINIGAME</span>
                  <span className="text-[10px] text-gray-400">Decrypt passkey via HEX alternating vector matrix.</span>
                </button>
              )}

              {selectedNode.type === 'black_ice' && selectedNode.status !== 'completed' && selectedNode.blackICE && (
                <>
                  <button
                    onClick={handleDeploySword}
                    className="p-3 bg-black hover:bg-pink-950 border border-[#ff00ff]/40 hover:border-[#ff00ff] text-white rounded transition text-left cursor-pointer flex flex-col justify-center"
                  >
                    <span className="font-bold text-[#ff00ff] uppercase text-[11px]">⚔️ DEPLOY SWORD.EXE PROGRAM</span>
                    <span className="text-[10px] text-gray-400">Deals heavy 15 REZ structural program slash.</span>
                  </button>
                  <button
                    onClick={handleSlideNet}
                    className="p-3 bg-black hover:bg-teal-950 border border-cyan-500/40 hover:border-cyan-400 text-white rounded transition text-left cursor-pointer flex flex-col justify-center"
                  >
                    <span className="font-bold text-cyan-400 uppercase text-[11px]">🏃 ATTEMPT SLIDE BYPASS</span>
                    <span className="text-[10px] text-gray-400">Slip past Hellhound without fighting. Speed trial.</span>
                  </button>
                </>
              )}

              {selectedNode.type === 'data_file' && selectedNode.status !== 'completed' && (
                <button
                  onClick={() => handleHarvestDataFile(selectedNode)}
                  className="p-3 bg-black hover:bg-emerald-950 border border-emerald-500/40 hover:border-emerald-400 text-white rounded transition text-left cursor-pointer flex flex-col justify-center"
                >
                  <span className="font-bold text-[#39ff14] uppercase text-[11px]">💾 EXFILTRATE CLASSIFIED DATA</span>
                  <span className="text-[10px] text-gray-400">Download commercial ledger index for +2500¢ credits!</span>
                </button>
              )}

              {selectedNode.status === 'completed' && (
                <div className="col-span-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-[#39ff14] rounded text-center text-xs">
                  🎮 Floor security matrix cracked. Controller node is under user execution directory.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Console terminal response */}
        <div className="mt-5 p-3 rounded-lg border border-cyan-500/20 bg-cyan-950/10 min-h-[50px] flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-gray-500 font-bold mr-1.5 uppercase tracking-wider text-[9px] block">Net runner console log:</span>
            <span className="text-gray-200 mt-0.5 block italic selection:bg-pink-500">
              {selectedNode.type === 'black_ice' && selectedNode.blackICE && selectedNode.blackICE.hp > 0
                ? `⚡ WARNING: Hostile program HELLHOUND detected on sector! Integrity [${selectedNode.blackICE.hp}/${selectedNode.blackICE.maxHp} REZ]. Initialize program sword.`
                : `Ready for hacking interfaces. Connection latency: 9ms on secure cyberdeck port.`}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time breach protocol minigame overlay */}
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
