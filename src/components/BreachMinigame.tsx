import React, { useState, useEffect } from 'react';
import { audio } from '../audio';
import { ShieldAlert, Cpu, Zap, RotateCcw, XCircle, CheckCircle, Clock } from 'lucide-react';

interface BreachMinigameProps {
  targetSequence: string[];
  onSuccess: () => void;
  onFailure: () => void;
  onClose: () => void;
  timeLimit?: number;
}

const HEX_POOL = ['1C', 'E9', '55', 'BD', 'FF', '7A'];

export default function BreachMinigame({
  targetSequence,
  onSuccess,
  onFailure,
  onClose,
  timeLimit = 40,
}: BreachMinigameProps) {
  // Generate a random 4x4 grid loaded with HEX pool
  const [grid, setGrid] = useState<string[][]>([]);
  // Kept states of already uploaded/used cells
  const [usedCells, setUsedCells] = useState<boolean[][]>([]);
  
  // Selection States
  const [currentRow, setCurrentRow] = useState<number | null>(0); // Starts on Row 0
  const [currentCol, setCurrentCol] = useState<number | null>(null);
  const [isRowTurn, setIsRowTurn] = useState(true); // Alternates between row selection and col selection

  // Player input buffer
  const [playerBuffer, setPlayerBuffer] = useState<string[]>([]);
  const maxBufferLength = 6;

  // Time remaining
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [gameResult, setGameResult] = useState<'playing' | 'success' | 'failed'>('playing');

  // Initialize/Reset Game
  const initGame = () => {
    // Generate randomized matrix ensuring elements correspond to pool
    const newGrid: string[][] = [];
    const newUsed: boolean[][] = [];
    
    for (let r = 0; r < 4; r++) {
      const rowArr: string[] = [];
      const usedArr: boolean[] = [];
      for (let c = 0; c < 4; c++) {
        // Place some elements of targetSequence in grid to guarantee solvability
        if (r === 0 && c === 1 && targetSequence[0]) {
          rowArr.push(targetSequence[0]);
        } else if (r === 1 && c === 1 && targetSequence[1]) {
          rowArr.push(targetSequence[1]);
        } else if (r === 1 && c === 2 && targetSequence[2]) {
          rowArr.push(targetSequence[2]);
        } else {
          rowArr.push(HEX_POOL[Math.floor(Math.random() * HEX_POOL.length)]);
        }
        usedArr.push(false);
      }
      newGrid.push(rowArr);
      newUsed.push(usedArr);
    }

    setGrid(newGrid);
    setUsedCells(newUsed);
    setPlayerBuffer([]);
    setCurrentRow(0); // must select from row 0 first
    setCurrentCol(null);
    setIsRowTurn(true);
    setTimeLeft(timeLimit);
    setGameResult('playing');
    audio.playUIBeep();
  };

  useEffect(() => {
    initGame();
  }, [targetSequence]);

  // Timer Countdown Effect
  useEffect(() => {
    if (gameResult !== 'playing') return;

    if (timeLeft <= 0) {
      setGameResult('failed');
      audio.playNetFailure();
      onFailure();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, gameResult]);

  // Helper code to check sub-array match
  const checkSubArray = (buffer: string[], target: string[]) => {
    if (target.length === 0) return true;
    if (buffer.length < target.length) return false;
    for (let i = 0; i <= buffer.length - target.length; i++) {
      let match = true;
      for (let j = 0; j < target.length; j++) {
        if (buffer[i + j] !== target[j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  };

  // Click handler for Cell Selection
  const handleCellClick = (r: number, c: number) => {
    if (gameResult !== 'playing') return;

    // Check if the coordinate is selectable based on current rules
    if (isRowTurn && r !== currentRow) return;
    if (!isRowTurn && c !== currentCol) return;
    if (usedCells[r][c]) return;

    // Record the byte
    const clickedByte = grid[r][c];
    const newBuffer = [...playerBuffer, clickedByte];
    setPlayerBuffer(newBuffer);

    // Muted bip
    audio.playUIBeep();

    // Mark current cell as used
    const newUsed = usedCells.map((rowArr, rowIndex) =>
      rowArr.map((used, colIndex) => (rowIndex === r && colIndex === c ? true : used))
    );
    setUsedCells(newUsed);

    // Check success condition
    if (checkSubArray(newBuffer, targetSequence)) {
      setGameResult('success');
      audio.playNetSuccess();
      setTimeout(() => {
        onSuccess();
      }, 1500);
      return;
    }

    // Check buffer full condition (failure)
    if (newBuffer.length >= maxBufferLength) {
      setGameResult('failed');
      audio.playNetFailure();
      return;
    }

    // Prepare next turn constraints
    if (isRowTurn) {
      // Was row turn, player selected column c, now must select from column c
      setCurrentCol(c);
      setCurrentRow(null);
      setIsRowTurn(false);
    } else {
      // Was column turn, player selected row r, now must select from row r
      setCurrentRow(r);
      setCurrentCol(null);
      setIsRowTurn(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#06060c]/90 flex items-center justify-center p-4 z-50 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-[#0a0a14] border-2 border-[#ff0055] rounded-lg p-6 shadow-[0_0_25px_rgba(255,0,85,0.25)] relative overflow-hidden">
        {/* CRT Scanline scan */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%] animate-pulse"></div>

        {/* Diagonal wireframe hazard stripes top header */}
        <div className="h-2 w-full bg-[repeating-linear-gradient(45deg,#fcee0a,#fcee0a_10px,#000_10px,#000_20px)] rounded-t mb-4"></div>

        {/* Head panel */}
        <div className="flex justify-between items-center border-b border-[#ff0055]/30 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="text-[#ff00ff] animate-pulse w-5 h-5" />
            <h2 className="text-xl font-mono font-bold tracking-wider text-[#ff00ff]">
              BREACH_PROTOCOL.EXE <span className="text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">BUFFER ACCESSED</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#ff0055] hover:text-white hover:bg-[#ff0055]/20 p-1 rounded transition-colors font-mono uppercase text-xs border border-transparent hover:border-[#ff0055]/40"
          >
            [ DISCONNECT ]
          </button>
        </div>

        {/* Game Info Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Target Sequence Section */}
          <div className="md:col-span-2 bg-[#12111f] border border-cyan-500/20 rounded p-3">
            <div className="text-xs font-mono text-cyan-400 mb-2 flex items-center gap-1.5 font-bold uppercase tracking-widest">
              <Zap className="w-3.5 h-3.5 text-cyan-400 animate-bounce" /> Target Sequence
            </div>
            <div className="flex gap-2.5">
              {targetSequence.map((code, index) => (
                <div
                  key={index}
                  className="px-3 py-1.5 bg-[#0a0a14] border border-[#ff00ff] text-[#ff00ff] rounded font-mono font-bold text-center text-sm shadow-[0_0_8px_rgba(255,0,255,0.15)] glow-magenta-xs"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>

          {/* Clock Timer Section */}
          <div className="bg-[#12111f] border border-yellow-500/25 rounded p-3 flex flex-col justify-center items-center gap-1">
            <div className="text-xs font-mono text-yellow-500 uppercase tracking-widest flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Time Left
            </div>
            <div className={`text-2xl font-mono font-black ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
              {timeLeft}s
            </div>
          </div>
        </div>

        {/* Buffer visualizer */}
        <div className="bg-[#0f0e1e] border border-white/5 rounded p-2.5 mb-6 flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Memory Buffer:</span>
          <div className="flex gap-1.5 flex-1 min-h-[32px] items-center">
            {Array.from({ length: maxBufferLength }).map((_, i) => {
              const byteInBuff = playerBuffer[i];
              return (
                <div
                  key={i}
                  className={`w-10 h-8 rounded border flex items-center justify-center font-mono text-xs font-bold transition-all ${
                    byteInBuff
                      ? 'border-[#39ff14] text-[#39ff14] bg-[#39ff14]/10 shadow-[0_0_6px_rgba(57,255,20,0.15)]'
                      : 'border-gray-700 bg-[#06060c] text-teal-900'
                  }`}
                >
                  {byteInBuff || '..'}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Matrix Board & Guide */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* Guide list */}
          <div className="md:col-span-1 flex flex-col gap-3 h-full justify-center bg-[#0d0c16] border border-cyan-500/10 p-3 rounded text-xs font-mono text-gray-300">
            <div className="font-bold text-[#fcee0a] border-b border-[#fcee0a]/20 pb-1 uppercase tracking-wider">HACKING RULES</div>
            <p>1. Start by picking a node from the <span className="text-[#39ff14] font-bold">TOP ROW</span>.</p>
            <p>2. Then, choose from the same <span className="text-[#ff00ff] font-bold">COLUMN</span> of your selection.</p>
            <p>3. Alternate between <span className="text-[#39ff14]">ROW</span> and <span className="text-[#ff00ff]">COLUMN</span> searches.</p>
            <p className="text-gray-500">Max sequence buffer is 6. Load exact targets to unlock node.</p>
          </div>

          {/* Matrix Area */}
          <div className="md:col-span-3">
            <div className="grid grid-cols-4 gap-2 bg-[#06060c] p-3 rounded-lg border border-cyan-500/30">
              {grid.map((row, rIdx) => {
                const isRowActive = isRowTurn && currentRow === rIdx;
                return row.map((cell, cIdx) => {
                  const isColActive = !isRowTurn && currentCol === cIdx;
                  const isUsed = usedCells[rIdx][cIdx];
                  const isActiveSelection = (isRowTurn && rIdx === currentRow) || (!isRowTurn && cIdx === currentCol);
                  
                  return (
                    <button
                      key={`${rIdx}-${cIdx}`}
                      onClick={() => handleCellClick(rIdx, cIdx)}
                      disabled={isUsed || !isActiveSelection || gameResult !== 'playing'}
                      className={`h-14 rounded font-mono font-bold text-lg flex items-center justify-center transition-all relative ${
                        isUsed
                          ? 'bg-[#14121e]/20 border border-dashed border-gray-800 text-gray-600 cursor-not-allowed'
                          : isActiveSelection && gameResult === 'playing'
                          ? 'border-2 border-[#39ff14] bg-[#39ff14]/15 hover:bg-[#39ff14]/30 hover:scale-105 text-[#39ff14] shadow-[0_0_8px_rgba(57,255,20,0.2)] cursor-pointer'
                          : 'border border-gray-800 bg-[#090812] text-gray-400 opacity-60 hover:opacity-80'
                      }`}
                    >
                      {/* Interactive glows */}
                      {isRowActive && <div className="absolute inset-x-0 h-0.5 bg-[#39ff14] opacity-50 top-0 animate-pulse"></div>}
                      {isColActive && <div className="absolute inset-y-0 w-0.5 bg-[#ff00ff] opacity-40 left-0 animate-pulse"></div>}
                      
                      <span>{cell}</span>
                    </button>
                  );
                });
              })}
            </div>
          </div>
        </div>

        {/* Success/Failure States Overlay */}
        {gameResult === 'success' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-10 animate-fade-in">
            <CheckCircle className="text-[#39ff14] w-16 h-16 animate-bounce" />
            <div className="text-[#39ff14] font-mono text-2xl font-black tracking-widest uppercase">
              BREACH SUCCESSFUL
            </div>
            <div className="text-gray-400 font-mono text-sm max-w-xs text-center border-t border-gray-800 pt-2">
              Node decrypted. Advanced credentials injected into memory slot.
            </div>
          </div>
        )}

        {gameResult === 'failed' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-10 animate-fade-in">
            <XCircle className="text-[#ff003c] w-16 h-16 animate-ping" />
            <div className="text-[#ff003c] font-mono text-2xl font-black tracking-widest uppercase">
              BREACH_FAILED: ACCESS_DENIED
            </div>
            <div className="text-gray-400 font-mono text-sm mb-2">
              Grid lock initialized.
            </div>
            <button
              onClick={initGame}
              className="px-4 py-2 bg-[#ff003c] hover:bg-red-700 text-white font-mono rounded font-bold flex items-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(255,0,60,0.4)]"
            >
              <RotateCcw className="w-4 h-4" /> REBOOT SEQUENCER
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
