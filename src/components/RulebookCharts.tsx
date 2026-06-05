import React from 'react';
import { Shield, Hammer, Cpu, Terminal, X } from 'lucide-react';

interface RulebookChartsProps {
  role: string | undefined;
  onClose: () => void;
}

export default function RulebookCharts({ role, onClose }: RulebookChartsProps) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[20000] backdrop-blur-md">
      <div className="bg-[#0b0b14] border border-[#ff00ff]/30 p-5 rounded-lg max-w-lg w-full font-mono text-xs text-gray-300 space-y-4 shadow-[0_0_24px_rgba(255,0,255,0.25)] relative">
        <div className="absolute top-0 left-0 w-8 h-[1px] bg-[#ff00ff]"></div>
        <div className="absolute top-0 left-0 w-[1px] h-8 bg-[#ff00ff]"></div>

        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="text-[#ff00ff] w-4.5 h-4.5" />
            <span className="font-extrabold text-white text-[11px] uppercase tracking-widest text-glow-magenta">
              RULEBOOK RECON MATRIX: {role ? role.toUpperCase() : 'GENERAL'} ACTION DEVS
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-500 hover:text-white border border-gray-800 hover:border-gray-650 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic selector based on user role */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
          {/* 1. Solo Combat Awareness tables */}
          <div className="space-y-2 border border-blue-900/45 bg-blue-950/10 p-3 rounded">
            <h4 className="font-black text-blue-400 flex items-center gap-1.5 uppercase text-[10px] tracking-wider border-b border-blue-900/20 pb-1.5">
              <Shield className="w-4 h-4" /> Solo Combat Awareness Levels (Rulebook 142)
            </h4>
            <div className="text-[9px] text-gray-400 leading-normal space-y-1">
              <p>Allocate Combat Awareness points dynamically per turn to customize benefits:</p>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between border-b border-gray-850 pb-1">
                  <span className="font-bold text-white uppercase">1. Threat Detection</span>
                  <span>+1 Perception check modifier per level.</span>
                </div>
                <div className="flex justify-between border-b border-gray-850 pb-1">
                  <span className="font-bold text-white uppercase">2. Initiative Reactor</span>
                  <span>+1 Turn Initiative rolls per point.</span>
                </div>
                <div className="flex justify-between border-b border-gray-850 pb-1">
                  <span className="font-bold text-white uppercase">3. Precision Attack</span>
                  <span>+1 Modifier to basic weapon shots.</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="font-bold text-white uppercase">4. Fumble Recovery</span>
                  <span>Allows re-roll index on 1 fumbles of d10.</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Tech Invention DV Calculations tables */}
          <div className="space-y-2 border border-emerald-900/45 bg-emerald-950/10 p-3 rounded">
            <h4 className="font-black text-emerald-400 flex items-center gap-1.5 uppercase text-[10px] tracking-wider border-b border-emerald-900/20 pb-1.5">
              <Hammer className="w-4 h-4" /> Tech Maker / Invention DV Matrix (Rulebook 147)
            </h4>
            <div className="text-[9px] text-gray-400 leading-normal space-y-1">
              <p>Difficulty Values (DV) and Time to Invent or Repair equipment modifications:</p>
              <div className="space-y-1 pt-1.5">
                <div className="grid grid-cols-3 border-b border-gray-850 pb-1 font-bold text-white uppercase">
                  <span>ITEM TARGET TYPE</span>
                  <span>DV CODE</span>
                  <span>TIME FRAME</span>
                </div>
                <div className="grid grid-cols-3 border-b border-gray-850 pb-1">
                  <span>Regular Customizer</span>
                  <span className="text-emerald-400">DV 13</span>
                  <span>1 Standard Day</span>
                </div>
                <div className="grid grid-cols-3 border-b border-gray-850 pb-1">
                  <span>Heavy Tech Weapon</span>
                  <span className="text-emerald-400">DV 17</span>
                  <span>1 Standard Week</span>
                </div>
                <div className="grid grid-cols-3 border-b border-gray-850 pb-1">
                  <span>Iconic Superchrome</span>
                  <span className="text-emerald-400">DV 21</span>
                  <span>1 Full Month</span>
                </div>
                <div className="grid grid-cols-3">
                  <span>Prototype Matrix</span>
                  <span className="text-emerald-400 font-extrabold">DV 29!!</span>
                  <span>GM Custom discretion</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Netrunning Action DV standard table rules */}
          <div className="space-y-2 border border-pink-900/45 bg-pink-950/10 p-3 rounded">
            <h4 className="font-black text-pink-400 flex items-center gap-1.5 uppercase text-[10px] tracking-wider border-b border-pink-900/20 pb-1.5">
              <Cpu className="w-4 h-4" /> Netrunner Action DV & Ability Rules (Rulebook 198)
            </h4>
            <div className="text-[9px] text-gray-400 leading-normal space-y-1">
              <p>Interface Abilities turn budgets and action target ratings:</p>
              <div className="space-y-1.5 pt-1.5">
                <div className="flex justify-between border-b border-gray-850 pb-1">
                  <span className="font-bold text-white uppercase">1. Scan Subnet</span>
                  <span>Pathfinder skill check (Target DV 12 to 18)</span>
                </div>
                <div className="flex justify-between border-b border-gray-850 pb-1">
                  <span className="font-bold text-white uppercase">2. Bypass Password</span>
                  <span>Interface level vs node encryption rating (DV 10-20)</span>
                </div>
                <div className="flex justify-between border-b border-gray-850 pb-1">
                  <span className="font-bold text-white uppercase">3. Slide from ICE</span>
                  <span>Evasion from active programs. DV = Program Evasion index</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-white uppercase">4. File Retrieval</span>
                  <span>Allows retrieval of lore streams or data cards</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-3 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-white font-bold rounded uppercase cursor-pointer text-[10px]"
          >
            ACKNOWLEDGE MATRIX
          </button>
        </div>
      </div>
    </div>
  );
}
