import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../audio';
import { Volume2, VolumeX, Music, AlertCircle, Radio, Play, Sliders } from 'lucide-react';

export default function AudioControls({ currentMode }: { currentMode: 'exploration' | 'combat' }) {
  const [initialized, setInitialized] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [sfxVolume, setSfxVolume] = useState(0.6);
  const [activeTrackName, setActiveTrackName] = useState('DOWNTOWN_AMBIENT_909.DEC');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Sync mode names in UI
  useEffect(() => {
    if (currentMode === 'combat') {
      setActiveTrackName('MAX_ALERT_STREET_TACTICS_999.RAW');
    } else {
      setActiveTrackName('DOWNTOWN_AMBIENT_909.DEC');
    }
  }, [currentMode]);

  // Click handler to initiate AudioContext safely on User Interaction
  const handleStartAudio = () => {
    audio.init();
    audio.setMode(currentMode);
    setInitialized(true);
    audio.playUIBeep();
  };

  // Toggle Mute Music
  const handleToggleMusic = () => {
    audio.init();
    const isMuted = audio.toggleMuteMusic();
    setMusicMuted(isMuted);
    audio.playUIBeep();
  };

  // Toggle Mute SFX
  const handleToggleSFX = () => {
    audio.init();
    const isMuted = audio.toggleMuteSfx();
    setSfxMuted(isMuted);
    audio.playUIBeep();
  };

  // Adjust Music Volume
  const handleMusicVolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMusicVolume(val);
    audio.setMusicVolume(val);
  };

  // Adjust SFX Volume
  const handleSfxVolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSfxVolume(val);
    audio.setSfxVolume(val);
  };

  // Spectrum Equalizer draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const data = audio.getAnalyserData();
      
      // Draw procedural frequency spectrum blocks
      const barCount = 16;
      const barGap = 4;
      const barWidth = (width - (barCount - 1) * barGap) / barCount;

      for (let i = 0; i < barCount; i++) {
        // scale frequency value to canvas height
        const value = data[i] || 0;
        const barHeight = (value / 255) * height * 0.95 + 2;

        // Custom neon gradient colors
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        if (currentMode === 'combat') {
          gradient.addColorStop(0, '#ff003c'); // Red base
          gradient.addColorStop(0.6, '#ff00ff'); // Magenta central
          gradient.addColorStop(1, '#fcee0a'); // Yellow tip
        } else {
          gradient.addColorStop(0, '#00ffff'); // Cyan base
          gradient.addColorStop(0.5, '#39ff14'); // Green central
          gradient.addColorStop(1, '#ffffff'); // White tip
        }

        ctx.fillStyle = gradient;
        // Rounded bar tops
        ctx.fillRect(i * (barWidth + barGap), height - barHeight, barWidth, barHeight);
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [currentMode]);

  return (
    <div className="bg-[#0b0b14] border-2 border-cyan-500/30 rounded-lg p-4 shadow-[0_0_15px_rgba(0,255,255,0.1)] relative">
      {/* Glitch Grid header decor */}
      <div className="absolute top-0 right-4 flex gap-1.5 translate-y-[-50%]">
        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping"></span>
        <span className="w-3 h-1 bg-[#ff00ff] rounded-sm"></span>
        <span className="w-6 h-1 bg-[#39ff14] rounded-sm"></span>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        {/* Play trigger button */}
        {!initialized ? (
          <button
            onClick={handleStartAudio}
            className="w-full md:w-auto px-5 py-3 bg-[#fcee0a] hover:bg-[#d0c204] text-[#0a0a14] font-mono font-black rounded flex items-center justify-center gap-2.5 transition-all shadow-[0_0_12px_rgba(252,238,10,0.3)] hover:scale-102 cursor-pointer uppercase text-xs tracking-wider"
          >
            <Play className="w-4 h-4 fill-current" /> Initialise Deck Synthesizer
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-black/40 border border-[#39ff14]/30 px-3 py-1.5 rounded text-[#39ff14] text-xs font-mono">
            <span className="w-2.5 h-2.5 bg-[#39ff14] rounded-full animate-pulse border border-[#39ff14]" />
            GRID_SYNTH: ONLINE
          </div>
        )}

        {/* Dynamic visualizer panel */}
        <div className="flex-1 flex flex-col justify-center bg-black/65 border border-cyan-500/20 rounded p-2.5 w-full min-w-[200px]">
          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-widest mb-1.5">
            <span className="flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 animate-spin text-[#ff00ff]" /> PROC_SYNTH_TUNER
            </span>
            <span className={`${currentMode === 'combat' ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
              CODECS: [{currentMode === 'combat' ? 'ALARM_INTENSE' : 'LOW_AMBIENT'}]
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
            {/* Equalizer Wave Canvas */}
            <div className="sm:col-span-2">
              <canvas
                ref={canvasRef}
                width={200}
                height={50}
                className="w-full h-12 bg-[#020205] border border-cyan-500/15 rounded"
              />
            </div>
            
            {/* Current Track tape label */}
            <div className="sm:col-span-2 flex flex-col justify-center pl-1 font-mono">
              <div className="text-[10px] text-gray-500">PLAYING CHANNELS:</div>
              <div className="text-[11px] text-white font-bold truncate">
                {activeTrackName}
              </div>
              <div className="text-[9px] text-[#ff00ff] italic">
                {currentMode === 'combat' ? '⚡ high-tension combat theme active' : '💤 cyberdeck exploration sequence playing'}
              </div>
            </div>
          </div>
        </div>

        {/* Volume controls desk */}
        <div className="flex items-center gap-4 bg-black/20 p-2 rounded border border-white/5 w-full md:w-auto overflow-x-auto">
          {/* Music Controller */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <button
              onClick={handleToggleMusic}
              className={`p-1.5 rounded transition bg-black/40 border ${
                musicMuted ? 'border-red-500/40 text-red-500 hover:text-red-400' : 'border-cyan-500/30 text-cyan-400 hover:text-cyan-300'
              }`}
              title="Toggle Music Channel"
            >
              {musicMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
            </button>
            <div className="flex flex-col w-full text-[10px] font-mono">
              <div className="flex justify-between items-center text-gray-400 text-[8px] uppercase tracking-wider">
                <span>Music</span>
                <span>{musicMuted ? 'MUTE' : `${Math.round(musicVolume * 100)}%`}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVolume}
                onChange={handleMusicVolChange}
                disabled={musicMuted}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* SFX Controller */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <button
              onClick={handleToggleSFX}
              className={`p-1.5 rounded transition bg-black/40 border ${
                sfxMuted ? 'border-red-500/40 text-red-500 hover:text-red-400' : 'border-[#ff00ff]/30 text-[#ff00ff] hover:text-pink-400'
              }`}
              title="Toggle SFX Channel"
            >
              {sfxMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <div className="flex flex-col w-full text-[10px] font-mono">
              <div className="flex justify-between items-center text-gray-400 text-[8px] uppercase tracking-wider">
                <span>SFX</span>
                <span>{sfxMuted ? 'MUTE' : `${Math.round(sfxVolume * 100)}%`}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVolume}
                onChange={handleSfxVolChange}
                disabled={sfxMuted}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#ff00ff] disabled:opacity-30 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
