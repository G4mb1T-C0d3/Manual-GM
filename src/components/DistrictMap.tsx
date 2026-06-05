import React, { useState } from 'react';
import { Compass, User, RefreshCw, Zap } from 'lucide-react';
import { audio } from '../audio';

interface DistrictMapProps {
  currentDistrict: string;
  portraitCategory: 'Male' | 'Female' | 'Non-Binary';
  onSelectPortraitCategory: (category: 'Male' | 'Female' | 'Non-Binary') => void;
  onSelectDistrict?: (districtName: string) => void;
}

const DISTRICTS = [
  { name: 'Watson', description: 'Industrial district run by corporate scavs and Maelstrom.', x: 120, y: 110, bg: 'from-orange-500/10 to-transparent' },
  { name: 'Corporate Plaza', description: 'Sleek steel towers, private securities, and high-tier executives.', x: 280, y: 190, bg: 'from-cyan-500/10 to-transparent' },
  { name: 'Old Combat Zone', description: 'Lawless sector, booster gang territory, zero state control.', x: 420, y: 260, bg: 'from-red-650/10 to-transparent' },
  { name: 'Westbrook', description: 'Neon pleasure dens, wealthy enclaves, and luxury spaces.', x: 380, y: 100, bg: 'from-pink-500/10 to-transparent' },
  { name: 'Pacifica', description: 'Unfinished resort district, independent combat territory.', x: 140, y: 320, bg: 'from-yellow-500/10 to-transparent' },
  { name: 'Heywood', description: 'Suburban sector with deep street loyalties and Valentino gangs.', x: 240, y: 260, bg: 'from-emerald-500/10 to-transparent' },
  { name: 'Santo Domingo', description: 'Smoggy industrial warehouses, power stations, and working-class blocks.', x: 440, y: 150, bg: 'from-amber-600/10 to-transparent' }
];

