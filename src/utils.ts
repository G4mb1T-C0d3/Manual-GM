// Utility script for dice rolling, Cyberpunk Red rulesets, and weapon range DVs

export interface RollResult {
  total: number;
  rollString: string;
  isCriticalSuccess: boolean;
  isFumble: boolean;
}

// Exploding d10 roll rule in Cyberpunk Red
export function rollD10(): RollResult {
  const first = Math.floor(Math.random() * 10) + 1;
  let total = first;
  let rollString = `${first}`;
  let isCriticalSuccess = false;
  let isFumble = false;

  if (first === 10) {
    isCriticalSuccess = true;
    const bonus = Math.floor(Math.random() * 10) + 1;
    total += bonus;
    rollString += ` (Exploding Critical! +${bonus})`;
  } else if (first === 1) {
    isFumble = true;
    const penalty = Math.floor(Math.random() * 10) + 1;
    total -= penalty;
    rollString += ` (Fumble! -${penalty})`;
  }

  return { total, rollString, isCriticalSuccess, isFumble };
}

export interface DamageRollResult {
  total: number;
  diceText: string;
  individualRolls: number[];
  isCriticalInjury: boolean; // Cyberpunk RED condition: 2 or more 6s
}

// Rolls a string like '3d6' or '5d6'
export function rollDamage(diceString: string): DamageRollResult {
  const match = diceString.toLowerCase().match(/^(\d+)d(\d+)$/);
  if (!match) {
    return { total: 4, diceText: '4 (Static)', individualRolls: [4], isCriticalInjury: false };
  }

  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  
  const rolls: number[] = [];
  let total = 0;
  let numSixes = 0;

  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    total += roll;
    if (roll === 6) {
      numSixes++;
    }
  }

  const isCriticalInjury = numSixes >= 2;
  const diceText = `${total} [${rolls.join(' + ')}]`;

  return { total, diceText, individualRolls: rolls, isCriticalInjury };
}

// Cyberpunk RED official weapon DV metrics
export function getWeaponDV(type: 'pistol' | 'shotgun' | 'rifle', distance: number): number {
  if (type === 'pistol') {
    if (distance <= 6) return 13;
    if (distance <= 12) return 15;
    if (distance <= 25) return 20;
    return 25;
  } else if (type === 'shotgun') {
    if (distance <= 6) return 13;
    if (distance <= 12) return 17;
    if (distance <= 25) return 20;
    return 25;
  } else { // rifle group
    if (distance <= 6) return 17;
    if (distance <= 12) return 16;
    if (distance <= 25) return 15;
    if (distance <= 50) return 20;
    return 25;
  }
}

// Time formattings for game terminal clock
export function getGameTime(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
