import React, { useState, useEffect } from 'react';
import { Character, Weapon, LogEntry, MapObstacle } from '../types';
import { getWeaponDV, rollD10, rollDamage, getGameTime } from '../utils';
import { CRITICAL_INJURIES_POOL, STREET_SLANG_TAUNTS, SLANG_HIT, SLANG_MISS, SLANG_DAMAGE_TAKEN, SLANG_CRITICAL_INFLICTED } from '../data';
import { audio } from '../audio';
import {
  Shield, Crosshair, Sword, Eye, Skull, ArrowRightCircle, Play, Sparkles,
  Zap, Compass, UserCheck, RefreshCw, AlertTriangle, MessageSquare
} from 'lucide-react';
import TacticalCombatMap from './TacticalCombatMap';
import GmAdministrativePanel from './GmAdministrativePanel';

const speakTaunt = (text: string, npcName?: string, onSpeechEnd?: () => void) => {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      const name = npcName || "";
      const isCorpoOrSec = name.toLowerCase().includes('arasaka') || 
                           name.toLowerCase().includes('corpo') || 
                           name.toLowerCase().includes('security') || 
                           name.toLowerCase().includes('warden') || 
                           name.toLowerCase().includes('turret') || 
                           name.toLowerCase().includes('automated');
      
      if (isCorpoOrSec) {
        // Arasaka Security: cold, monotone, perfectly articulated voice index configuration
        utterance.pitch = 0.95;
        utterance.rate = 1.05;
      } else {
        // Maelstrom Boosterganger: highly aggressive, rapid, lower-pitched voice profile
        utterance.pitch = 0.65;
        utterance.rate = 1.20;
      }
      
      const voices = window.speechSynthesis.getVoices();
      let voice: SpeechSynthesisVoice | undefined;
      
      if (isCorpoOrSec) {
        // Cold corporate monotone
        voice = voices.find(v => {
          const vName = v.name.toLowerCase();
          return v.lang.startsWith('en') && (vName.includes('female') || vName.includes('zira') || vName.includes('samantha') || vName.includes('google') || vName.includes('synthetic'));
        });
      } else {
        // Coarse aggressive booster
        voice = voices.find(v => {
          const vName = v.name.toLowerCase();
          return v.lang.startsWith('en') && (vName.includes('male') || vName.includes('david') || vName.includes('microsoft') || vName.includes('google') || vName.includes('robotic') || vName.includes('hazel'));
        });
      }
      
      if (!voice) {
        voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      }
      
      if (voice) {
        utterance.voice = voice;
      }
      
      let speechCalledEnd = false;
      const triggerSpeechEnd = () => {
        if (!speechCalledEnd) {
          speechCalledEnd = true;
          if (onSpeechEnd) onSpeechEnd();
        }
      };

      utterance.onend = triggerSpeechEnd;
      utterance.onerror = triggerSpeechEnd;

      // Defensive backup timeout (5 seconds) to clean UI even if synthesis triggers are slow/silent
      setTimeout(triggerSpeechEnd, 5000);

      window.speechSynthesis.speak(utterance);
    } else {
      if (onSpeechEnd) {
        setTimeout(onSpeechEnd, 4000);
      }
    }
  } catch (err) {
    console.warn("Vocal tts trigger failed", err);
    if (onSpeechEnd) onSpeechEnd();
  }
};


interface CombatTrackProps {
  player: Character;
  enemies: Character[];
  combatActive: boolean;
  round: number;
  turnIndex: number;
  turnOrder: string[];
  logs: LogEntry[];
  turretHacked: boolean; // Integrated netrunning turret state
  updateState: (newState: {
    player?: Character;
    enemies?: Character[];
    combatActive?: boolean;
    round?: number;
    turnIndex?: number;
    turnOrder?: string[];
    logs?: LogEntry[];
    currentGig?: any;
    manualNpcControl?: boolean;
    customObstacles?: MapObstacle[];
  }) => void;
  currentGig?: any;
  manualNpcControl?: boolean;
  customObstacles?: MapObstacle[];
  userRole?: 'gm' | 'player' | null;
}