const PORTRAITS = {
  Male: [
    { name: 'David (Cyberwarrior)', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150', accent: 'cyan' },
    { name: 'Johnny (Rockerboy)', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150', accent: 'red' },
    { name: 'Falco (Chauffeur)', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150', accent: 'yellow' }
  ],
  Female: [
    { name: 'Lucy (Netrunner)', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150', accent: 'pink' },
    { name: 'Rebecca (Solo Tech)', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150', accent: 'emerald' },
    { name: 'Rogue (Fixer)', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150', accent: 'amber' }
  ],
  'Non-Binary': [
    { name: 'Kiwi (Subnet Deck)', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150', accent: 'purple' },
    { name: 'T-Bug (Programmer)', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150', accent: 'blue' },
    { name: 'Spider (Matrix Hack)', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150', accent: 'violet' }
  ]
};

export default function DistrictMap({
  currentDistrict,
  portraitCategory,
  onSelectPortraitCategory,
  onSelectDistrict
}: DistrictMapProps) {
  const [selectedCharIndex, setSelectedCharIndex] = useState<number>(0);

  // Derive active coordinates for party beacon based on district matching
  const matchingDistrictInstance = DISTRICTS.find(
    d => d.name.toLowerCase() === currentDistrict.toLowerCase()
  ) || DISTRICTS[0];

  const activePortraits = PORTRAITS[portraitCategory];
  const activeChar = activePortraits[selectedCharIndex % activePortraits.length];

  return (
    <div className="bg-[#0b0b14]/95 border border-[#ff00ff]/30 p-5 rounded-lg space-y-6 shadow-[0_0_20px_rgba(255,0,255,0.1)] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-12 h-[1px] bg-[#ff00ff]"></div>
      <div className="absolute top-0 left-0 w-[1px] h-12 bg-[#ff00ff]"></div>
      <div className="absolute bottom-0 right-0 w-12 h-[1px] bg-[#00ffff]"></div>
      <div className="absolute bottom-0 right-0 w-[1px] h-12 bg-[#00ffff]"></div>

      {/* Grid Scanner Scanline */}
      <div className="absolute inset-0 pointer-events-none bg-radial-at-t from-[#ff00ff]/5 via-transparent to-transparent"></div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <span className="text-[9px] text-[#ff00ff] font-mono tracking-widest block uppercase font-bold text-glow-magenta">// SECURE SATELLITE BROADCAST LINK //</span>
          <h2 className="text-xl font-black text-white tracking-wider flex items-center gap-2">
            <Compass className="text-[#ff00ff] animate-spin-slow w-5 h-5" /> NIGHT CITY DISTRICT EXPLORER MAP
          </h2>
          <p className="text-[10px] text-gray-400 font-mono">Exploring in peacetime. Tactical grid automatically activates during contract skirmishes.</p>
        </div>

        {/* Dynamic portrait selection controls */}
        <div className="bg-[#0e0c15] border border-gray-850 p-2 rounded flex flex-col sm:flex-row items-center gap-3">
          <span className="text-[8px] text-gray-500 uppercase tracking-widest font-mono flex items-center gap-1">
            <User className="text-[#ff00ff] w-3 h-3" /> crew avatar template:
          </span>
          <div className="flex rounded bg-black p-0.5 border border-white/5 text-[9px] font-mono font-bold">
            {(['Male', 'Female', 'Non-Binary'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => {
                  audio.playUIBeep();
                  onSelectPortraitCategory(cat);
                  setSelectedCharIndex(0);
                }}
                className={`px-2 py-1 rounded transition duration-150 uppercase tracking-widest cursor-pointer ${
                  portraitCategory === cat
                    ? 'bg-[#ff00ff] text-white shadow-[0_0_8px_rgba(255,0,255,0.3)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-stretch">
        {/* District Map Drawing container (Vector wireframe feel) */}
        <div className="xl:col-span-3 bg-black/60 border border-gray-805 h-[400px] rounded relative overflow-hidden flex items-center justify-center">
          
          {/* Neon Grid gridlines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
          
          <svg className="w-full h-full absolute inset-0 pointer-events-none">
            {/* Draw vector street links */}
            <path d="M120,110 L280,190 M280,190 L420,260 M280,190 L380,100 M280,190 L240,260 M120,110 L140,320 M140,320 L240,260 M420,260 L440,150 M380,100 L440,150" stroke="rgba(255,0,255,0.12)" strokeWidth="1.5" strokeDasharray="3,3" />
            <path d="M120,110 L380,100 M140,320 L420,260" stroke="rgba(0,255,255,0.08)" strokeWidth="1" />
          </svg>

          {/* Render Vector district elements */}
          {DISTRICTS.map(d => {
            const isActive = d.name.toLowerCase() === currentDistrict.toLowerCase();
            return (
              <div
                key={d.name}
                onClick={() => {
                  audio.playNetSuccess();
                  if (onSelectDistrict) onSelectDistrict(d.name);
                }}
                className={`absolute p-3 rounded-lg border transition-all duration-300 flex flex-col justify-center items-center text-center group select-none cursor-pointer max-w-[130px] bg-gradient-to-b ${d.bg} ${
                  isActive
                    ? 'border-[#ff00ff] bg-black/80 scale-103 shadow-[0_0_15px_rgba(255,0,255,0.15)] z-20'
                    : 'border-zinc-800 bg-black/30 hover:border-zinc-650 opacity-60 hover:opacity-90'
                }`}
                style={{ left: d.x, top: d.y }}
              >
                <span className={`text-[11px] font-black tracking-widest uppercase block ${isActive ? 'text-[#ff00ff] text-glow-magenta' : 'text-zinc-400 group-hover:text-white'}`}>
                  {d.name}
                </span>
                <span className="text-[7.5px] text-zinc-500 font-mono mt-1 hidden group-hover:block leading-tight">
                  {d.description}
                </span>

                {isActive && (
                  <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-yellow-400 border border-black rounded-full flex items-center justify-center animate-ping"></div>
                )}
              </div>
            );
          })}

          {/* Animated Team Beacon: "YOU ARE HERE // CONNECTED TO LOCAL AREA NODE" */}
          <div
            className="absolute transition-all duration-500 z-30"
            style={{
              left: matchingDistrictInstance.x + 40,
              top: matchingDistrictInstance.y - 40,
            }}
          >
            {/* Vertical scanning pulse line linking beacon to district node */}
            <div className="w-[1.5px] bg-[#00ffff] absolute -bottom-16 left-1/2 -translate-x-1/2 h-16 animate-pulse border-r border-[#00ffff]/30"></div>

            <div className="bg-[#08080f]/95 border-2 border-[#00ffff] p-2.5 rounded shadow-[0_0_15px_rgba(0,255,255,0.4)] relative flex items-center gap-3 min-w-[200px] overflow-hidden select-none">
              {/* Spinning scanning visual indicator */}
              <div className="absolute top-0 right-0 w-16 h-1 bg-[#00ffff]/20 animate-pulse"></div>
              
              {/* Portrait Display on selection */}
              <div className="w-10 h-10 rounded-full bg-cyan-950 border-2 border-cyan-400 overflow-hidden flex-shrink-0 animate-pulse relative">
                <img
                  src={activeChar.url}
                  alt={activeChar.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover filter brightness-110 contrast-125"
                />
              </div>

              <div className="font-mono text-[8px] leading-relaxed">
                {/* Crew active message */}
                <div className="flex items-center gap-1 text-[#00ffff] font-black uppercase text-[7px] animate-pulse">
                  <span className="w-1.5 h-1.5 bg-[#00ffff] rounded-full animate-ping"></span>
                  Connected to Local Area Node
                </div>
                <div className="text-white font-black uppercase mt-0.5 max-w-[130px] truncate">{activeChar.name}</div>
                <div className="text-zinc-500 text-[6.5px] uppercase mt-0.5 tracking-tighter">Loc: <span className="text-yellow-400 font-bold">{matchingDistrictInstance.name} Sector</span></div>
                
                {/* Custom warning sticker */}
                <div className="text-[6px] text-pink-500 uppercase font-black bg-pink-500/10 px-1 py-0.5 rounded border border-pink-500/20 max-w-[144px] truncate mt-1">
                  YOU ARE HERE // IP: NC.98.02.FL
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Portrait & Crew metadata selector sidebar */}
        <div className="xl:col-span-1 bg-[#090911]/90 border border-gray-805 rounded p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3 font-mono">
            <span className="text-[9px] text-[#ff00ff] font-bold block uppercase tracking-widest">// ACTIVE TEAM REGISTERED CORES //</span>
            
            <p className="text-[9px] text-gray-500 leading-normal">
              Select an archetype template to bind to your tactical team beacon. Each profile matches standard canonical crew representation specifications.
            </p>

            <div className="space-y-2.5">
              {activePortraits.map((item, index) => {
                const isSelected = selectedCharIndex === index;
                return (
                  <div
                    key={item.name}
                    onClick={() => {
                      audio.playUIBeep();
                      setSelectedCharIndex(index);
                    }}
                    className={`p-2 border rounded-lg flex items-center gap-3 transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'border-[#ff00ff] bg-[#ff00ff]/5 shadow-[0_0_10px_rgba(255,0,255,0.1)] scale-102 text-white'
                        : 'border-zinc-800 bg-[#06060c] hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="w-9 h-9 rounded bg-black overflow-hidden flex-shrink-0 border border-zinc-750">
                      <img
                        src={item.url}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover filter brightness-110"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-glow-magenta block leading-none">{item.name.split(' ')[0]}</span>
                      <span className="text-[7.5px] text-zinc-500 uppercase mt-1 block">{item.name.split(' ')[1] || 'Edgerunner'}</span>
                    </div>

                    {isSelected && (
                      <span className="ml-auto w-1.5 h-1.5 bg-[#ff00ff] rounded-full animate-ping"></span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-black/40 border border-gray-800 p-2.5 rounded space-y-1.5">
            <div className="text-[7.5px] text-zinc-500 font-mono uppercase tracking-widest">// NET RECON METRICS:</div>
            <div className="font-mono text-[8px] text-emerald-400 font-extrabold flex items-center justify-between">
              <span>District Risk Penalty:</span>
              <span className="text-glow-green">0% (PEACETIME)</span>
            </div>
            <div className="font-mono text-[8px] text-zinc-400 flex items-center justify-between">
              <span>Cyberdeck Signals:</span>
              <span>ESTABLISHED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
