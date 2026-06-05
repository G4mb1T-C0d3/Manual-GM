import React, { useState } from 'react';
import { Character, LogEntry, MapObstacle } from '../types';
import { audio } from '../audio';
import { getGameTime } from '../utils';
import { 
  Compass, Shield, Crosshair, AlertTriangle, Cpu, Terminal, 
  Activity, Zap, Skull, Trash2, Plus, RotateCw, HelpCircle, 
  Layers, Lock, Info, EyeOff
} from 'lucide-react';

interface TacticalCombatMapProps {
  player: Character;
  enemies: Character[];
  combatActive: boolean;
  turnIndex: number;
  turnOrder: string[];
  logs: LogEntry[];
  gmOverrideActive: boolean;
  updateState: (newState: {
    player?: Character;
    enemies?: Character[];
    logs?: LogEntry[];
    customObstacles?: MapObstacle[];
  }) => void;
  gridWidth?: number;
  gridHeight?: number;
  customObstacles?: MapObstacle[];
  onUpdateTargetDistance?: (distance: number, targetId?: string) => void;
}

export default function TacticalCombatMap({
  player,
  enemies,
  combatActive,
  turnIndex,
  turnOrder,
  logs,
  gmOverrideActive,
  updateState,
  gridWidth = 10,
  gridHeight = 10,
  customObstacles = [],
  onUpdateTargetDistance,
}: TacticalCombatMapProps) {
  const [distanceMeasureActive, setDistanceMeasureActive] = useState<boolean>(false);
  const [measureTargetId, setMeasureTargetId] = useState<string | null>(null);

  // Automatically update coordinates when distance is calculated
  React.useEffect(() => {
    if (measureTargetId && onUpdateTargetDistance) {
      const enemy = enemies.find(en => en.id === measureTargetId);
      if (enemy) {
        const px = player.x || 1;
        const py = player.y || 1;
        const ex = enemy.x || 1;
        const ey = enemy.y || 1;
        // Chebyshev distance on grid: Math.max(dx, dy) * 2 meters
        const gridDist = Math.max(Math.abs(px - ex), Math.abs(py - ey));
        const distanceMeters = gridDist * 2;
        onUpdateTargetDistance(distanceMeters, measureTargetId);
      }
    }
  }, [measureTargetId, player.x, player.y, enemies, onUpdateTargetDistance]);
  
  // Track selected prop on grid for re-angling and deletion
  const [selectedPropCoord, setSelectedPropCoord] = useState<{ x: number, y: number } | null>(null);
  
  // Track player cell budget per combat round (local tracking in meters)
  const [playerMovementSpent, setPlayerMovementSpent] = useState<number>(0);

  // Multi-perspective States & Pointer Rotations - Forced to 2D Top-Down View
  const [viewPerspective] = useState<'top-down' | 'isometric' | '3d'>('top-down');
  const [cameraAngleX] = useState<number>(0);
  const [cameraAngleZ] = useState<number>(0);
  const [isRotatingCamera] = useState<boolean>(false);
  const pointerStartRef = React.useRef<{ x: number, y: number }>({ x: 0, y: 0 });

  const selectPerspective = (mode: 'top-down' | 'isometric' | '3d') => {
    // Locked to top-down 2D mode
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Disabled camera rotation for strict top-down layout
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Disabled camera rotation for strict top-down layout
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Disabled camera rotation for strict top-down layout
  };

  // Active turn character ID
  const activeCharId = turnOrder[turnIndex] || '';

  // Canonical isometric grid parameters (exact 2:1 ratio)
  const tileWidth = 76;
  const tileHeight = 38;
  const tileWidthHalf = tileWidth / 2;
  const tileHeightHalf = tileHeight / 2;

  // Offset calculations to center-project the 10x10 isometric grid panel
  const getIsoCoords = (x: number, y: number) => {
    // 1-indexed adjustments
    const xAdjust = x - 1;
    const yAdjust = y - 1;
    
    // Horizontal center alignment offset based on grid bounds
    const left = (xAdjust - yAdjust + (gridHeight - 1)) * tileWidthHalf + 18;
    const top = (xAdjust + yAdjust) * tileHeightHalf + 18;
    return { left, top };
  };

  // Standard interactive map obstacle coordinates
  const defaultObstacles: MapObstacle[] = [
    { x: 3, y: 4, name: 'Server Stack', icon: 'server', angle: 0 },
    { x: 5, y: 6, name: 'Cyber Clinic Bed', icon: 'bed', angle: 0 },
    { x: 7, y: 3, name: 'Debris Stack', icon: 'debris', angle: 0 },
    { x: 2, y: 8, name: 'Industrial Console', icon: 'console', angle: 0 }
  ];

  const obstacles = customObstacles && customObstacles.length > 0 ? customObstacles : defaultObstacles;

  const getObstacleAt = (x: number, y: number) => {
    return obstacles.find(o => o.x === x && o.y === y);
  };

  // DRAG & DROP LIFECYCLE HANDLERS

  // Start dragging a character token
  const handleCharacterDragStart = (e: React.DragEvent, id: string) => {
    if (!combatActive && !gmOverrideActive) {
      e.preventDefault();
      return;
    }
    
    // Enforce Turn Economy constraints
    if (id !== activeCharId && !gmOverrideActive) {
      audio.playAlert();
      alert("⚠️ INITIATIVE DEVIATION: You may only displace active tokens on their designated turn! (Or enable GM Override)");
      e.preventDefault();
      return;
    }

    const payload = { type: 'token', id };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
  };

  // Start dragging a new asset from the palette sidebar
  const handlePaletteDragStart = (e: React.DragEvent, name: string, icon: string) => {
    if (!gmOverrideActive) {
      e.preventDefault();
      return;
    }

    const payload = { type: 'new-prop', name, icon };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
  };

  // Start dragging an already placed item from the grid for real-time rearrangement
  const handlePlacedPropDragStart = (e: React.DragEvent, prop: MapObstacle) => {
    if (!gmOverrideActive) {
      e.preventDefault();
      return;
    }

    const payload = { type: 'placed-prop', x: prop.x, y: prop.y };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Resolve dropped drag items on target grid coordinate
  const handleDropUnified = (e: React.DragEvent, tx: number, ty: number) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      if (data.type === 'token') {
        resolveCharacterTokenDrop(data.id, tx, ty);
      } else if (data.type === 'new-prop') {
        resolveNewPropDrop(data.name, data.icon, tx, ty);
      } else if (data.type === 'placed-prop') {
        resolveRelocatePropDrop(data.x, data.y, tx, ty);
      }
    } catch (err) {
      console.warn("Drop resolution failure", err);
    }
  };

  const resolveNewPropDrop = (name: string, icon: string, rawTx: number, rawTy: number) => {
    if (!gmOverrideActive) return;
    
    // Hard physical boundaries constraint validation
    const tx = Math.max(1, Math.min(10, rawTx));
    const ty = Math.max(1, Math.min(10, rawTy));
    
    // Guard coordinates occupancy
    if (getObstacleAt(tx, ty) || 
        (player.x === tx && player.y === ty && !player.isDead) || 
        enemies.find(en => !en.isDead && en.x === tx && en.y === ty)) {
      audio.playAlert();
      return;
    }

    const nextObstacles = [...obstacles, { x: tx, y: ty, name, icon, angle: 0 }];
    updateState({
      customObstacles: nextObstacles,
      logs: [
        {
          id: `gm_palette_drop_${Date.now()}`,
          timestamp: getGameTime(),
          type: 'system',
          message: `🛠️ GM DEPLOYED PROP: Positioned [${name}] directly onto isometric coordinate (${tx}, ${ty})`
        },
        ...logs
      ]
    });
    audio.playUIBeep();
  };

  const resolveRelocatePropDrop = (sx: number, sy: number, rawTx: number, rawTy: number) => {
    const tx = Math.max(1, Math.min(10, rawTx));
    const ty = Math.max(1, Math.min(10, rawTy));
    
    if (!gmOverrideActive || (sx === tx && sy === ty)) return;
    
    // Target coordinate empty lookups
    if (getObstacleAt(tx, ty) || 
        (player.x === tx && player.y === ty && !player.isDead) || 
        enemies.find(en => !en.isDead && en.x === tx && en.y === ty)) {
      audio.playAlert();
      return;
    }

    const prop = obstacles.find(o => o.x === sx && o.y === sy);
    if (!prop) return;

    const nextObstacles = obstacles.map(o => 
      (o.x === sx && o.y === sy) ? { ...o, x: tx, y: ty } : o
    );

    updateState({
      customObstacles: nextObstacles,
      logs: [
        {
          id: `gm_prop_relocate_${Date.now()}`,
          timestamp: getGameTime(),
          type: 'system',
          message: `🛠️ GM RELOCATED PROP: Re-positioned environmental [${prop.name}] from (${sx}, ${sy}) to brand new grid intersection (${tx}, ${ty})`
        },
        ...logs
      ]
    });
    audio.playUIBeep();
    if (selectedPropCoord?.x === sx && selectedPropCoord?.y === sy) {
      setSelectedPropCoord({ x: tx, y: ty });
    }
  };

  const resolveCharacterTokenDrop = (charId: string, rawTx: number, rawTy: number) => {
    const tx = Math.max(1, Math.min(10, rawTx));
    const ty = Math.max(1, Math.min(10, rawTy));

    if (tx < 1 || tx > 10 || ty < 1 || ty > 10) {
      audio.playAlert();
      alert("❌ BOUNDARY BREACH: Coordinates out of bounds!");
      return;
    }

    // Solid obstacles movement prevention checks
    if (getObstacleAt(tx, ty) && !gmOverrideActive) {
      audio.playAlert();
      alert("❌ SOLID IMPEDIMENT: Movement refused! Obstacles block physical movement vectors.");
      return;
    }

    const isPlayerMoving = charId === player.id;
    const targetChar = isPlayerMoving ? player : enemies.find(en => en.id === charId);

    if (!targetChar) return;

    const startX = targetChar.x || 1;
    const startY = targetChar.y || 1;

    // Chebyshev distance limits
    const gridMovement = Math.max(Math.abs(startX - tx), Math.abs(startY - ty));
    const distanceMeters = gridMovement * 2; // 1 MOVE unit = 2 meters per CPR Rules
    const moveBudget = targetChar.move || 6;

    if (isPlayerMoving) {
      if (!gmOverrideActive && (playerMovementSpent + distanceMeters > moveBudget * 2)) {
        audio.playAlert();
        alert(`❌ OVER-MOVE REFUSED: Displacing to (${tx}, ty) costs ${distanceMeters}m. Your remaining Move Action budget is only ${(moveBudget * 2) - playerMovementSpent}m this turn!`);
        return;
      }
    } else {
      if (!gmOverrideActive && distanceMeters > moveBudget * 2) {
        audio.playAlert();
        alert(`❌ NPC OVER-MOVE REFUSED: ${targetChar.name} speed is MOVE ${moveBudget} (${moveBudget * 2}m). Move attempts to exceed limits!`);
        return;
      }
    }

    audio.playUIBeep();

    let updatedPlayer = { ...player };
    let updatedEnemies = [...enemies];

    if (isPlayerMoving) {
      const nextSpent = playerMovementSpent + distanceMeters;
      updatedPlayer = {
        ...player,
        x: tx,
        y: ty,
        moveActionSpent: nextSpent >= moveBudget * 2 ? true : player.moveActionSpent
      };
      setPlayerMovementSpent(nextSpent);
    } else {
      updatedEnemies = enemies.map(en => {
        if (en.id === charId) {
          return {
            ...en,
            x: tx,
            y: ty,
            moveActionSpent: true
          };
        }
        return en;
      });
    }

    const logMsg = `📍 MOVE DISPLACEMENT: ${targetChar.name} shifted coordinate nodes from (${startX}, ${startY}) to (${tx}, ${ty}) [${distanceMeters}m expended]`;
    updateState({
      player: updatedPlayer,
      enemies: updatedEnemies,
      logs: [{ id: `move_${Date.now()}`, timestamp: getGameTime(), type: 'system', message: logMsg }, ...logs]
    });
  };

  // Reset local budget when turn advances
  React.useEffect(() => {
    if (activeCharId === player.id) {
      setPlayerMovementSpent(0);
    }
  }, [activeCharId]);

  // Handle cell click selection or interactive placement
  const handleCellClick = (x: number, y: number) => {
    audio.playUIBeep();

    const obstacle = getObstacleAt(x, y);
    if (obstacle) {
      if (selectedPropCoord?.x === x && selectedPropCoord?.y === y) {
        setSelectedPropCoord(null);
      } else {
        setSelectedPropCoord({ x, y });
      }
      return;
    }

    setSelectedPropCoord(null);

    if (distanceMeasureActive) {
      const targetEn = enemies.find(en => !en.isDead && en.deployed !== false && (en.x || 1) === x && (en.y || 1) === y);
      if (targetEn) {
        setMeasureTargetId(targetEn.id);
      } else {
        setMeasureTargetId(null);
      }
    }
  };

  const measureDistance = () => {
    if (!measureTargetId) return 0;
    const enemy = enemies.find(en => en.id === measureTargetId);
    if (!enemy) return 0;
    const px = player.x || 1;
    const py = player.y || 1;
    const ex = enemy.x || 1;
    const ey = enemy.y || 1;

    // Chebyshev distance
    const gridDist = Math.max(Math.abs(px - ex), Math.abs(py - ey));
    return gridDist * 2;
  };

  // Get isometric page line coordinates for lasers scan render
  const getDistanceLineCoordinates = () => {
    if (!measureTargetId) return null;
    const enemy = enemies.find(en => en.id === measureTargetId);
    if (!enemy) return null;

    const px = player.x || 1;
    const py = player.y || 1;
    const ex = enemy.x || 1;
    const ey = enemy.y || 1;

    const pIso = getIsoCoords(px, py);
    const eIso = getIsoCoords(ex, ey);

    return {
      x1: pIso.left + tileWidthHalf,
      y1: pIso.top + tileHeightHalf,
      x2: eIso.left + tileWidthHalf,
      y2: eIso.top + tileHeightHalf,
      px, py, ex, ey
    };
  };

  const distLine = getDistanceLineCoordinates();
  const measuredMeters = measureDistance();

  // Selected prop details block
  const selectedPropObj = selectedPropCoord ? getObstacleAt(selectedPropCoord.x, selectedPropCoord.y) : null;

  const handleRotateSelectedProp = () => {
    if (!selectedPropCoord) return;
    audio.playUIBeep();
    const nextObstacles = obstacles.map(o => {
      if (o.x === selectedPropCoord.x && o.y === selectedPropCoord.y) {
        const nextAngle = ((o.angle || 0) + 90) % 360;
        return { ...o, angle: nextAngle };
      }
      return o;
    });
    updateState({ customObstacles: nextObstacles });
  };

  const handleDeleteSelectedProp = () => {
    if (!selectedPropCoord) return;
    audio.playUIBeep();
    const targetProp = getObstacleAt(selectedPropCoord.x, selectedPropCoord.y);
    const name = targetProp ? targetProp.name : 'Environmental prop';
    const nextObstacles = obstacles.filter(o => !(o.x === selectedPropCoord.x && o.y === selectedPropCoord.y));
    
    updateState({
      customObstacles: nextObstacles,
      logs: [
        {
          id: `gm_delete_prop_${Date.now()}`,
          timestamp: getGameTime(),
          type: 'system',
          message: `🛠️ GM PURGE ACTIVE: Evaporated environmental [${name}] from coordinate cell (${selectedPropCoord.x}, ${selectedPropCoord.y}).`
        },
        ...logs
      ]
    });
    setSelectedPropCoord(null);
  };

  // Vector 3D Wireframe custom isometric cube renderer
  const renderIsometric3DObstacle = (o: MapObstacle, left: number, top: number) => {
    const prismH = 26; // Height offset for 3D prism depth projection
    
    // Customized colors depending on object details
    let strokeCol = 'rgba(6, 182, 212, 0.85)'; // Cyber deck cyan
    let fillCol = 'rgba(6, 182, 212, 0.15)';
    let neonIntensity = 'drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]';

    if (o.icon === 'shield') {
      strokeCol = 'rgba(234, 179, 8, 0.9)'; // orange-yellow
      fillCol = 'rgba(234, 179, 8, 0.1)';
      neonIntensity = 'drop-shadow-[0_0_5px_rgba(234,179,8,0.4)]';
    } else if (o.icon === 'debris') {
      strokeCol = 'rgba(249, 115, 22, 0.85)'; // Amber hazard
      fillCol = 'rgba(249, 115, 22, 0.08)';
      neonIntensity = 'drop-shadow-[0_0_5px_rgba(249,115,22,0.4)]';
    } else if (o.icon === 'bed') {
      strokeCol = 'rgba(244, 114, 182, 0.85)'; // Clinic pink
      fillCol = 'rgba(244, 114, 182, 0.08)';
      neonIntensity = 'drop-shadow-[0_0_5px_rgba(244,114,182,0.4)] animate-pulse';
    } else if (o.icon === 'console') {
      strokeCol = 'rgba(16, 185, 129, 0.85)'; // Matrix green
      fillCol = 'rgba(16, 185, 129, 0.1)';
      neonIntensity = 'drop-shadow-[0_0_5px_rgba(16,185,129,0.45)]';
    } else if (o.icon === 'zap') {
      strokeCol = 'rgba(239, 68, 68, 0.9)'; // Toxic plasma red
      fillCol = 'rgba(239, 68, 68, 0.15)';
      neonIntensity = 'drop-shadow-[0_0_6px_rgba(239,68,68,0.6)] animate-pulse';
    }

    const angle = o.angle || 0;
    const isSelected = selectedPropCoord?.x === o.x && selectedPropCoord?.y === o.y;

    return (
      <div 
        key={`prism-${o.x}-${o.y}`}
        draggable
        onDragStart={(e) => handlePlacedPropDragStart(e, o)}
        onClick={() => handleCellClick(o.x, o.y)}
        className="absolute cursor-grab active:cursor-grabbing hover:scale-103 transition-transform"
        style={{ 
          left, 
          top: top - prismH, 
          width: tileWidth, 
          height: tileHeight + prismH,
          zIndex: 10 + o.y,
        }}
        title={`${o.name} (GM Custom Built - Drag to relocate)`}
      >
        <svg 
          className={`overflow-visible pointer-events-none ${neonIntensity}`} 
          width={tileWidth} 
          height={tileHeight + prismH}
          viewBox={`0 0 ${tileWidth} ${tileHeight + prismH}`}
        >
          <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${tileWidthHalf}px ${tileHeightHalf + prismH}px` }}>
            {/* Draw selected highlight loop */}
            {isSelected && (
              <polygon
                points={`${tileWidthHalf},${tileHeight + prismH + 10} ${tileWidth + 10},${tileHeightHalf + prismH} ${tileWidthHalf},${prismH - 10} -10,${tileHeightHalf + prismH}`}
                fill="none"
                stroke="#ff00ff"
                strokeWidth="1.5"
                strokeDasharray="4,2"
                className="animate-spin-slow"
              />
            )}

            {/* Bottom Base */}
            <polygon
              points={`${tileWidthHalf},${tileHeight + prismH} ${tileWidth},${tileHeightHalf + prismH} ${tileWidthHalf},${prismH} 0,${tileHeightHalf + prismH}`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1.2"
            />
            {/* Left Wall */}
            <polygon
              points={`0,${tileHeightHalf + prismH} 0,${tileHeightHalf} ${tileWidthHalf},${tileHeight} ${tileWidthHalf},${tileHeight + prismH}`}
              fill={fillCol}
              stroke={strokeCol}
              strokeWidth="1.2"
            />
            {/* Right Wall */}
            <polygon
              points={`${tileWidth},${tileHeightHalf + prismH} ${tileWidth},${tileHeightHalf} ${tileWidthHalf},${tileHeight} ${tileWidthHalf},${tileHeight + prismH}`}
              fill={fillCol}
              stroke={strokeCol}
              strokeWidth="1.2"
            />
            {/* Top Roof */}
            <polygon
              points={`${tileWidthHalf},${prismH} ${tileWidth},${tileHeightHalf} ${tileWidthHalf},${tileHeight} 0,${tileHeightHalf}`}
              fill={fillCol}
              stroke={strokeCol}
              strokeWidth="1.8"
            />
          </g>
        </svg>

        {/* Small symbol label overlay */}
        <div className="absolute top-[32%] left-[40%] text-[8px] font-mono select-none font-bold text-center pointer-events-none">
          {o.icon === 'server' && <Cpu className="w-3.5 h-3.5 mx-auto text-cyan-400" />}
          {o.icon === 'shield' && <Shield className="w-3.5 h-3.5 mx-auto text-yellow-500" />}
          {o.icon === 'bed' && <Activity className="w-3.5 h-3.5 mx-auto text-pink-500 animate-pulse" />}
          {o.icon === 'debris' && <Skull className="w-3.5 h-3.5 mx-auto text-orange-500" />}
          {o.icon === 'console' && <Terminal className="w-3.5 h-3.5 mx-auto text-emerald-400" />}
          {o.icon === 'zap' && <Zap className="w-3.5 h-3.5 mx-auto text-red-500 animate-pulse" />}
          <span className="text-[5px] text-gray-400 block tracking-tighter mt-0.5 max-w-[48px] truncate leading-none capitalize">
            {o.name.split(' ')[0]}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#0b0b14]/95 border border-gray-800 p-4 rounded-lg space-y-4 shadow-2xl relative overflow-hidden">
      
      {/* Decorative cyber corner highlights */}
      <div className="absolute top-0 left-0 w-8 h-[1px] bg-cyan-400"></div>
      <div className="absolute top-0 left-0 w-[1px] h-8 bg-cyan-400"></div>
      <div className="absolute bottom-0 right-0 w-8 h-[1px] bg-rose-500"></div>
      <div className="absolute bottom-0 right-0 w-[1px] h-8 bg-rose-500"></div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div>
          <h3 className="text-xs font-mono font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
            <Compass className="text-rose-500 animate-spin-slow w-4.5 h-4.5" /> 2D TACTICAL VECTOR GRID MAP
          </h3>
          <p className="text-[9px] text-gray-500 font-mono mt-0.5">Scale: 1 Tile = 2m. Supports live token dragging & GM environmental prop placement.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          {/* Calculate distance scanner toggle */}
          <button
            onClick={() => {
              audio.playUIBeep();
              setDistanceMeasureActive(!distanceMeasureActive);
              if (distanceMeasureActive) {
                setMeasureTargetId(null);
              }
            }}
            className={`px-3 py-1.5 rounded text-[9px] font-black uppercase border transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
              distanceMeasureActive
                ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                : 'bg-[#111122] border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" /> 
            {distanceMeasureActive ? 'RANGE FINDER ACTIVE: CLICK HOSTILE' : 'CALCULATE DISTANCE'}
          </button>

          {/* Player remaining speed budget tag */}
          {combatActive && activeCharId === player.id && player.deployed !== false && (
            <div className="bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400 animate-pulse" /> MOVE SPENT: {playerMovementSpent} / {(player.move || 6) * 2}M
            </div>
          )}
        </div>
      </div>

      {/* Grid Canvas + Interactive Sidebar layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
        
        {/* PALETTE SIDEBAR: Left column */}
        <div className="md:col-span-1 bg-black/60 border border-gray-800 p-3.5 rounded-lg space-y-3 font-mono">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-yellow-500 uppercase border-b border-gray-800 pb-1.5">
            <Layers className="w-4 h-4" /> ASSET STAMP PALETTE
          </div>

          <p className="text-[9px] text-gray-400 leading-normal">
            {gmOverrideActive ? (
              <span className="text-emerald-400 font-bold">✔️ GM ARCHITECT PRIVILEGE ACTIVE: Drag and drop environmental assets onto empty grid lines below!</span>
            ) : (
              <span className="text-yellow-500/80">⚠️ READ ONLY: Unlock GM Master Override Matrix below to activate drag-and-drop prop spawning features.</span>
            )}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
            {[
              { name: 'Cargo Crate', icon: 'shield', desc: 'Blocks bullets pathways', style: 'text-yellow-500 border-yellow-500/20 bg-yellow-905/10' },
              { name: 'Server Stack', icon: 'server', desc: 'Secure program mainframe', style: 'text-cyan-400 border-cyan-500/20 bg-cyan-905/10' },
              { name: 'Terminal Console', icon: 'console', desc: 'Terminal database keyboard', style: 'text-emerald-400 border-emerald-500/20 bg-emerald-905/10' },
              { name: 'Energy Core', icon: 'zap', desc: 'High voltage radiation core', style: 'text-rose-400 border-red-500/20 bg-red-905/10' },
              { name: 'Clinic Bed', icon: 'bed', desc: 'Surgical cyberware table', style: 'text-pink-400 border-pink-500/20 bg-pink-905/10' },
              { name: 'Debris Pile', icon: 'debris', desc: 'Difficult path modifiers', style: 'text-orange-400 border-orange-500/20 bg-orange-905/10' }
            ].map(item => (
              <div
                key={item.name}
                draggable={gmOverrideActive}
                onDragStart={(e) => handlePaletteDragStart(e, item.name, item.icon)}
                className={`p-2 border rounded transition-all cursor-${gmOverrideActive ? 'grab active:cursor-grabbing' : 'not-allowed'} hover:bg-white/5 space-y-1 ${item.style}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider">{item.name}</span>
                  {gmOverrideActive ? (
                    <span className="text-[7px] text-emerald-400 px-1 border border-emerald-500/30 rounded uppercase">DRAG ME</span>
                  ) : (
                    <Lock className="w-2.5 h-2.5 text-gray-500" />
                  )}
                </div>
                <p className="text-[7px] text-gray-400 leading-snug">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                audio.playUIBeep();
                updateState({ customObstacles: [] });
              }}
              disabled={!gmOverrideActive}
              className="w-full py-1.5 border border-red-650/40 bg-red-950/20 hover:bg-red-950/40 text-red-400 disabled:opacity-20 hover:text-white transition rounded text-[9px] font-black tracking-widest uppercase cursor-pointer"
            >
              🧹 CLEAR CUSTOM PROPS
            </button>
          </div>
        </div>

        {/* ISOMETRIC MATRIX VIEWPORT: Right Column */}
        <div 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className="md:col-span-3 bg-[#050512] border border-gray-800 rounded-lg p-2 relative h-[450px] overflow-hidden select-none scrollbar-none cursor-grab active:cursor-grabbing transform-gpu"
        >
          
          {/* Cyberpunk Atmospheric Style Keyframes */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes steam-rise {
              0% { transform: translateY(0px) scale(0.8); opacity: 0; }
              20% { opacity: 0.18; }
              80% { opacity: 0.1; }
              100% { transform: translateY(-60px) scale(1.5); opacity: 0; }
            }
            @keyframes smog-sway {
              0% { transform: translate(-5%, -5%) rotate(0deg); }
              50% { transform: translate(5%, 5%) rotate(2deg); }
              100% { transform: translate(-5%, -5%) rotate(0deg); }
            }
            @keyframes neon-flicker-bar {
              0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { 
                opacity: 1; 
                text-shadow: 0 0 6px rgba(255, 0, 150, 0.95), 0 0 12px rgba(255, 0, 150, 0.4);
                border-color: rgba(236, 72, 153, 0.9);
                color: rgba(253, 244, 255, 1);
              }
              20%, 24%, 55% { 
                opacity: 0.4; 
                text-shadow: none;
                border-color: rgba(236, 72, 153, 0.2);
                color: rgba(236, 72, 153, 0.4);
              }
            }
            @keyframes neon-flicker-side {
              0%, 9%, 11%, 13%, 20%, 80%, 100% { opacity: 1; text-shadow: 0 0 8px rgba(6, 182, 212, 1); }
              10%, 12% { opacity: 0.2; text-shadow: none; }
            }
            @keyframes rain-slick {
              0% { background-position: 0px 0px; }
              100% { background-position: 20px 400px; }
            }
            .rain-overlay {
              background: repeating-linear-gradient(0deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 18px, rgba(34,211,238,0.18) 19px, rgba(34,211,238,0.18) 20px);
              background-size: 200px 400px;
              animation: rain-slick 0.8s linear infinite;
            }
          `}} />

          {/* Rain-slick vertical streaks overlay */}
          <div className="absolute inset-0 pointer-events-none rain-overlay opacity-35 z-20"></div>

          {/* Flickering Neon Board billboard banner */}
          <div 
            className="absolute top-3 left-4 text-[9px] font-mono uppercase bg-black/85 border-[1.5px] px-2.5 py-1 rounded shadow-[0_0_12px_rgba(255,0,150,0.45)] z-30 select-none font-black flex items-center gap-1.5 cursor-default"
            style={{ animation: 'neon-flicker-bar 4s infinite' }}
          >
            <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-ping"></span>
            LIVE AREA HOST: FORSAKEN LOT BAR // SECTOR NC-552
          </div>

          {/* Toxic Smog clouds overlay */}
          <div 
            className="absolute -inset-10 pointer-events-none bg-radial-at-t from-[#22c55e]/5 via-[#eab308]/3 to-transparent z-15 mix-blend-screen opacity-70"
            style={{ animation: 'smog-sway 10s ease-in-out infinite' }}
          ></div>

          {/* Steaming Vent plume loops */}
          <div className="absolute top-[60%] left-[25%] pointer-events-none select-none z-22" style={{ animation: 'steam-rise 3s ease-out infinite' }}>
            <div className="w-8 h-8 rounded-full bg-white/10 blur-md"></div>
          </div>
          <div className="absolute top-[35%] left-[65%] pointer-events-none select-none z-22" style={{ animation: 'steam-rise 4.2s ease-out infinite' }}>
            <div className="w-10 h-10 rounded-full bg-white/10 blur-lg"></div>
          </div>

          {/* Red Alert Neon Hazard Indicator Rings */}
          <div className="absolute top-[80%] left-[82%] pointer-events-none border border-red-500/25 w-16 h-8 rounded-full z-12 animate-pulse flex items-center justify-center">
            <div className="border border-red-500/40 w-12 h-6 rounded-full animate-ping"></div>
          </div>
          <div className="absolute top-[20%] left-[12%] pointer-events-none border border-red-500/25 w-16 h-8 rounded-full z-12 animate-pulse flex items-center justify-center">
            <div className="border border-red-500/40 w-12 h-6 rounded-full animate-ping"></div>
          </div>
          
          {/* Active Measure Laser Overlay */}
          {distanceMeasureActive && distLine && (
            <div className="absolute inset-0 pointer-events-none z-30">
              <svg className="w-full h-full absolute top-0 left-0 overflow-visible">
                <defs>
                  <linearGradient id="cyber-vec" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff00ff" />
                    <stop offset="100%" stopColor="#00ffff" />
                  </linearGradient>
                </defs>
                <line
                  x1={distLine.x1}
                  y1={distLine.y1}
                  x2={distLine.x2}
                  y2={distLine.y2}
                  stroke="url(#cyber-vec)"
                  strokeWidth="2"
                  strokeDasharray="4,3"
                  className="animate-pulse"
                />
              </svg>
              {/* Floating laser coordinate marker */}
              <div 
                className="absolute bg-[#ff00ff] text-black border border-white/60 shadow-[0_0_10px_#ff00ff] px-2 py-0.5 rounded text-[8px] font-mono font-extrabold uppercase tracking-widest"
                style={{
                  left: (distLine.x1 + distLine.x2) / 2,
                  top: (distLine.y1 + distLine.y2) / 2 - 12,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                🎯 DISPLACEMENT: {measuredMeters} M
              </div>
            </div>
          )}

          {/* Absolute Isometric Render Board container */}
          <div 
            className="relative transform-gpu" 
            style={{ 
              width: '820px', 
              height: '410px',
              transform: viewPerspective === 'top-down'
                ? 'scale(0.85) translate(40px, 30px)'
                : `perspective(1000px) rotateX(${cameraAngleX}deg) rotateZ(${cameraAngleZ}deg) scale(0.95)`,
              transformStyle: 'preserve-3d',
              transition: isRotatingCamera ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              transformOrigin: '410px 205px'
            }}
          >
            
            {/* Draw Isometric Grid Tiles first base matrix */}
            {Array.from({ length: gridHeight }).map((_, rIdx) => {
              const y = rIdx + 1;
              return Array.from({ length: gridWidth }).map((_, cIdx) => {
                const x = cIdx + 1;
                const { left, top } = getIsoCoords(x, y);

                const hasObstacle = getObstacleAt(x, y);
                const isPlayerStanding = (player.x || 1) === x && (player.y || 1) === y && !player.isDead && player.deployed !== false;
                const enemyStanding = enemies.find(en => !en.isDead && en.deployed !== false && (en.x || 2) === x && (en.y || 2) === y);

                const isActivePlayerCell = combatActive && activeCharId === player.id && isPlayerStanding;
                const isActiveEnemyCell = combatActive && enemyStanding && activeCharId === enemyStanding.id;

                // Glowing vector line states
                let tileStroke = 'rgba(99, 102, 241, 0.16)'; // Faint indigo empty structures
                let tileFill = 'rgba(12, 12, 26, 0.35)';

                if (isActivePlayerCell) {
                  tileStroke = 'rgba(34, 211, 238, 0.85)'; // Neon cyan glowing outline
                  tileFill = 'rgba(34, 211, 238, 0.12)';
                } else if (isActiveEnemyCell) {
                  tileStroke = 'rgba(236, 72, 153, 0.85)'; // Neon magenta active outline
                  tileFill = 'rgba(236, 72, 153, 0.12)';
                } else if (measureTargetId && enemyStanding && measureTargetId === enemyStanding.id) {
                  tileStroke = 'rgba(251, 191, 36, 0.8)'; // amber measurement outline
                  tileFill = 'rgba(251, 191, 36, 0.1)';
                }

                return (
                  <div
                    key={`tile-${x}-${y}`}
                    onClick={() => handleCellClick(x, y)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropUnified(e, x, y)}
                    className="absolute group transition-colors duration-150"
                    style={{ left, top, width: tileWidth, height: tileHeight }}
                  >
                    <svg 
                      width={tileWidth} 
                      height={tileHeight} 
                      viewBox={`0 0 ${tileWidth} ${tileHeight}`}
                      className="overflow-visible"
                    >
                      <polygon
                        points={`${tileWidthHalf},0 ${tileWidth},${tileHeightHalf} ${tileWidthHalf},${tileHeight} 0,${tileHeightHalf}`}
                        fill={tileFill}
                        stroke={tileStroke}
                        strokeWidth={isActivePlayerCell || isActiveEnemyCell ? '1.8' : '1.0'}
                        className="group-hover:stroke-pink-500 group-hover:fill-pink-500/5 transition-all"
                      />
                    </svg>

                    {/* Faint coordinate markers inside cells */}
                    <span className="absolute bottom-[20%] left-[34%] text-[5px] text-gray-700 pointer-events-none group-hover:text-pink-500 font-mono">
                      {x},{y}
                    </span>
                  </div>
                );
              });
            })}

            {/* Render 3D geometric Wireframe boxes for obstacles */}
            {obstacles.map(o => {
              const { left, top } = getIsoCoords(o.x, o.y);
              return renderIsometric3DObstacle(o, left, top);
            })}

            {/* Render Floating High-Tech Player Character Token */}
            {(!player.isDead && player.deployed !== false) && (() => {
              const { left, top } = getIsoCoords(player.x || 1, player.y || 1);
              const isActive = activeCharId === player.id;
              
              return (
                <div
                  draggable
                  onDragStart={(e) => handleCharacterDragStart(e, player.id)}
                  className={`absolute flex flex-col items-center justify-center transition-all ${
                    isActive ? 'animate-bounce' : ''
                  }`}
                  style={{
                    left: left + tileWidthHalf - 24,
                    top: top + tileHeightHalf - 38,
                    width: '48px',
                    height: '48px',
                    zIndex: 50 + (player.y || 1),
                  }}
                  title={`${player.name} (MOVE SPEED: ${player.move || 6}) // DRAG TO SHIFT POSITION`}
                >
                  {/* Floating shadow ring beneath character */}
                  <div className="absolute top-[82%] w-6 h-1.5 bg-cyan-400/40 rounded-full blur-[1px]"></div>
                  
                  {/* Neon Cyan Circle Token */}
                  <div className="w-10 h-10 rounded-full bg-cyan-950 border-[2.5px] border-cyan-400 shadow-[0_0_12px_#22d3ee] flex flex-col items-center justify-center cursor-grab active:cursor-grabbing">
                    <span className="text-[7px] font-mono leading-none tracking-tighter text-cyan-400 font-black">SOLO</span>
                    <span className="text-[9px] font-black leading-none text-white mt-0.5 uppercase">APEX</span>
                    <span className="text-[6px] font-mono text-gray-300 leading-none mt-0.5">HP:{player.hp}</span>
                  </div>
                </div>
              );
            })()}

            {/* Render Floating Enemy Character Tokens */}
            {enemies.filter(en => !en.isDead && en.deployed !== false).map(enemy => {
              const { left, top } = getIsoCoords(enemy.x || 2, enemy.y || 2);
              const isActive = activeCharId === enemy.id;
              const isSelectedTarget = measureTargetId === enemy.id;
              
              // Define shorthand label
              const displayLabel = enemy.name.includes('Arasaka') ? 'SEC' : enemy.name.includes('Militech') ? 'MIL' : enemy.name.split(' ')[0].substring(0,4).toUpperCase();
              
              return (
                <div
                  key={`token-${enemy.id}`}
                  draggable
                  onDragStart={(e) => handleCharacterDragStart(e, enemy.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    audio.playUIBeep();
                    setMeasureTargetId(enemy.id);
                  }}
                  className={`absolute flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all ${
                    isActive ? 'animate-bounce' : ''
                  }`}
                  style={{
                    left: left + tileWidthHalf - 24,
                    top: top + tileHeightHalf - 38,
                    width: '48px',
                    height: '48px',
                    zIndex: 50 + (enemy.y || 2),
                  }}
                  title={`${enemy.name} (HP: ${enemy.hp}) (MOVE: ${enemy.move || 5}) // Drag to shift coordinates`}
                >
                  {/* Shadow base ring */}
                  <div className="absolute top-[82%] w-6 h-1.5 bg-pink-500/30 rounded-full blur-[1px]"></div>

                  {/* Neon Magenta Circle with laser pulse outline if selected */}
                  <div className={`w-10 h-10 rounded-full bg-rose-950 border-[2.5px] flex flex-col items-center justify-center transition-all ${
                    isSelectedTarget 
                      ? 'border-yellow-400 shadow-[0_0_12px_rgba(251,191,36,0.95)] ring-2 ring-yellow-400/50' 
                      : 'border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                  }`}>
                    <span className="text-[7.5px] font-black leading-none text-white tracking-widest">{displayLabel}</span>
                    <span className="text-[6.5px] bg-black/80 text-pink-400 px-1 py-0.2 rounded mt-0.5 font-bold font-mono">HP:{enemy.hp}</span>
                  </div>
                  {/* speech bubble for street slangs */}
                  {enemy.tauntText && (
                    <div className="absolute bottom-[108%] bg-[#0d020d]/95 border-2 border-[#ff0055] text-[#ff5599] text-[9px] font-mono font-bold tracking-tight px-2.5 py-1.5 rounded-md shadow-[0_0_15px_rgba(255,0,85,0.6)] animate-pulse max-w-[200px] whitespace-normal break-words z-50 text-center leading-snug">
                      💬 "{enemy.tauntText}"
                    </div>
                  )}
                </div>
              );
            })}

          </div>

          {/* Floating Empty Canvas Indicator */}
          {(!player.isDead && player.deployed === false) && enemies.filter(en => en.deployed !== false).length === 0 && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center font-mono space-y-2 p-5 text-center">
              <EyeOff className="w-8 h-8 text-rose-500 animate-pulse" />
              <p className="text-rose-500 uppercase font-black text-xs">[ ALL CONTESTANTS UNDEPLOYED ]</p>
              <p className="text-[10px] text-gray-500 max-w-sm">No Player Character or Hostile NPCs are currently toggled for deployment. Check checkboxes in the GM Master Tactical Roster to mount tokens onto grid vector files.</p>
            </div>
          )}

        </div>
      </div>

      {/* Floating active prop control context HUD */}
      {selectedPropObj && (
        <div className="p-3 bg-[#0d091a]/95 border border-[#ff00ff]/30 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 font-mono select-none">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#ff00ff]/10 border border-[#ff00ff]/30 rounded">
              <Layers className="w-5 h-5 text-[#ff00ff]" />
            </div>
            <div>
              <span className="text-[10px] uppercase text-gray-500 block">SELECTED VECTOR COMPONENT</span>
              <span className="text-[11px] font-extrabold text-white uppercase tracking-wider">{selectedPropObj.name} (Facing Angle: {selectedPropObj.angle || 0}°)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleRotateSelectedProp}
              disabled={!gmOverrideActive}
              className="flex-1 sm:flex-initial py-1.5 px-3 border border-[#ff00ff]/30 text-[#ff00ff] hover:bg-[#ff00ff]/10 disabled:opacity-20 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              title="Rotate 90deg flat plane face"
            >
              <RotateCw className="w-3.5 h-3.5" /> RE-ANGLE 90°
            </button>
            
            <button
              onClick={handleDeleteSelectedProp}
              disabled={!gmOverrideActive}
              className="flex-1 sm:flex-initial py-1.5 px-3 border border-red-500/30 text-red-500 hover:bg-red-500/10 disabled:opacity-20 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              title="Delete asset from coordinate vectors"
            >
              <Trash2 className="w-3.5 h-3.5" /> EVAPORATE ASSET
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