export default function CombatTrack({
  player,
  enemies,
  combatActive,
  round,
  turnIndex,
  turnOrder,
  logs,
  turretHacked,
  updateState,
  currentGig,
  manualNpcControl = false,
  customObstacles = [],
  userRole = 'player',
}: CombatTrackProps) {
  const [gmOverrideUnlocked, setGmOverrideUnlocked] = useState<boolean>(false);

  // Target settings for active player turn
  const [targetCharId, setTargetCharId] = useState<string>('');
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>(player.weapons[0]?.id || '');
  const [distanceSlider, setDistanceSlider] = useState<number>(10); // Default distance 10 meters
  const [calledShot, setCalledShot] = useState<boolean>(false); // Target head has -8 penalty but doubles remaining damage!
  
  // Controls
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [activeActionModal, setActiveActionModal] = useState<boolean>(false);
  const [currentMenuTab, setCurrentMenuTab] = useState<'combat' | 'stealth' | 'social'>('combat');
  const [lastActionRollResult, setLastActionRollResult] = useState<string>('');

  // Active turn character
  const activeCharId = turnOrder[turnIndex] || '';
  const activeNpc = enemies.find(e => e.id === activeCharId && !e.isDead);

  // Get active character name
  const getActiveCharacter = (): { name: string; isPlayer: boolean; character?: Character } => {
    if (activeCharId === 'player_apex') return { name: player.name, isPlayer: true, character: player };
    if (activeCharId === 'turret_hacked') return { name: 'Hacked Automated Autoturret [ALLY]', isPlayer: false };
    const found = enemies.find(e => e.id === activeCharId);
    return {
      name: found ? found.name : 'Unknown Hostile',
      isPlayer: false,
      character: found
    };
  };

  const activeCharDetails = getActiveCharacter();

  // Reset target choice as enemies change or die
  useEffect(() => {
    const liveEnemies = enemies.filter(e => !e.isDead);
    if (liveEnemies.length > 0 && (!targetCharId || !liveEnemies.some(e => e.id === targetCharId))) {
      setTargetCharId(liveEnemies[0].id);
    }
  }, [enemies]);

  // Automated Zero-HP target pruning and system cleanup
  useEffect(() => {
    if (!combatActive) return;

    // Check player HP
    if (player.hp <= 0 && player.deployed !== false) {
      const nextPlayer = { ...player, deployed: false, isDead: true };
      const nextTurnOrder = turnOrder.filter(id => id !== player.id);
      const nextTurnIndex = turnIndex >= nextTurnOrder.length ? 0 : turnIndex;
      updateState({
        player: nextPlayer,
        turnOrder: nextTurnOrder,
        turnIndex: nextTurnIndex,
        logs: [
          {
            id: `flatline_player_${Date.now()}`,
            timestamp: getGameTime(),
            type: 'damage',
            message: `[ALERT]: Player ${player.name} Flatlined / Removed from Grid Matrix`
          },
          ...logs
        ]
      });
      audio.playAlert();
    }

    // Check NPC hostile HPs
    const flatHostile = enemies.find(e => e.hp <= 0 && e.deployed !== false);
    if (flatHostile) {
      const nextEnemies = enemies.map(e => e.id === flatHostile.id ? { ...e, deployed: false, isDead: true } : e);
      const nextTurnOrder = turnOrder.filter(id => id !== flatHostile.id);
      const nextTurnIndex = turnIndex >= nextTurnOrder.length ? 0 : turnIndex;
      updateState({
        enemies: nextEnemies,
        turnOrder: nextTurnOrder,
        turnIndex: nextTurnIndex,
        logs: [
          {
            id: `flatline_hostile_${flatHostile.id}_${Date.now()}`,
            timestamp: getGameTime(),
            type: 'damage',
            message: `[ALERT]: Target ${flatHostile.name} Flatlined / Removed from Grid Matrix`
          },
          ...logs
        ]
      });
      audio.playAlert();
    }
  }, [player.hp, enemies, combatActive, turnOrder, turnIndex, logs, updateState]);

  // Synchronize dynamic combat target range calculated from grid map positions
  useEffect(() => {
    const targetEnemy = enemies.find(e => e.id === targetCharId);
    if (targetEnemy) {
      const px = player.x || 1;
      const py = player.y || 1;
      const tx = targetEnemy.x || 1;
      const ty = targetEnemy.y || 1;
      // Chebyshev distance on grid: Math.max(dx, dy) * 2 meters
      const autoDistMeters = Math.max(Math.abs(px - tx), Math.abs(py - ty)) * 2;
      setDistanceSlider(autoDistMeters || 2);
    }
  }, [targetCharId, player.x, player.y, enemies]);

  // Method to remove speech bubble for an NPC once TTS completes or times out
  const clearNpcTaunt = (npcId: string) => {
    updateState({
      enemies: enemies.map(e => e.id === npcId ? { ...e, tauntText: undefined } : e)
    });
  };

  // Roll Initiative and Start Combat
  const handleRollInitiative = () => {
    audio.playAlert();
    audio.setMode('combat');
    
    // Calculate player initiative: REF + 1d10
    const pRoll = rollD10();
    const pInitiative = player.ref + pRoll.total;
    const updatedPlayer = { ...player, initiative: pInitiative, actionSpent: false, moveActionSpent: false };

    // Calculate enemies initiative: REF + 1d10
    const updatedEnemies = enemies.map(enemy => {
      const eRoll = rollD10();
      return {
        ...enemy,
        initiative: enemy.ref + eRoll.total,
        isDead: enemy.hp <= 0,
        actionSpent: false,
        moveActionSpent: false
      };
    });

    // Create sorted turn order (Only including checked deployment agents)
    let queue = [];
    if (updatedPlayer.deployed !== false) {
      queue.push({ id: updatedPlayer.id, initiative: updatedPlayer.initiative });
    }
    updatedEnemies
      .filter(e => !e.isDead && e.deployed !== false)
      .forEach(e => {
        queue.push({ id: e.id, initiative: e.initiative });
      });

    // If netrunning turret is hacked, add it to initiative order with REF 6
    if (turretHacked) {
      const turretRoll = Math.floor(Math.random() * 10) + 1;
      queue.push({ id: 'turret_hacked', initiative: 6 + turretRoll });
    }

    queue.sort((a, b) => b.initiative - a.initiative);

    const orderList = queue.map(item => item.id);

    const newLogs: LogEntry[] = [
      {
        id: `log_init_${Date.now()}`,
        timestamp: getGameTime(),
        type: 'combat',
        message: `💥 COMBAT ALARM INITIATED! Turns registered. Initiative order: ${queue.map(q => {
          const name = q.id === 'player_apex' ? 'Apex' : q.id === 'turret_hacked' ? 'Turret' : enemies.find(e => e.id === q.id)?.name.split(' ')[0];
          return `${name} (${q.initiative})`;
        }).join(' → ')}`
      },
      ...logs
    ];

    updateState({
      player: updatedPlayer,
      enemies: updatedEnemies,
      combatActive: true,
      round: 1,
      turnIndex: 0,
      turnOrder: orderList,
      logs: newLogs
    });

    setLastActionRollResult('Initiative rolled successfully.');
  };

  // Add a log entry
  const addLog = (message: string, type: 'combat' | 'netrun' | 'system' | 'damage' | 'heal' = 'combat') => {
    const newEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: getGameTime(),
      type,
      message
    };
    return newEntry;
  };

  // Switch to next turn
  const handleAdvanceTurn = () => {
    if (!combatActive || turnOrder.length === 0) return;

    audio.playUIBeep();

    let nextIndex = turnIndex + 1;
    let nextRound = round;

    if (nextIndex >= turnOrder.length) {
      nextIndex = 0;
      nextRound += 1;
    }

    // Filter out dead combatants or update the turn queue
    const liveEnemies = enemies.filter(e => !e.isDead);
    let updatedTurnOrder = [...turnOrder];

    // Check if player or enemy list has changed or died and rebuild if necessary
    updatedTurnOrder = updatedTurnOrder.filter(id => {
      if (id === 'player_apex') return !player.isDead;
      if (id === 'turret_hacked') return turretHacked;
      const matchingEnemy = enemies.find(e => e.id === id);
      return matchingEnemy && !matchingEnemy.isDead;
    });

    if (updatedTurnOrder.length === 0) {
      updateState({ combatActive: false });
      audio.setMode('exploration');
      return;
    }

    // Make sure index points to safe range
    if (nextIndex >= updatedTurnOrder.length) {
      nextIndex = 0;
      if (nextIndex === 0 && turnIndex !== 0) {
        nextRound += 1;
      }
    }

    const nextTurnCharId = updatedTurnOrder[nextIndex];
    
    // Reset action spent variables for whoever's turn starts under Cyberpunk Red rules
    let finalPlayer = { ...player };
    let finalEnemies = [...enemies];

    if (nextTurnCharId === 'player_apex') {
      finalPlayer.actionSpent = false;
      finalPlayer.moveActionSpent = false;
    } else {
      finalEnemies = enemies.map(en => {
        if (en.id === nextTurnCharId) {
          return { ...en, actionSpent: false, moveActionSpent: false };
        }
        return en;
      });
    }

    let roundLogs = [...logs];
    if (nextRound !== round && nextIndex === 0) {
      roundLogs = [addLog(`--- ROUND ${nextRound} COMMENCES ---`, 'system'), ...roundLogs];
    }

    updateState({
      player: finalPlayer,
      enemies: finalEnemies,
      round: nextRound,
      turnIndex: nextIndex,
      turnOrder: updatedTurnOrder,
      logs: roundLogs
    });

    setLastActionRollResult('');

    // Trigger NPC Turn Loop if it is an NPC's turn next
    if (nextTurnCharId !== 'player_apex') {
      triggerNpcLoop(nextTurnCharId, nextIndex, nextRound, updatedTurnOrder, roundLogs);
    }
  };

  // Automated NPC AI attack algorithm implementation
  const triggerNpcLoop = (
    npcId: string,
    currentIndex: number,
    currentRound: number,
    currentOrder: string[],
    currentLogs: LogEntry[]
  ) => {
    if (npcId === 'turret_hacked') {
      // HACKED TURRET TURN ACTIONS (ALIED TURRET SHOOT GANGSTERS)
      setTimeout(() => {
        const targetHostile = enemies.find(e => !e.isDead);
        if (!targetHostile) {
          handleAdvanceTurn();
          return;
        }

        audio.playPistol();
        const turretRoll = rollD10();
        const turretDV = 15; // fixed turret mid-range difficulty
        const totalHit = 6 + turretRoll.total; // Skill 6 + D10
        const isHit = totalHit >= turretDV;

        let dmgLogText = '';
        let updatedEnemies = [...enemies];

        if (isHit) {
          const dmg = rollDamage('4d6');
          const hitTorso = Math.random() > 0.15;
          const loc = hitTorso ? 'Torso' : 'Head';
          const targetSp = hitTorso ? targetHostile.spTorso : targetHostile.spHead;

          let damagePassed = dmg.total - targetSp;
          if (damagePassed < 0) damagePassed = 0;

          const nextEnemies = updatedEnemies.map(e => {
            if (e.id === targetHostile.id) {
              const newHp = Math.max(0, e.hp - damagePassed);
              const ablateTorso = hitTorso && damagePassed > 0 ? Math.max(0, e.spTorso - 1) : e.spTorso;
              const ablateHead = !hitTorso && damagePassed > 0 ? Math.max(0, e.spHead - 1) : e.spHead;
              
              const injuries = [...e.criticalInjuries];
              if (dmg.isCriticalInjury && !e.criticalInjuries.includes("Collapsed Lung")) {
                injuries.push("Collapsed Lung");
                damagePassed += 5; // +5 bonus CPR rule
              }

              return {
                ...e,
                hp: newHp,
                spTorso: ablateTorso,
                spHead: ablateHead,
                criticalInjuries: injuries,
                isDead: newHp <= 0,
                tauntText: newHp <= 0 ? "F-Flatlined... aaargh!" : e.tauntText
              };
            }
            return e;
          });

          updatedEnemies = nextEnemies;
          dmgLogText = `🤖 Automated Turret FIRES at ${targetHostile.name}! Roll ${totalHit} vs DV ${turretDV} (HIT!). Deals ${dmg.total} damage to ${loc}. (${damagePassed} passed through. SP is now ${hitTorso ? targetSp - 1 : targetSp - 1})`;
          if (dmg.isCriticalInjury) dmgLogText += ` ⚠️ CRITICAL INJURY: Collapsed Lung inflicted!`;
        } else {
          dmgLogText = `🤖 Automated Turret FIRES at ${targetHostile.name}! Roll ${totalHit} vs DV ${turretDV} (MISS). Bullets trace into the concrete wall.`;
        }

        const nextLogs = [
          { id: `log_turret_${Date.now()}`, timestamp: getGameTime(), type: 'combat' as const, message: dmgLogText },
          ...currentLogs
        ];

        // Check if gang cleared
        const anyGangLive = updatedEnemies.some(e => !e.isDead);
        const combatStatus = anyGangLive;

        updateState({
          enemies: updatedEnemies,
          logs: nextLogs,
          combatActive: combatStatus
        });

        // Automatically call advance turn
        setTimeout(() => {
          let nextIndex = currentIndex + 1;
          let nextRound = currentRound;
          if (nextIndex >= currentOrder.length) {
            nextIndex = 0;
            nextRound += 1;
          }
          const nextId = currentOrder[nextIndex];

          const filteredOrder = currentOrder.filter(id => {
            if (id === 'player_apex') return !player.isDead;
            if (id === 'turret_hacked') return turretHacked;
            const mat = updatedEnemies.find(e => e.id === id);
            return mat && !mat.isDead;
          });

          updateState({
            turnIndex: nextIndex >= filteredOrder.length ? 0 : nextIndex,
            turnOrder: filteredOrder,
            round: nextRound
          });

          if (filteredOrder[nextIndex] && filteredOrder[nextIndex] !== 'player_apex') {
            triggerNpcLoop(filteredOrder[nextIndex], nextIndex, nextRound, filteredOrder, nextLogs);
          }
        }, 1200);

      }, 1000);
      return;
    }

    // GANG NPC LOGIC TRIGGER
    if (manualNpcControl) {
      setIsRolling(false);
      return;
    }

    setIsRolling(true);
    setTimeout(() => {
      const attacker = enemies.find(e => e.id === npcId);
      if (!attacker || attacker.isDead || player.isDead) {
        setIsRolling(false);
        handleAdvanceTurn();
        return;
      }

      // 1. Intelligent Positioning and Coverage on Map Grid
      const ax = attacker.x || 1;
      const ay = attacker.y || 1;
      const px = player.x || 1;
      const py = player.y || 1;
      const gridDist = Math.max(Math.abs(px - ax), Math.abs(py - ay));
      
      let finalX = ax;
      let finalY = ay;
      let attackerCovered = attacker.isCovered;
      let movementLog = "";

      if (attacker.hp < 15 && !attacker.isCovered && Math.random() > 0.3) {
        // High damage fallback
        attackerCovered = true;
        movementLog = `🛡️ NPC DEFENSIVE RE-LOCATE: ${attacker.name} ducks into surrounding industrial structures (+4 Cover DV). `;
      } else if (gridDist > 3) {
        // Path step closer based on MOVE speed
        const dx = px - ax;
        const dy = py - ay;
        const stepX = dx === 0 ? 0 : Math.sign(dx);
        const stepY = dy === 0 ? 0 : Math.sign(dy);

        const speed = attacker.move || 6;
        const moveLimit = Math.min(speed, gridDist - 1); // Move close but don't overlap player coord
        finalX = ax + stepX * moveLimit;
        finalY = ay + stepY * moveLimit;
        
        movementLog = `🏃 NPC SHIFT MOVEMENT: ${attacker.name} charges towards Apex core, shifting coordinates (${ax}, ${ay}) to (${finalX}, ${finalY}) [${moveLimit * 2} m/yds moved]. `;
      }

      // 2. Aim at Player (Check shot with dynamic range distance calculations)
      const aimForHead = player.spTorso >= 11 && Math.random() > 0.4;
      const penalty = aimForHead ? 8 : 0;
      
      const skillLevel = 6; 
      const hitRollObj = rollD10();
      const totalAttack = attacker.ref + skillLevel + hitRollObj.total - penalty - (attacker.facedownPenalty ? 2 : 0);
      
      const weapon = attacker.weapons[0];
      const finalMeters = Math.max(Math.abs(px - finalX), Math.abs(py - finalY)) * 2;
      const targetDV = weapon.type === 'melee' ? (player.dex + 7) : getWeaponDV(weapon.type as any, finalMeters || 2);

      const coverBonus = player.isCovered ? 4 : 0;
      const finalDV = targetDV + coverBonus;

      const hitSuccess = totalAttack >= finalDV;

      let battleLogMsg = `${movementLog}👤 ${attacker.name} uses ${weapon.name}: Rolls ${totalAttack} vs DV ${finalDV} at ${finalMeters}m (Aim: ${aimForHead ? 'Head' : 'Torso'}).`;
      
      // Determine the dynamic slang phrase based on hit, miss, critical
      let speechPhrase = "";
      let isCritical = false;
      let damageRollTotal = 0;

      // 3. Roll damage and evaluate critical injuries so we can align slang dialogue perfectly
      let passDamage = 0;
      let bonusInjuryDamage = 0;
      let nextSpTorso = player.spTorso;
      let nextSpHead = player.spHead;
      const injuries = [...player.criticalInjuries];

      if (hitSuccess) {
        const damageRoll = rollDamage(weapon.damage);
        damageRollTotal = damageRoll.total;
        isCritical = damageRoll.isCriticalInjury;
        const activeSp = aimForHead ? player.spHead : player.spTorso;

        passDamage = damageRollTotal - activeSp;
        if (passDamage < 0) passDamage = 0;

        if (aimForHead && passDamage > 0) {
          passDamage *= 2;
        }

        nextSpTorso = !aimForHead && passDamage > 0 ? Math.max(0, player.spTorso - 1) : player.spTorso;
        nextSpHead = aimForHead && passDamage > 0 ? Math.max(0, player.spHead - 1) : player.spHead;

        if (isCritical) {
          const randomInjury = CRITICAL_INJURIES_POOL[Math.floor(Math.random() * CRITICAL_INJURIES_POOL.length)];
          if (!injuries.includes(randomInjury.name)) {
            injuries.push(randomInjury.name);
            bonusInjuryDamage += 5;
            battleLogMsg += ` ⚠️ CRITICAL INJURY: Inflicted ${randomInjury.name}! (${randomInjury.penalty})`;
          }
          speechPhrase = SLANG_CRITICAL_INFLICTED[Math.floor(Math.random() * SLANG_CRITICAL_INFLICTED.length)];
        } else {
          speechPhrase = SLANG_HIT[Math.floor(Math.random() * SLANG_HIT.length)];
        }
      } else {
        speechPhrase = SLANG_MISS[Math.floor(Math.random() * SLANG_MISS.length)];
      }

      // 4. Trigger Advanced Voice Variety TTS synthesis & dialogue bubble updates
      speakTaunt(speechPhrase, attacker.name, () => {
        clearNpcTaunt(npcId);
      });

      const updatedEnemiesTaunt = enemies.map(e => {
        if (e.id === npcId) {
          return {
            ...e,
            tauntText: speechPhrase,
            x: finalX,
            y: finalY,
            isCovered: attackerCovered,
            actionSpent: true,
            moveActionSpent: true
          };
        }
        return e;
      });

      let updatedPlayer = { ...player };
      if (hitSuccess) {
        if (weapon.type === 'pistol') audio.playPistol();
        else if (weapon.type === 'shotgun' || weapon.type === 'rifle') audio.playShotgun();
        else audio.playMelee();

        const nextHp = Math.max(0, player.hp - (passDamage + bonusInjuryDamage));

        updatedPlayer = {
          ...player,
          hp: nextHp,
          spTorso: nextSpTorso,
          spHead: nextSpHead,
          criticalInjuries: injuries,
          isDead: nextHp <= 0
        };

        battleLogMsg += ` HIT! Deals ${damageRollTotal} damage. SP restricts, ${passDamage + bonusInjuryDamage} HP deducted. SP reduced. [HP: ${nextHp}/${player.maxHp}]`;
      } else {
        battleLogMsg += ` MISS! Shots strike nearby environment debris.`;
      }

      const nextLogs = [
        { id: `log_npc_${Date.now()}`, timestamp: getGameTime(), type: 'combat' as const, message: battleLogMsg },
        ...currentLogs
      ];

      updateState({
        player: updatedPlayer,
        enemies: updatedEnemiesTaunt,
        logs: nextLogs
      });

      setIsRolling(false);

      // Call advance turn with timeout
      setTimeout(() => {
        let nextIndex = currentIndex + 1;
        let nextRound = currentRound;
        if (nextIndex >= currentOrder.length) {
          nextIndex = 0;
          nextRound += 1;
        }

        const filteredOrder = currentOrder.filter(id => {
          if (id === 'player_apex') return !updatedPlayer.isDead;
          if (id === 'turret_hacked') return turretHacked;
          const mat = updatedEnemiesTaunt.find(e => e.id === id);
          return mat && !mat.isDead;
        });

        updateState({
          turnIndex: nextIndex >= filteredOrder.length ? 0 : nextIndex,
          turnOrder: filteredOrder,
          round: nextRound
        });

        // Loop NPC engine recursively if it points to a gangster again
        const nextId = filteredOrder[nextIndex >= filteredOrder.length ? 0 : nextIndex];
        if (nextId && nextId !== 'player_apex') {
          triggerNpcLoop(nextId, nextIndex, nextRound, filteredOrder, nextLogs);
        }
      }, 1400);

    }, 1500);
  };

  // Resolve Player Tactical Actions
  const handlePlayerAction = (actionType: 'shoot' | 'melee' | 'autofire' | 'hide' | 'facedown' | 'grapple' | 'taunt') => {
    if (activeCharId !== 'player_apex' || isRolling) return;

    if (!gmOverrideUnlocked && player.actionSpent) {
      audio.playAlert();
      alert("❌ ACTION REFUSED: Under Cyberpunk Red core rules, you get exactly ONE Combat Action per turn. You have already spent yours! Click \"ADVANCE TURN\" to yield spotlight and recharge your turn economy.");
      return;
    }

    const targetEnemy = enemies.find(e => e.id === targetCharId);
    if (!targetEnemy && actionType !== 'hide') {
      alert("Please select a valid hostile NPC target first!");
      return;
    }

    setIsRolling(true);
    setActiveActionModal(false);

    // Dynamic timer simulation
    setTimeout(() => {
      let battleText = '';
      let updatedEnemies = [...enemies];
      let updatedPlayer = { 
        ...player,
        actionSpent: !gmOverrideUnlocked ? true : player.actionSpent
      };

      const myWeapon = player.weapons.find(w => w.id === selectedWeaponId) || player.weapons[0];
      const rollObj = rollD10();
      
      const skillLevel = 7; // Player standard cyberdeck weapon skill
      const playerFacedownMod = player.facedownPenalty ? 2 : 0;
      const targetCoverDVMod = (targetEnemy?.isCovered && actionType !== 'melee') ? 4 : 0;

      if (actionType === 'shoot') {
        const reflex = player.ref;
        const calledShotPenalty = calledShot ? 8 : 0;
        const totalAttack = reflex + skillLevel + rollObj.total - calledShotPenalty - playerFacedownMod;
        
        // Lookup target DV
        const targetDV = getWeaponDV(myWeapon.type as any, distanceSlider) + targetCoverDVMod;
        const isHit = totalAttack >= targetDV;

        // Verify ammunition usage
        if (myWeapon.ammo <= 0) {
          battleText = `⚠️ FAILED: ${myWeapon.name} is OUT OF AMMO! reload required directory.`;
          setIsRolling(false);
          updateState({ logs: [{ id: `log_fail_${Date.now()}`, timestamp: getGameTime(), type: 'system', message: battleText }, ...logs] });
          return;
        }

        const newAmmo = Math.max(0, myWeapon.ammo - 1);
        updatedPlayer.weapons = player.weapons.map(w => w.id === myWeapon.id ? { ...w, ammo: newAmmo } : w);

        battleText = `🔫 Apex FIRES ${myWeapon.name} at ${targetEnemy?.name}: Roll ${totalAttack} vs DV ${targetDV} (Dist: ${distanceSlider}m, Aim: ${calledShot ? 'Head' : 'Torso'}). `;
        
        audio.playPistol();

        if (isHit) {
          const dmgResult = rollDamage(myWeapon.damage);
          const activeSp = calledShot ? (targetEnemy?.spHead || 0) : (targetEnemy?.spTorso || 0);

          let passDamage = dmgResult.total - activeSp;
          if (passDamage < 0) passDamage = 0;

          // Double remaining damage for head strikes
          if (calledShot && passDamage > 0) {
            passDamage *= 2;
          }

          // Ablate armor by 1 point on success dmg
          const ablateTorso = !calledShot && passDamage > 0 ? Math.max(0, (targetEnemy?.spTorso || 0) - 1) : (targetEnemy?.spTorso || 0);
          const ablateHead = calledShot && passDamage > 0 ? Math.max(0, (targetEnemy?.spHead || 0) - 1) : (targetEnemy?.spHead || 0);

          // Crit injuries
          const injuries = [...(targetEnemy?.criticalInjuries || [])];
          let bonusCritDmg = 0;
          if (dmgResult.isCriticalInjury) {
            const randomInjury = CRITICAL_INJURIES_POOL[Math.floor(Math.random() * CRITICAL_INJURIES_POOL.length)];
            if (!injuries.includes(randomInjury.name)) {
              injuries.push(randomInjury.name);
              bonusCritDmg += 5;
              battleText += ` ⚠️ CRITICAL INJURY: Inflicted ${randomInjury.name}! `;
            }
          }

          const targetHp = targetEnemy ? targetEnemy.hp : 0;
          const nextHp = Math.max(0, targetHp - (passDamage + bonusCritDmg));

          let responsePhrase = "F-Flatlined... argh!";
          if (nextHp > 0) {
            responsePhrase = SLANG_DAMAGE_TAKEN[Math.floor(Math.random() * SLANG_DAMAGE_TAKEN.length)];
          }
          speakTaunt(responsePhrase, targetEnemy?.name, () => {
            clearNpcTaunt(targetCharId);
          });

          updatedEnemies = enemies.map(e => e.id === targetCharId ? {
            ...e,
            hp: nextHp,
            spTorso: ablateTorso,
            spHead: ablateHead,
            criticalInjuries: injuries,
            isDead: nextHp <= 0,
            tauntText: responsePhrase
          } : e);

          battleText += `HIT! Deals ${dmgResult.total} damage. ${passDamage + bonusCritDmg} damage passes through target SP armor. Target HP: ${nextHp}/${targetEnemy?.maxHp}.`;
        } else {
          battleText += `MISS! Kinetic rounds slam harmlessly into industrial scaffolding.`;
        }

      } else if (actionType === 'melee') {
        const dexValue = player.dex;
        const totalAttack = dexValue + skillLevel + rollObj.total - playerFacedownMod;
        const targetDV = (targetEnemy?.dex || 6) + 5; // standard melee clash vs target evade rating
        const isHit = totalAttack >= targetDV;

        battleText = `🗡️ Apex strikes Kendachi sword at ${targetEnemy?.name}: Roll ${totalAttack} vs Evade DV ${targetDV}. `;
        audio.playMelee();

        if (isHit) {
          const dmgResult = rollDamage('3d6'); // Kenachi weapon deals heavy 3d6 armor piercing
          const activeSp = targetEnemy?.spTorso || 0;

          // Armor ignoring: under Black Chrome rules Monoblade bypasses SP under 11
          let effectiveSp = activeSp;
          if (activeSp < 11) {
            effectiveSp = 0;
            battleText += `⚡ [MONOBLADE PIERCING ACTIVATED: Target SP ignored!] `;
          }

          let passDamage = dmgResult.total - effectiveSp;
          if (passDamage < 0) passDamage = 0;

          const targetHp = targetEnemy ? targetEnemy.hp : 0;
          const nextHp = Math.max(0, targetHp - passDamage);
          const ablateTorso = passDamage > 0 ? Math.max(0, activeSp - 1) : activeSp;

          let responsePhrase = "F-Flatlined... argh!";
          if (nextHp > 0) {
            responsePhrase = SLANG_DAMAGE_TAKEN[Math.floor(Math.random() * SLANG_DAMAGE_TAKEN.length)];
          }
          speakTaunt(responsePhrase, targetEnemy?.name, () => {
            clearNpcTaunt(targetCharId);
          });

          updatedEnemies = enemies.map(e => e.id === targetCharId ? {
            ...e,
            hp: nextHp,
            spTorso: ablateTorso,
            isDead: nextHp <= 0,
            tauntText: responsePhrase
          } : e);

          battleText += `SLASHED! Hits torso for ${dmgResult.total} damage. (${passDamage} parsed HP reduction).[SP ablated]`;
        } else {
          battleText += `SLIPPED! Challenger dodges the cyber-blade cleanly.`;
        }

      } else if (actionType === 'autofire') {
        // Autofire multiplies damage multiplier times 3d6!
        const reflex = player.ref;
        const totalAttack = reflex + 6 + rollObj.total - playerFacedownMod; // Skill 6 for autofire
        const targetDV = 17 + targetCoverDVMod; // Fixed high DV cost for spray attacks

        if (myWeapon.ammo < 10) {
          battleText = `⚠️ FAILED: Machine spray requires at least 10 ammo counts! (Current: ${myWeapon.ammo})`;
          setIsRolling(false);
          updateState({ logs: [{ id: `log_fail_${Date.now()}`, timestamp: getGameTime(), type: 'system', message: battleText }, ...logs] });
          return;
        }

        const newAmmo = Math.max(0, myWeapon.ammo - 10);
        updatedPlayer.weapons = player.weapons.map(w => w.id === myWeapon.id ? { ...w, ammo: newAmmo } : w);

        audio.playShotgun();

        if (totalAttack >= targetDV) {
          const beatBy = totalAttack - targetDV;
          // multiplier is min of (how much beat by + 1) vs maxAutofireRating (usually 3)
          const multiplier = Math.min(beatBy + 1, myWeapon.autofireRating || 3);
          const dmg = rollDamage('2d6'); // base damage for smg/rifle autofire
          const multipliedDmg = dmg.total * multiplier;

          const currentSp = targetEnemy?.spTorso || 0;
          let passed = multipliedDmg - currentSp;
          if (passed < 0) passed = 0;

          const targetHp = targetEnemy ? targetEnemy.hp : 0;
          const nextHp = Math.max(0, targetHp - passed);
          const abSp = passed > 0 ? Math.max(0, currentSp - 1) : currentSp;

          let responsePhrase = "F-Flatlined... argh!";
          if (nextHp > 0) {
            responsePhrase = SLANG_DAMAGE_TAKEN[Math.floor(Math.random() * SLANG_DAMAGE_TAKEN.length)];
          }
          speakTaunt(responsePhrase, targetEnemy?.name, () => {
            clearNpcTaunt(targetCharId);
          });

          updatedEnemies = enemies.map(e => e.id === targetCharId ? {
            ...e,
            hp: nextHp,
            spTorso: abSp,
            isDead: nextHp <= 0,
            tauntText: responsePhrase
          } : e);

          battleText = `💥 Apex uses AUTOFIRE spray on ${targetEnemy?.name}! Roll ${totalAttack} vs DV ${targetDV}. EXCELLED by +${beatBy} points (x${multiplier} multiplier). Deals ${multipliedDmg} total blast damage. (${passed} passed armor HP deduct).`;
        } else {
          battleText = `💥 Apex uses AUTOFIRE spray on ${targetEnemy?.name}! Roll ${totalAttack} vs DV ${targetDV}. WIDE spray misses entirely. (Used 10 ammo).`;
        }

      } else if (actionType === 'hide') {
        // Stealth hiding
        const stealthRoll = rollD10().total + player.tech; // Tech/stealth skill
        const highestPerception = 13; // fixed perception difficulty
        const success = stealthRoll >= highestPerception;

        battleText = `👤 Apex attempts to blend into industrial shadow cover: Roll ${stealthRoll} vs Perception DV ${highestPerception}. `;
        if (success) {
          updatedPlayer.stealthState = 'hidden';
          battleText += `SUCCESS! You are now HIDDEN from boosters. Future combat actions grant ambush hit bonus (+4 to attack rolls!).`;
        } else {
          battleText += `SPOTTED! Laser scopes catch your heavy shoulder plates shifting.`;
        }

      } else if (actionType === 'facedown') {
        // Facedown trial
        const rollValue = rollD10().total + player.cool;
        const targetCoolVal = (targetEnemy?.cool || 5) + 6 + Math.floor(Math.random() * 5);
        const success = rollValue >= targetCoolVal;

        battleText = `👁️ Apex glares directly at ${targetEnemy?.name}, initiating a street Facedown: Roll ${rollValue} vs Willpower ${targetCoolVal}. `;
        if (success) {
          updatedEnemies = enemies.map(e => e.id === targetCharId ? { ...e, facedownPenalty: true, tauntText: "Wh-What a brute... standard solo!" } : e);
          battleText += `INTIMIDATED! ${targetEnemy?.name} falters under your cold stare, suffering a permanent -2 penalty to future attack rolls!`;
        } else {
          updatedPlayer.facedownPenalty = true;
          battleText += `FAILED! Boosters mock your reputation. Apex suffers -2 action penalties until target flatlines.`;
        }

      } else if (actionType === 'grapple') {
        // Brawl tussles
        const myBrawl = player.dex + 7;
        const totalAttack = myBrawl + rollD10().total;
        const targetBrawl = (targetEnemy?.dex || 5) + 5 + Math.floor(Math.random() * 8);
        const success = totalAttack >= targetBrawl;

        battleText = `🥋 Apex lunges to Grapple/Choke ${targetEnemy?.name}: Roll ${totalAttack} vs Brawl DV ${targetBrawl}. `;

        if (success) {
          const dmg = 4; // Static choke asphyxiate damage
          const currentHp = targetEnemy?.hp || 0;
          const nextHp = Math.max(0, currentHp - dmg);
          
          updatedEnemies = enemies.map(e => e.id === targetCharId ? {
            ...e,
            hp: nextHp,
            tauntText: "Gah! Let go of me!",
            isDead: nextHp <= 0
          } : e);

          battleText += `SECURED! Target is locked in a chokehold. Deals ${dmg} armor-ignoring damage this turn. Hostile unable to move.`;
        } else {
          battleText += `EVADED! Booster slips out of your lock and laughs.`;
        }

      } else if (actionType === 'taunt') {
        battleText = `💬 Apex taunts: "You Maelstrom junkies are third-tier scrap metal. My cyberdeck is older than your motherboard!". ${targetEnemy?.name} aims with heightened aggression.`;
      }

      const nextLogs = [
        { id: `log_player_${Date.now()}`, timestamp: getGameTime(), type: 'combat' as const, message: battleText },
        ...logs
      ];

      // Reset ambush tag after resolve hit
      if (updatedPlayer.stealthState === 'hidden' && (actionType === 'shoot' || actionType === 'melee' || actionType === 'autofire')) {
        updatedPlayer.stealthState = 'none';
      }

      setLastActionRollResult(battleText);

      // Verify if some targets flatlined
      const anyLiveEnemies = updatedEnemies.some(e => !e.isDead);

      updateState({
        player: updatedPlayer,
        enemies: updatedEnemies,
        logs: nextLogs,
        combatActive: anyLiveEnemies // remains active if hostiles still live
      });

      setIsRolling(false);

      // If combat is cleared, toggle back music mode
      if (!anyLiveEnemies) {
        audio.setMode('exploration');
      }

    }, 1100);
  };

  // Resolve GM Manual Tactical Actions for Active NPC Hostile
  const handleNpcAction = (actionType: 'shoot' | 'taunt' | 'reload') => {
    const activeNpc = enemies.find(e => e.id === activeCharId);
    if (!activeNpc || activeNpc.isDead || isRolling) return;

    if (!gmOverrideUnlocked && activeNpc.actionSpent && actionType !== 'reload') {
      audio.playAlert();
      alert("❌ ACTION REFUSED: This hostile booster has already spent their Combat Action this turn!");
      return;
    }

    setIsRolling(true);

    setTimeout(() => {
      let logMsg = "";
      let updatedPlayer = { ...player };
      let updatedEnemies = [...enemies];

      const npcWeapon = activeNpc.weapons[0] || { id: 'generic_arms', name: 'Standard booster rifle', type: 'rifle', damage: '5d6', ammo: 30, maxAmmo: 30 };

      if (actionType === 'shoot') {
        const px = player.x || 1;
        const py = player.y || 1;
        const ax = activeNpc.x || 1;
        const ay = activeNpc.y || 1;

        // Chebyshev distance on grid: Chebyshev steps * 2 meters
        const meters = Math.max(Math.abs(px - ax), Math.abs(py - ay)) * 2;
        const targetDV = npcWeapon.type === 'melee' ? (player.dex + 7) : getWeaponDV(npcWeapon.type as any, meters || 2);

        const coverBonus = player.isCovered ? 4 : 0;
        const finalDV = targetDV + coverBonus;

        const rollObj = rollD10();
        const skillLevel = 6; // Standard NPC skill level
        const facePenalty = activeNpc.facedownPenalty ? 2 : 0;
        const totalAttack = activeNpc.ref + skillLevel + rollObj.total - facePenalty;

        const hitSuccess = totalAttack >= finalDV;

        logMsg = `🎯 [GM CONTROL] ${activeNpc.name} attacks Apex using ${npcWeapon.name}: Roll ${totalAttack} vs DV ${finalDV} (${meters}m calculated dynamic range). `;

        let phrase = "";
        let isCrit = false;

        if (hitSuccess) {
          if (npcWeapon.type === 'pistol') audio.playPistol();
          else if (npcWeapon.type === 'shotgun' || npcWeapon.type === 'rifle') audio.playShotgun();
          else audio.playMelee();

          const dmgRoll = rollDamage(npcWeapon.damage);
          isCrit = dmgRoll.isCriticalInjury;
          const activeSp = player.spTorso;

          let passDamage = dmgRoll.total - activeSp;
          if (passDamage < 0) passDamage = 0;

          const nextSpTorso = passDamage > 0 ? Math.max(0, player.spTorso - 1) : player.spTorso;
          const injuries = [...player.criticalInjuries];
          let bonusDamage = 0;

          if (isCrit) {
            const randomInjury = CRITICAL_INJURIES_POOL[Math.floor(Math.random() * CRITICAL_INJURIES_POOL.length)];
            if (!injuries.includes(randomInjury.name)) {
              injuries.push(randomInjury.name);
              bonusDamage += 5;
              logMsg += ` ⚠️ CRITICAL INJURY: Inflicted ${randomInjury.name}! `;
            }
            phrase = SLANG_CRITICAL_INFLICTED[Math.floor(Math.random() * SLANG_CRITICAL_INFLICTED.length)];
          } else {
            phrase = SLANG_HIT[Math.floor(Math.random() * SLANG_HIT.length)];
          }

          const nextHp = Math.max(0, player.hp - (passDamage + bonusDamage));
          updatedPlayer = {
            ...player,
            hp: nextHp,
            spTorso: nextSpTorso,
            criticalInjuries: injuries,
            isDead: nextHp <= 0
          };

          logMsg += `HIT! Deals ${dmgRoll.total} damage (${passDamage + bonusDamage} net HP reduction).`;
        } else {
          phrase = SLANG_MISS[Math.floor(Math.random() * SLANG_MISS.length)];
          logMsg += `MISS! Shots slam harmlessly into surrounding columns.`;
        }

        speakTaunt(phrase, activeNpc.name, () => {
          clearNpcTaunt(activeNpc.id);
        });

        // Subtract ammo if firearm & update the tauntText
        if (npcWeapon.ammo && npcWeapon.maxAmmo > 1) {
          const newAmmo = Math.max(0, npcWeapon.ammo - 1);
          updatedEnemies = enemies.map(e => e.id === activeNpc.id ? {
            ...e,
            actionSpent: true,
            tauntText: phrase,
            weapons: e.weapons.map(w => w.id === npcWeapon.id ? { ...w, ammo: newAmmo } : w)
          } : e);
        } else {
          updatedEnemies = enemies.map(e => e.id === activeNpc.id ? { ...e, actionSpent: true, tauntText: phrase } : e);
        }

      } else if (actionType === 'taunt') {
        const randomTaunt = STREET_SLANG_TAUNTS[Math.floor(Math.random() * STREET_SLANG_TAUNTS.length)];
        speakTaunt(randomTaunt, activeNpc.name, () => {
          clearNpcTaunt(activeNpc.id);
        });
        updatedEnemies = enemies.map(e => e.id === activeNpc.id ? { ...e, tauntText: randomTaunt } : e);
        logMsg = `💬 [GM MANUAL CONTROL] ${activeNpc.name} sneers: "${randomTaunt}"`;
        audio.playUIBeep();

      } else if (actionType === 'reload') {
        updatedEnemies = enemies.map(e => {
          if (e.id === activeNpc.id) {
            return {
              ...e,
              actionSpent: true,
              weapons: e.weapons.map(w => ({ ...w, ammo: w.maxAmmo }))
            };
          }
          return e;
        });
        logMsg = `🔄 [GM CONTROL] ${activeNpc.name} reloads their firearms back to full clips.`;
        audio.playUIBeep();
      }

      setLastActionRollResult(logMsg);
      updateState({
        player: updatedPlayer,
        enemies: updatedEnemies,
        logs: [{ id: `gm_npc_act_${Date.now()}`, timestamp: getGameTime(), type: 'combat', message: logMsg }, ...logs]
      });

      setIsRolling(false);
    }, 1100);
  };

  // Quick reload weapon ammo under Cyberpunk Red rules (Reload is a full Combat Action)
  const handleReload = () => {
    if (activeCharId !== 'player_apex' || isRolling) return;
    
    if (!gmOverrideUnlocked && player.actionSpent) {
      audio.playAlert();
      alert("❌ ACTION REFUSED: Under Cyberpunk Red core rules, Reload is a full Combat Action. You have already spent yours this turn! Click \"ADVANCE TURN\" to yield spotlight and recharge your turn economy.");
      return;
    }
    
    const myWeapon = player.weapons.find(w => w.id === selectedWeaponId);
    if (!myWeapon) return;

    if (myWeapon.ammo === myWeapon.maxAmmo) {
      alert("Weapon is already fully loaded!");
      return;
    }

    audio.playUIBeep();
    
    const updatedWeapons = player.weapons.map(w => {
      if (w.id === selectedWeaponId) {
        return { ...w, ammo: w.maxAmmo };
      }
      return w;
    });

    const reloadMsg = `🔄 Apex reloads ${myWeapon.name} clip. Ammo counters restored to max capacities (${myWeapon.maxAmmo}/${myWeapon.maxAmmo}).`;
    
    updateState({
      player: { 
        ...player, 
        weapons: updatedWeapons,
        actionSpent: !gmOverrideUnlocked ? true : player.actionSpent
      },
      logs: [{ id: `log_reload_${Date.now()}`, timestamp: getGameTime(), type: 'system', message: reloadMsg }, ...logs]
    });

    setLastActionRollResult(reloadMsg);
  };

  const handleToggleCover = () => {
    if (activeCharId !== 'player_apex' || isRolling) return;

    audio.playUIBeep();
    const nextCoverState = !player.isCovered;
    const coverMsg = nextCoverState
      ? '📦 Apex ducks behind tactical server columns, gaining +4 Defense DV against incoming sniper bullet lines.'
      : 'Apex steps out of cover columns to scan the room.';

    updateState({
      player: { ...player, isCovered: nextCoverState },
      logs: [{ id: `log_cover_${Date.now()}`, timestamp: getGameTime(), type: 'system', message: coverMsg }, ...logs]
    });

    setLastActionRollResult(coverMsg);
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Alert Banner */}
      {!combatActive ? (
        <div className="bg-[#121124] border-2 border-yellow-500/30 p-5 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_15px_rgba(252,238,10,0.05)]">
          <div className="flex items-center gap-3.5">
            <div className="p-2 bg-yellow-500/10 rounded-full border border-yellow-500/30">
              <AlertTriangle className="text-yellow-400 w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-yellow-400 uppercase tracking-widest">
                BOOSTER CODES DETECTED
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                3 Cyber-scav hostile units identified in adjacent servers. Initiate initiative scans immediately.
              </p>
            </div>
          </div>
          <button
            onClick={handleRollInitiative}
            className="w-full md:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-mono font-black uppercase text-xs tracking-wider rounded border border-red-500 hover:scale-103 transition-transform cursor-pointer shadow-[0_0_12px_rgba(255,0,60,0.3)]"
          >
            ⚔️ ROLL FOR INITIATIVE
          </button>
        </div>
      ) : (
        <div className="bg-[#11050a] border-2 border-red-600 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_20px_rgba(255,0,60,0.25)] relative overflow-hidden">
          {/* animated scan bars */}
          <div className="absolute inset-y-0 left-0 w-1.5 bg-red-600 animate-pulse"></div>
          
          <div className="flex items-center gap-2.5 pl-2">
            <span className="w-3 h-3 bg-red-600 rounded-full animate-ping" />
            <span className="font-mono font-black text-sm text-red-500 uppercase tracking-widest">
              STATUS: RED_ALERT_ACTIVE // ROUND {round}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="text-xs font-mono text-gray-400">
              Active: <span className="text-red-400 font-black uppercase">{activeCharDetails.name}</span>
            </div>
            {activeCharDetails.isPlayer ? (
              <button
                onClick={() => setActiveActionModal(true)}
                disabled={isRolling}
                className="px-4 py-2 bg-[#ff00ff] hover:bg-pink-700 text-white font-mono font-bold rounded uppercase text-xs cursor-pointer shadow-[0_0_10px_rgba(255,0,255,0.4)] animate-bounce"
              >
                🎮 TAKE ACTION
              </button>
            ) : (
              <div className="px-3 py-1 bg-red-600/10 border border-red-600/30 text-red-500 rounded font-mono text-[10px] uppercase animate-pulse">
                NPC_AI PLANNING TARGETS...
              </div>
            )}
            <button
              onClick={handleAdvanceTurn}
              disabled={isRolling}
              className="px-3 py-1.5 bg-[#00ffff]/20 hover:bg-[#00ffff]/40 border border-[#00ffff] text-[#00ffff] font-mono rounded text-xs flex items-center gap-1 cursor-pointer transition-all uppercase"
            >
              Skip Turn <ArrowRightCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Tactical Combat Map Grid */}
      <TacticalCombatMap
        player={player}
        enemies={enemies}
        combatActive={combatActive}
        turnIndex={turnIndex}
        turnOrder={turnOrder}
        logs={logs}
        gmOverrideActive={userRole === 'gm' && gmOverrideUnlocked}
        updateState={updateState}
        gridWidth={currentGig?.battleArenaLayout?.width || 10}
        gridHeight={currentGig?.battleArenaLayout?.height || 10}
        onUpdateTargetDistance={(distance, targetId) => {
          setDistanceSlider(distance);
          if (targetId) {
            setTargetCharId(targetId);
          }
        }}
      />

      {/* Primary Battle Space layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Initiative Queue Pane */}
        <div className="lg:col-span-1 bg-[#0b0b14]/90 border border-gray-800 rounded-lg p-4 space-y-4 shadow-[0_10px_20px_rgba(0,0,0,0.4)] relative">
          <div className="border-b border-gray-800 pb-2.5 flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              📋 INITIATIVE_QUEUE:{combatActive ? ` [${turnOrder.length}]` : ''}
            </h4>
            <span className="text-[10px] font-mono text-gray-600">REF + 1D10</span>
          </div>

          {combatActive ? (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {turnOrder.map((id, idx) => {
                const isActive = idx === turnIndex;
                const isPlayerChar = id === 'player_apex';
                const isTurretAlly = id === 'turret_hacked';
                
                let name = 'Automated Autoturret';
                let hp = 100;
                let maxHp = 100;
                let isDead = false;
                let isCharCovered = false;
                let spT = 0;
                let spH = 0;
                let currentWeaponText = 'Autofire turr';
                let injuries: string[] = [];
                let isActionSpent = false;
                let isMoveSpent = false;

                if (isPlayerChar) {
                  name = player.name;
                  hp = player.hp;
                  maxHp = player.maxHp;
                  isDead = player.isDead;
                  isCharCovered = player.isCovered;
                  spT = player.spTorso;
                  spH = player.spHead;
                  const activeWpn = player.weapons.find(w => w.id === selectedWeaponId) || player.weapons[0];
                  currentWeaponText = `${activeWpn?.name} (${activeWpn?.ammo} ammo)`;
                  injuries = player.criticalInjuries;
                  isActionSpent = !!player.actionSpent;
                  isMoveSpent = !!player.moveActionSpent;
                } else if (!isTurretAlly) {
                  const targetEn = enemies.find(e => e.id === id);
                  if (targetEn) {
                    name = targetEn.name;
                    hp = targetEn.hp;
                    maxHp = targetEn.maxHp;
                    isDead = targetEn.isDead;
                    isCharCovered = targetEn.isCovered;
                    spT = targetEn.spTorso;
                    spH = targetEn.spHead;
                    const wpn = targetEn.weapons[0];
                    currentWeaponText = wpn ? wpn.name : 'Unarmed';
                    injuries = targetEn.criticalInjuries;
                    isActionSpent = !!targetEn.actionSpent;
                    isMoveSpent = !!targetEn.moveActionSpent;
                  }
                } else {
                  hp = 30;
                  maxHp = 30;
                  currentWeaponText = 'Heavy machinegun counts';
                }

                // Skip dead characters
                if (isDead) return null;

                return (
                  <div
                    key={id}
                    className={`rounded border p-3 font-mono transition-all relative overflow-hidden ${
                      isActive
                        ? 'border-[#ff00ff] bg-[#ff00ff]/5 shadow-[0_0_12px_rgba(255,0,255,0.15)] scale-102'
                        : 'border-white/10 bg-[#090812] hover:bg-[#12111d]'
                    }`}
                  >
                    {/* speech bubbles for NPC slang taunts! */}
                    {!isPlayerChar && !isTurretAlly && !isDead && enemies.find(e => e.id === id)?.tauntText && (
                      <div className="absolute top-1 right-2 bg-[#fcee0a]/10 border border-[#fcee0a]/30 rounded px-1.5 py-0.5 text-[#fcee0a] text-[8px] animate-pulse flex items-center gap-1">
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>"{enemies.find(e => e.id === id)?.tauntText}"</span>
                      </div>
                    )}

                    {/* highlight vertical line */}
                    {isActive && <div className="absolute left-0 inset-y-0 w-1 bg-[#ff00ff]"></div>}

                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold ${isPlayerChar ? 'text-cyan-400' : isTurretAlly ? 'text-emerald-400' : 'text-red-505'}`}>
                          {name} {isPlayerChar && ' (YOU)'} {isTurretAlly && ' [HACKED_ALLY]'}
                        </span>
                        <span className="text-[10px] text-gray-500">Gear: {currentWeaponText}</span>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-gray-500">Turn:</span> <span className="font-bold text-[#ff00ff]">#{idx + 1}</span>
                      </div>
                    </div>

                    {/* HP and Armor Metrics bar */}
                    <div className="space-y-1.5 text-[10px]">
                      {/* Hp meter */}
                      <div>
                        <div className="flex justify-between text-[8px] text-gray-400 mb-0.5">
                          <span>SYNAPSE / HP STATE</span>
                          <span>{hp} / {maxHp} HP</span>
                        </div>
                        <div className="w-full bg-black rounded h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              hp < maxHp * 0.35 ? 'bg-red-600' : isPlayerChar ? 'bg-cyan-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${(hp / maxHp) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Armor indicators */}
                      {!isTurretAlly && (
                        <div className="flex justify-between items-center bg-black/40 p-1.5 rounded border border-white/5 text-[9px] text-gray-400">
                          <div className="flex items-center gap-2">
                            <Shield className="w-3 h-3 text-[#fcee0a] inline" />
                            <span>SP Arm Torso:</span> <span className="text-white font-bold">{spT}</span>
                            <span>Head:</span> <span className="text-white font-bold">{spH}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isCharCovered ? (
                              <span className="text-emerald-400 font-bold bg-emerald-400/10 px-1 rounded uppercase text-[8px]">Behind Cover</span>
                            ) : (
                              <span className="text-gray-500 uppercase text-[8px]">In Open</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action spent indicators under Cyberpunk Red rules */}
                      {!isTurretAlly && (
                        <div className="flex justify-between items-center bg-black/40 p-1.5 rounded border border-white/5 text-[9px] text-gray-400 font-mono">
                          <div className="flex items-center gap-1">
                            <span className="uppercase text-[8px] text-gray-500">Economy:</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={isActionSpent
                              ? "text-red-400 bg-red-950/30 px-1 rounded border border-red-900/30 font-bold uppercase text-[8px]"
                              : "text-emerald-400 bg-emerald-950/30 px-1 rounded border border-emerald-900/30 font-bold uppercase text-[8px]"
                            }>
                              Combat: {isActionSpent ? "Spent" : "Avail"}
                            </span>
                            <span className={isMoveSpent
                              ? "text-red-400 bg-red-950/30 px-1 rounded border border-red-900/30 font-bold uppercase text-[8px]"
                              : "text-emerald-400 bg-emerald-950/30 px-1 rounded border border-emerald-900/30 font-bold uppercase text-[8px]"
                            }>
                              Move: {isMoveSpent ? "Spent" : "Avail"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Critical Injury badging */}
                      {injuries.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {injuries.map((injury, injI) => (
                            <span
                              key={injI}
                              className="px-1.5 py-0.5 bg-red-950 border border-red-600 text-[#ff003c] rounded text-[8px] uppercase tracking-wider font-extrabold animate-pulse"
                            >
                              ⚠️ INJURY: {injury}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex flex-col justify-center items-center text-center text-xs font-mono text-gray-500 border border-dashed border-gray-800 rounded">
              <Compass className="w-8 h-8 text-gray-700 animate-spin mb-2" />
              <span>Initiative scanners offline.</span>
              <span>Engage hostiles to generate dynamic threat line.</span>
            </div>
          )}
        </div>

        {/* Tactical Control board */}
        <div className="lg:col-span-2 bg-[#0b0b14]/90 border border-gray-800 rounded-lg p-5 flex flex-col justify-between shadow-[0_10px_20px_rgba(0,0,0,0.4)] min-h-[460px]">
          {activeNpc && manualNpcControl ? (
            /* GM BOOSTER CONTROLS PANEL */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-red-500/30 pb-3">
                <h4 className="text-sm font-mono font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="text-red-500 animate-pulse w-4.5 h-4.5" /> GM MANUAL BOOSTER OVERRIDE
                </h4>
                <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-mono font-bold">CONTROL OVERRIDE: {activeNpc.name}</span>
              </div>

              <div className="bg-[#1a080c] border border-red-500/20 rounded p-3 space-y-3 font-mono text-[11px]">
                <div className="flex justify-between items-center bg-black/40 p-2 rounded">
                  <span className="text-gray-400 font-bold">ACTIVE HOSTILE:</span>
                  <span className="text-white font-extrabold text-glow-magenta">{activeNpc.name}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-[10px] text-gray-400">
                  <div className="bg-black/20 p-2 rounded border border-white/5">
                    <span className="block text-[8px] text-gray-500 uppercase">Booster Health Status</span>
                    <span className="text-red-400 font-black text-xs">{activeNpc.hp} / {activeNpc.maxHp} HP</span>
                  </div>
                  <div className="bg-black/20 p-2 rounded border border-white/5">
                    <span className="block text-[8px] text-gray-500 uppercase">Equipped Firearm</span>
                    <span className="text-yellow-400 font-black text-xs">
                      {activeNpc.weapons[0]?.name || 'Improvised Combat Arms'}
                    </span>
                  </div>
                </div>

                <div className="bg-black/40 p-3 rounded space-y-2 border border-white/5">
                  <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider">Dynamic Distance Calculations (Link Active)</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Range to Apex (Player):</span>
                    <span className="text-cyan-400 font-black text-sm">
                      {Math.max(Math.abs((player.x || 1) - (activeNpc.x || 1)), Math.abs((player.y || 1) - (activeNpc.y || 1))) * 2} Meters
                    </span>
                  </div>
                  <div className="text-[9px] text-gray-500 leading-normal">
                    Combat distance is automatically linked: DV helper points to weapon table columns based on grid positions.
                  </div>
                </div>
              </div>

              {/* Manual actions dispatch list */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[9px] font-mono text-red-400 uppercase tracking-widest font-black mb-1">
                  EXECUTE MANUAL RESOLUTION ACTIONS:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleNpcAction('shoot')}
                    disabled={isRolling}
                    className="py-2.5 px-3 bg-red-950/40 border border-red-500 hover:bg-red-900/40 hover:text-white text-red-400 rounded text-xs font-mono transition-all font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                  >
                    <Crosshair className="w-3.5 h-3.5" /> 🎯 SHOOT AT APEX
                  </button>
                  
                  <button
                    onClick={() => handleNpcAction('taunt')}
                    disabled={isRolling}
                    className="py-2.5 px-3 bg-black/40 border border-[#fcee0a]/50 hover:bg-[#fcee0a]/15 text-[#fcee0a] hover:text-white rounded text-xs font-mono transition-all font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> 💬 STREET TAUNT (TTS)
                  </button>

                  <button
                    onClick={() => handleNpcAction('reload')}
                    disabled={isRolling}
                    className="py-2.5 px-3 bg-[#0c0a15] border border-gray-700 hover:border-white text-gray-300 hover:text-white rounded text-xs font-mono transition-all font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> 🔄 RELOAD MAGAZINES
                  </button>

                  <button
                    onClick={() => {
                      audio.playUIBeep();
                      handleAdvanceTurn();
                    }}
                    disabled={isRolling}
                    className="py-2.5 px-3 bg-[#11241a] border border-emerald-500 hover:bg-emerald-950/70 text-emerald-400 rounded text-xs font-mono transition-all font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                  >
                    <ArrowRightCircle className="w-3.5 h-3.5" /> 🛑 CONCLUDE HOSTILE TURN
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Player Action Panel */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h4 className="text-sm font-mono font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <Crosshair className="text-[#fcee0a] w-4.5 h-4.5" /> Cyberdeck Fire-Control Console
                </h4>
                <span className="text-xs text-cyan-400 font-mono">ROLE: CORE_SOLO</span>
              </div>

              {/* Quick action buttons for reloading / taking cover */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  onClick={handleToggleCover}
                  disabled={activeCharId !== 'player_apex' || isRolling}
                  className={`py-2 px-3 border rounded text-xs font-mono transition-all font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 ${
                    player.isCovered
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.2)]'
                      : 'bg-black/40 border-gray-700 hover:border-gray-500 text-gray-300 hover:bg-black/60'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" /> {player.isCovered ? 'LEAVE COVER' : 'TAKE COVER'}
                </button>

                <button
                  onClick={handleReload}
                  disabled={activeCharId !== 'player_apex' || isRolling}
                  className="py-2 px-3 bg-black/40 border border-gray-700 hover:border-[#ff00ff] text-gray-300 hover:text-white rounded text-xs font-mono transition-all font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> RELOAD CLIP
                </button>

                <div className="col-span-2 sm:col-span-1 border border-cyan-500/10 p-1.5 bg-[#090812]/100 rounded text-[10px] font-mono flex flex-col justify-center">
                  <span className="text-gray-500 uppercase text-[8px]">Tactical Target DV helper</span>
                  <span className="text-cyan-400 font-bold">
                    Pistols: {getWeaponDV('pistol', distanceSlider)} | Shotgun: {getWeaponDV('shotgun', distanceSlider)} DVs
                  </span>
                </div>
              </div>

              {/* Target Selectors Panel */}
              <div className="bg-[#0f0e1e] border border-white/5 rounded p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hostile targets select */}
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                    Select Weapon Target
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {enemies.filter(e => !e.isDead).map(enemy => (
                      <button
                        key={enemy.id}
                        onClick={() => setTargetCharId(enemy.id)}
                        className={`p-2 rounded border text-left font-mono text-xs transition-all relative overflow-hidden flex justify-between items-center cursor-pointer ${
                          targetCharId === enemy.id
                            ? 'border-yellow-500 bg-yellow-500/5 text-yellow-400 font-bold'
                            : 'border-white/5 bg-[#07060c] hover:bg-black/20 text-gray-300'
                        }`}
                      >
                        <span>🎯 {enemy.name}</span>
                        <span className="text-[10px] text-rose-500 bg-rose-500/10 px-1 py-0.5 rounded">HP: {enemy.hp}</span>
                      </button>
                    ))}
                    {enemies.filter(e => !e.isDead).length === 0 && (
                      <div className="text-center font-mono text-xs text-gray-500 py-3">
                        [ NO ACTIVE HOSTILES LIVE ]
                      </div>
                    )}
                  </div>
                </div>

                {/* Range Distance details slider */}
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1.5">
                      <span>Range Target Distance</span>
                      <span className="text-yellow-400 font-black">{distanceSlider} Meters</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="45"
                      step="1"
                      value={distanceSlider}
                      onChange={(e) => setDistanceSlider(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-400 mb-2"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-gray-500">
                      <span>Close-up (3m)</span>
                      <span>Midway (20m)</span>
                      <span>Sniper limit (45m)</span>
                    </div>
                  </div>

                  {/* Called Shots checkbox toggle */}
                  <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-400">Aim for Head (Called Shot)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={calledShot}
                        onChange={(e) => setCalledShot(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                  {calledShot && (
                    <p className="text-[8px] font-mono text-pink-500 leading-normal">
                      ⚠️ HEADSHOT METRICS: -8 to To-Hit roll. If hits, ignores helmet or doubles surviving hit point damage!
                    </p>
                  )}
                </div>
              </div>

              {/* Weapon load-ups lists */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">
                  Deploy Loaded Firearm / Cybertech
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {player.weapons.map(wpn => (
                    <button
                      key={wpn.id}
                      onClick={() => setSelectedWeaponId(wpn.id)}
                      className={`p-2.5 rounded border text-left font-mono text-xs transition-all flex justify-between items-center cursor-pointer ${
                        selectedWeaponId === wpn.id
                          ? 'border-cyan-400 bg-cyan-400/5 text-cyan-400 font-bold'
                          : 'border-white/5 bg-[#07060c] hover:bg-black/20 text-gray-300'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{wpn.name}</span>
                        <span className="text-[10px] text-gray-500">Rating: Dmg: {wpn.damage}</span>
                      </div>
                      <span className="text-xs bg-black/40 px-1.5 py-0.5 rounded">
                        Ammo {wpn.ammo}/{wpn.maxAmmo}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Resolve display log */}
          <div className="mt-5 p-3 rounded-lg border border-[#fcee0a]/20 bg-[#fcee0a]/5 min-h-[50px] flex items-center justify-between text-xs font-mono font-bold">
            <div>
              <span className="text-gray-500 font-bold mr-1.5 uppercase tracking-wider text-[9px] block">Console feedback logs:</span>
              <span className="text-gray-200 mt-0.5 block italic selection:bg-pink-500">
                {lastActionRollResult || (activeNpc && manualNpcControl ? `Booster controller override ready. Choose direct action for ${activeNpc.name}...` : 'Awaiting actions from solo shooter...')}
              </span>
            </div>
            {isRolling && <div className="text-[#fcee0a] animate-ping font-extrabold uppercase text-[10px]">Rolling dice...</div>}
          </div>
        </div>
      </div>

      {/* Game Master Administrative Bypass Console */}
      {userRole === 'gm' && (
        <GmAdministrativePanel
          player={player}
          enemies={enemies}
          combatActive={combatActive}
          turnOrder={turnOrder}
          turnIndex={turnIndex}
          logs={logs}
          onUpdateFullState={updateState}
          overrideUnlocked={gmOverrideUnlocked}
          onOverrideCodeUnlocked={setGmOverrideUnlocked}
          manualNpcControl={manualNpcControl}
        />
      )}

      {/* --- MODAL DIALOG: ACTIONS CHOOSED PANEL --- */}
      {activeActionModal && (
        <div className="fixed inset-0 bg-[#06060c]/85 flex items-center justify-center p-4 z-40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0d0c15] border-2 border-[#ff00ff] rounded-lg p-5 shadow-[0_0_20px_rgba(255,0,255,0.25)] relative overflow-hidden">
            {/* animated header stripes */}
            <div className="absolute top-0 inset-x-0 h-1 bg-[repeating-linear-gradient(90deg,#ff00ff,#ff00ff_15px,#000_15px,#000_30px)]"></div>
            
            <div className="flex justify-between items-center border-b border-[#ff00ff]/20 pb-3 mb-4">
              <h3 className="text-md font-mono font-bold text-[#ff00ff] uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-[#ff00ff]" /> CHOOSE YOUR ACTION
              </h3>
              <button
                onClick={() => setActiveActionModal(false)}
                className="text-gray-400 hover:text-white font-mono text-xs hover:bg-white/5 px-2 py-0.5 rounded border border-transparent hover:border-white/10"
              >
                [ RETURN ]
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-xs font-mono">
              <button
                onClick={() => setCurrentMenuTab('combat')}
                className={`py-1.5 rounded transition font-bold cursor-pointer ${
                  currentMenuTab === 'combat'
                    ? 'bg-[#ff00ff]/20 border-b-2 border-[#ff00ff] text-white'
                    : 'bg-black/40 text-gray-400 hover:text-gray-200'
                }`}
              >
                ⚔️ COMBAT
              </button>
              <button
                onClick={() => setCurrentMenuTab('stealth')}
                className={`py-1.5 rounded transition font-bold cursor-pointer ${
                  currentMenuTab === 'stealth'
                    ? 'bg-cyan-500/20 border-b-2 border-cyan-400 text-white'
                    : 'bg-black/40 text-gray-400 hover:text-gray-200'
                }`}
              >
                👤 STEALTH
              </button>
              <button
                onClick={() => setCurrentMenuTab('social')}
                className={`py-1.5 rounded transition font-bold cursor-pointer ${
                  currentMenuTab === 'social'
                    ? 'bg-yellow-500/20 border-b-2 border-yellow-400 text-white'
                    : 'bg-black/40 text-gray-400 hover:text-gray-200'
                }`}
              >
                🗣️ MANEUVERS
              </button>
            </div>

            {/* Tab content loops */}
            <div className="min-h-[160px] flex flex-col justify-between">
              {currentMenuTab === 'combat' && (
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handlePlayerAction('shoot')}
                    className="w-full p-2.5 bg-black/50 hover:bg-red-950 hover:text-red-300 border border-red-500/30 rounded text-left font-mono text-xs flex justify-between items-center transition-all cursor-pointer group"
                  >
                    <div>
                      <span className="font-bold block text-white group-hover:text-red-400">🔫 STANDARD SHOOT ATTACK</span>
                      <span className="text-gray-400 text-[10px]">Fires selected weapon at current range. Uses 1 clip ammo count.</span>
                    </div>
                    <span className="text-[10px] text-gray-500">REF + Weapon Skill (7) + 1D10</span>
                  </button>

                  <button
                    onClick={() => handlePlayerAction('melee')}
                    className="w-full p-2.5 bg-black/50 hover:bg-pink-950 hover:text-pink-300 border border-pink-500/30 rounded text-left font-mono text-xs flex justify-between items-center transition-all cursor-pointer group"
                  >
                    <div>
                      <span className="font-bold block text-white group-hover:text-pink-400">🗡️ KENDARIC MELEE STRIKE</span>
                      <span className="text-gray-400 text-[10px]">Close-up ignore-armor pierce combat using Monoblade.</span>
                    </div>
                    <span className="text-[10px] text-gray-500">DEX + Melee Skill (7) + 1D10</span>
                  </button>

                  <button
                    onClick={() => handlePlayerAction('autofire')}
                    className="w-full p-2.5 bg-black/50 hover:bg-[#ff00ff]/10 hover:text-yellow-300 border border-[#ff00ff]/30 rounded text-left font-mono text-xs flex justify-between items-center transition-all cursor-pointer group"
                  >
                    <div>
                      <span className="font-bold block text-white group-hover:text-[#ff00ff]">💥 RAPID AUTOFIRE ACCELERATION</span>
                      <span className="text-gray-400 text-[10px]">Sprays machine rounds. Uses 10 ammunition counts. Yields multipliers!</span>
                    </div>
                    <span className="text-[10px] text-gray-500">REF + Autofire (6) + 1D10</span>
                  </button>
                </div>
              )}

              {currentMenuTab === 'stealth' && (
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handlePlayerAction('hide')}
                    className="w-full p-2.5 bg-black/50 hover:bg-cyan-950 hover:text-cyan-300 border border-cyan-500/30 rounded text-left font-mono text-xs flex justify-between items-center transition-all cursor-pointer group"
                  >
                    <div>
                      <span className="font-bold block text-white group-hover:text-cyan-400">👤 CLOAK / STEALTH HIDE</span>
                      <span className="text-gray-400 text-[10px]">Hides among server panels. Success grants AMBUSH checks (+4 to hit!)</span>
                    </div>
                    <span className="text-[10px] text-gray-500">TECH + Cover Skill + 1D10</span>
                  </button>

                  <div className="border border-cyan-500/10 p-3 bg-black/20 rounded text-[10px] font-mono text-gray-400">
                    <p className="font-bold text-cyan-400 mb-1">STEALTH MECHANICS:</p>
                    Once hidden, your next shoot, melee, or autofire attack behaves as an ambush with a massive +4 hit chance accuracy! However, taking action immediately exposes your coordinates.
                  </div>
                </div>
              )}

              {currentMenuTab === 'social' && (
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handlePlayerAction('facedown')}
                    className="w-full p-2.5 bg-black/50 hover:bg-yellow-950 hover:text-yellow-300 border border-yellow-500/30 rounded text-left font-mono text-xs flex justify-between items-center transition-all cursor-pointer group"
                  >
                    <div>
                      <span className="font-bold block text-white group-hover:text-yellow-400">👁️ COLD FACEDOWN ENCOUNTER</span>
                      <span className="text-gray-400 text-[10px]">Challenger's Cool reputation test. Inflicts -2 to target's attacks.</span>
                    </div>
                    <span className="text-[10px] text-gray-500">COOL + Willpower (8) + 1D10</span>
                  </button>

                  <button
                    onClick={() => handlePlayerAction('grapple')}
                    className="w-full p-2.5 bg-[#0e0c15] hover:bg-indigo-950 border border-indigo-500/30 rounded text-left font-mono text-xs flex justify-between items-center transition-all cursor-pointer group"
                  >
                    <div>
                      <span className="font-bold block text-white group-hover:text-indigo-400">🥋 BRAWL GRAPPLE & CHOKE</span>
                      <span className="text-gray-400 text-[10px]">Physically lock up hostile target, dealing armor-ignioring choke points.</span>
                    </div>
                    <span className="text-[10px] text-gray-500">DEX + Brawl Skill + 1D10</span>
                  </button>

                  <button
                    onClick={() => handlePlayerAction('taunt')}
                    className="w-full p-2 bg-[#0d0c15] hover:bg-cyan-950 border border-cyan-500/10 rounded text-left font-mono text-xs flex justify-between items-center transition-all cursor-pointer"
                  >
                    <div>
                      <span className="font-bold block text-white">🗨️ VERBAL SLANG TAUNT CHALLENGE</span>
                      <span className="text-gray-400 text-[10px]">Taunt opponent with highly abrasive street slangs, drawing aggro.</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Always succeeds</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
