// Zombie Shooter prototype logic
// ---------------------------------
// NEW MECHANIC: Shoot at 3 zombies. Each can be hit or missed.
// Prize based on number of zombies killed (0=lose, 1/2/3=increasing prizes)

export interface Phase {
  id: string;
  label: string;
  digs: number; // number of prize rolls
  zombiesKilled: number; // NEW: number of zombies killed
  multiplier: number;
  probability: number; // must sum to 1 across all phases
}

// NEW: 3-Zombie System - shoot at 3 zombies, prize based on kills
// Probabilities tuned for 95-97% RTP (Lucky Tap standard)
export const phases: Phase[] = [
  { id: "threeKills", label: "3 Zombies Killed!", digs: 8, zombiesKilled: 3, multiplier: 1, probability: 0.064 },
  { id: "twoKills", label: "2 Zombies Killed", digs: 5, zombiesKilled: 2, multiplier: 1, probability: 0.288 },
  { id: "oneKill", label: "1 Zombie Killed", digs: 3, zombiesKilled: 1, multiplier: 1, probability: 0.432 },
  { id: "fail", label: "All Missed!", digs: 0, zombiesKilled: 0, multiplier: 0, probability: 0.216 }
];

// Bonus phase: HORDE MODE (triggered by Gold Bullet)
// Graves transform into zombies! Limited bullets, shoot as many as you can!
export const bonusPhase: Phase = { 
  id: 'horde', 
  label: 'HORDE MODE!', 
  digs: 20, // Max potential prizes if all zombies killed
  zombiesKilled: 0, // Determined during gameplay
  multiplier: 1, 
  probability: 0 
};

// NEW: Multi-zombie shooting model
// Each zombie has independent hit probability
export interface ZombieShootConfig {
  hitProbability: number; // probability to hit each individual zombie
  zombieCount: number; // always 3 for main game
  digRanges: {
    threeKills: [number, number];
    twoKills: [number, number];
    oneKill: [number, number];
    horde: [number, number]; // horde mode dig range per zombie killed
  };
  hordeBullets: number; // bullets available in horde mode
  // NEW: Tiered horde mode based on gold kills
  hordeTiers: {
    oneGoldKill: { zombies: [number, number]; multiplier: number }; // 1 gold = easier bonus
    twoGoldKills: { zombies: [number, number]; multiplier: number }; // 2 gold = medium bonus
    threeGoldKills: { zombies: [number, number]; multiplier: number }; // 3 gold = jackpot bonus
  };
  multipliers: {
    threeKills: number;
    twoKills: number;
    oneKill: number;
    fail: number;
    horde: number;
  };
}

export const zombieShootConfig: ZombieShootConfig = {
  hitProbability: 0.25, // 25% chance to hit each zombie (tight Lucky Tap feel)
  zombieCount: 3,
  digRanges: {
    threeKills: [2, 3],  // 3 kills: 2-3 prizes
    twoKills: [1, 2],    // 2 kills: 1-2 prizes
    oneKill: [1, 1],     // 1 kill: 1 prize only
    horde: [1, 1]        // Horde: 1 prize per zombie killed
  },
  hordeBullets: 12,     // 12 bullets in horde mode
  // NEW: Tiered bonus system - more gold kills = better rewards!
  hordeTiers: {
    oneGoldKill: { zombies: [4, 5], multiplier: 1 },     // 1 gold: 4-5 zombies, 1x prizes
    twoGoldKills: { zombies: [6, 7], multiplier: 2 },    // 2 gold: 6-7 zombies, 2x prizes
    threeGoldKills: { zombies: [8, 10], multiplier: 3 }  // 3 gold: 8-10 zombies, 3x prizes
  },
  multipliers: {
    threeKills: 1,
    twoKills: 1,
    oneKill: 1,
    fail: 0,
    horde: 1
  }
};

// Legacy AttemptModelConfig kept for backward compatibility but not used
export interface AttemptModelConfig {
  p1: number;
  p2: number;
  p3: number;
  digRanges: {
    first: [number, number];
    second: [number, number];
    third: [number, number];
    bonus: [number, number];
  };
  multipliers: {
    first: number;
    second: number;
    third: number;
    fail: number;
    bonus: number;
  };
}

export const attemptModel: AttemptModelConfig = {
  p1: 0.06,
  p2: 0.08,
  p3: 0.13,
  digRanges: {
    first: [4, 6],
    second: [4, 6],
    third: [3, 4],
    bonus: [13, 15]
  },
  multipliers: {
    first: 1,
    second: 1,
    third: 1,
    fail: 0,
    bonus: 1
  }
};

function randInt(min:number,max:number,rng:()=>number=Math.random){ return Math.floor(rng()*(max-min+1))+min; }

// NEW: Shoot at 3 zombies, return which ones were hit
export interface ZombieShootResult {
  zombiesHit: boolean[]; // array of 3 booleans (true=hit, false=miss)
  killCount: number; // total zombies killed
  phase: Phase; // resulting phase based on kill count
}

// NEW: Main shooting mechanic - shoot at 3 zombies
export function shootZombies(cfg: ZombieShootConfig = zombieShootConfig, rng: () => number = Math.random): ZombieShootResult {
  const zombiesHit: boolean[] = [];
  let killCount = 0;
  
  // Shoot at each zombie
  for (let i = 0; i < cfg.zombieCount; i++) {
    const hit = rng() < cfg.hitProbability;
    zombiesHit.push(hit);
    if (hit) killCount++;
  }
  
  // Determine phase based on kill count
  let phase: Phase;
  let digs: number;
  
  switch (killCount) {
    case 3:
      digs = randInt(cfg.digRanges.threeKills[0], cfg.digRanges.threeKills[1], rng);
      phase = { ...phases.find(p => p.id === 'threeKills')!, digs };
      break;
    case 2:
      digs = randInt(cfg.digRanges.twoKills[0], cfg.digRanges.twoKills[1], rng);
      phase = { ...phases.find(p => p.id === 'twoKills')!, digs };
      break;
    case 1:
      digs = randInt(cfg.digRanges.oneKill[0], cfg.digRanges.oneKill[1], rng);
      phase = { ...phases.find(p => p.id === 'oneKill')!, digs };
      break;
    default: // 0 kills
      phase = { ...phases.find(p => p.id === 'fail')! };
      break;
  }
  
  return { zombiesHit, killCount, phase };
}

// NEW: Horde mode shooting - limited bullets, multiple zombies
// goldKills determines the tier (1, 2, or 3)
export interface HordeModeResult {
  totalBullets: number;
  zombiesKilled: number;
  zombiesSpawned: number;
  shots: boolean[]; // true=hit, false=miss for each bullet
  phase: Phase;
  goldKills: number; // Number of gold kills that triggered this bonus
  multiplier: number; // Prize multiplier for this tier
}

export function playHordeMode(goldKills: number = 3, cfg: ZombieShootConfig = zombieShootConfig, rng: () => number = Math.random): HordeModeResult {
  // Determine tier based on gold kills
  let tier: { zombies: [number, number]; multiplier: number };
  switch (goldKills) {
    case 1:
      tier = cfg.hordeTiers.oneGoldKill;
      break;
    case 2:
      tier = cfg.hordeTiers.twoGoldKills;
      break;
    case 3:
    default:
      tier = cfg.hordeTiers.threeGoldKills;
      break;
  }
  
  // Weighted random zombies to kill based on tier
  const zombiesSpawned = randInt(tier.zombies[0], tier.zombies[1], rng);
  const multiplier = tier.multiplier;
  
  const shots: boolean[] = [];
  let zombiesKilled = 0;
  
  // Shoot bullets at horde
  for (let i = 0; i < cfg.hordeBullets && zombiesKilled < zombiesSpawned; i++) {
    const hit = rng() < cfg.hitProbability;
    shots.push(hit);
    if (hit) zombiesKilled++;
  }
  
  // Calculate digs based on zombies killed
  const digsPerKill = randInt(cfg.digRanges.horde[0], cfg.digRanges.horde[1], rng);
  const totalDigs = zombiesKilled * digsPerKill;
  
  const phase: Phase = {
    ...bonusPhase,
    digs: totalDigs,
    zombiesKilled,
    multiplier // Apply tier multiplier
  };
  
  return {
    totalBullets: cfg.hordeBullets,
    zombiesKilled,
    zombiesSpawned,
    shots,
    phase,
    goldKills,
    multiplier
  };
}

export interface ResolvedAttemptPhase extends Phase { originalShot: 'first'|'second'|'third'|'fail'|'bonus'; }

// Get the number of shots taken based on the phase result
export function getShotsTaken(phase: ResolvedAttemptPhase | Phase): number {
  if ('originalShot' in phase) {
    switch (phase.originalShot) {
      case 'first': return 1;
      case 'second': return 2;
      case 'third': return 3;
      case 'fail': return 3; // Used all shots
      case 'bonus': return 1; // Gold bullet hits on first shot
      default: return 0;
    }
  }
  // Fallback for new zombie system
  switch (phase.id) {
    case 'threeKills':
    case 'twoKills':
    case 'oneKill':
    case 'fail':
      return 3; // Always shoot at 3 zombies
    case 'horde':
      return zombieShootConfig.hordeBullets; // Horde mode bullets
    case 'first': return 1;
    case 'second': return 2;
    case 'third': return 3;
    case 'critical':
    case 'bonus': return 1;
    default: return 0;
  }
}

// LEGACY: Derive a phase-like object from attempt model for a SILVER bullet path.
// Kept for backward compatibility but not used in new zombie system
export function pickAttemptPhase(cfg: AttemptModelConfig = attemptModel, rng: () => number = Math.random): ResolvedAttemptPhase {
  const r1 = rng();
  if (r1 < cfg.p1) {
    const digs = randInt(cfg.digRanges.first[0], cfg.digRanges.first[1], rng);
    return { id:'first', label:'First Shot', digs, zombiesKilled: 1, multiplier: cfg.multipliers.first, probability:0, originalShot:'first' };
  }
  const r2 = rng();
  if (r2 < cfg.p2) {
    const digs = randInt(cfg.digRanges.second[0], cfg.digRanges.second[1], rng);
    return { id:'second', label:'Second Shot', digs, zombiesKilled: 1, multiplier: cfg.multipliers.second, probability:0, originalShot:'second' };
  }
  const r3 = rng();
  if (r3 < cfg.p3) {
    const digs = randInt(cfg.digRanges.third[0], cfg.digRanges.third[1], rng);
    return { id:'third', label:'Third Shot', digs, zombiesKilled: 1, multiplier: cfg.multipliers.third, probability:0, originalShot:'third' };
  }
  return { id:'fail', label:'Game Over', digs:0, zombiesKilled: 0, multiplier: cfg.multipliers.fail, probability:0, originalShot:'fail' };
}

// LEGACY: Bonus phase via GOLD bullet using attempt model dig range override
// Kept for backward compatibility
export function resolveBonusPhase(cfg: AttemptModelConfig = attemptModel, rng: () => number = Math.random): ResolvedAttemptPhase {
  const digs = randInt(cfg.digRanges.bonus[0], cfg.digRanges.bonus[1], rng);
  return { id:'bonus', label:'Bonus Round', digs, zombiesKilled: 1, multiplier: cfg.multipliers.bonus, probability:0, originalShot:'bonus' };
}

// Validate probability sum (development-time check)
(function validatePhaseProbabilities(p: Phase[]) {
  const total = p.reduce((a, b) => a + b.probability, 0);
  if (Math.abs(total - 1) > 1e-9) {
    console.warn(`[GraveFortunes] Phase probabilities sum to ${total}, expected 1.0`);
  }
})(phases);

// Weighted phase picker using cumulative distribution method.
export function pickPhase(list: Phase[], rng: () => number = Math.random): Phase {
  const r = rng();
  let acc = 0;
  for (const phase of list) {
    acc += phase.probability;
    if (r <= acc) return phase;
  }
  // Fallback (due to floating point) — return last phase
  return list[list.length - 1];
}

// Prize ladder entry
export interface PrizeTier {
  value: number; // multiplier of stake per dig
  weight: number; // relative weight (not required to sum to specific value)
}

// Legacy ladder retained for reference (not used in new UI math)
export const digLadder: PrizeTier[] = [];

// Grave values shown on the stones (order matters – must match UI labels)
// Chase prizes (50, 100, 250) ONLY available in bonus horde mode!
export const graveValues: number[] = [0.2,0.3,0.5,0.8,1,1.5,2,2.5,4,5,8,10,25];

// Optimized for 95-97% RTP - extremely weighted toward lowest prizes
export const graveWeights: number[] = [
  40000,  // 0.2   - Very common (65%)
  20000,  // 0.3   - Common (33%)
  8000,   // 0.5   - Regular
  2000,   // 0.8   - Decent
  500,    // 1.0   - Good
  100,    // 1.5   - Nice
  20,     // 2.0   - Great
  5,      // 2.5   - Excellent
  1,      // 4.0   - Very rare 
  0.2,    // 5.0   - Extremely rare
  0.01,   // 8.0   - Almost impossible
  0.001,  // 10.0  - Almost impossible
  0.0001  // 25.0  - Legendary
];

const TOTAL_GRAVE_WEIGHT = graveWeights.reduce((a,b)=>a+b,0);

// Special bonus values for Gold bullet rounds (INCLUDES CHASE PRIZES!)
export const bonusGraveValues: number[] = [1,1.5,2,2.5,4,5,8,10,25,50,100,250];
export const bonusGraveWeights: number[] = [
  4000,   // 1.0   - Common bonus
  3000,   // 1.5   - Regular bonus
  2000,   // 2.0   - Good bonus
  1200,   // 2.5   - Great bonus
  600,    // 4.0   - Excellent bonus
  300,    // 5.0   - Super bonus
  120,    // 8.0   - Amazing bonus
  50,     // 10.0  - Fantastic bonus
  15,     // 25.0  - Rare jackpot
  0.5,    // 50.0  - EXTREMELY RARE! (~1 in 22,000)
  0.05,   // 100.0 - ALMOST IMPOSSIBLE! (~1 in 220,000)
  0.001   // 250.0 - LEGENDARY!!! (~1 in 11 MILLION!)
];
const TOTAL_BONUS_WEIGHT = bonusGraveWeights.reduce((a,b)=>a+b,0);

export function rollBonusGraveValue(rng: () => number = Math.random): number {
  let r = rng() * TOTAL_BONUS_WEIGHT;
  for (let i=0;i<bonusGraveValues.length;i++) {
    r -= bonusGraveWeights[i];
    if (r <= 0) return bonusGraveValues[i];
  }
  return bonusGraveValues[bonusGraveValues.length-1];
}

export function rollGraveValue(rng: () => number = Math.random): number {
  let r = rng() * TOTAL_GRAVE_WEIGHT;
  for (let i=0;i<graveValues.length;i++) {
    r -= graveWeights[i];
    if (r <= 0) return graveValues[i];
  }
  return graveValues[graveValues.length-1];
}

// Roll a single prize multiplier from the ladder.
export function rollPrize(ladder: PrizeTier[] = digLadder, rng: () => number = Math.random): number {
  // If legacy ladder empty use grave model
  if (!ladder.length) return rollGraveValue(rng);
  const totalWeight = ladder.reduce((a, b) => a + b.weight, 0);
  let r = rng() * totalWeight;
  for (const tier of ladder) {
    r -= tier.weight;
    if (r <= 0) return tier.value;
  }
  return ladder[ladder.length - 1].value; // Fallback
}

export interface RoundResult {
  phase: Phase;
  stake: number;
  digPrizes: number[]; // raw dig multipliers (before phase multiplier)
  phaseMultiplier: number; // from chosen phase
  totalDigMultiplier: number; // sum of digPrizes
  totalMultiplier: number; // totalDigMultiplier * phaseMultiplier
  winAmount: number; // stake * totalMultiplier
}

export function resolveGraveFortunesRound(stake: number, rng: () => number = Math.random): RoundResult {
  if (stake <= 0 || !isFinite(stake)) {
    throw new Error(`Stake must be a positive finite number. Provided: ${stake}`);
  }
  const phase = pickPhase(phases, rng);
  const digPrizes: number[] = [];
  for (let i = 0; i < phase.digs; i++) {
    digPrizes.push(rollGraveValue(rng));
  }
  const totalDigMultiplier = digPrizes.reduce((a, b) => a + b, 0);
  const totalMultiplier = totalDigMultiplier * phase.multiplier;
  const winAmount = stake * totalMultiplier;
  return {
    phase,
    stake,
    digPrizes,
    phaseMultiplier: phase.multiplier,
    totalDigMultiplier,
    totalMultiplier,
    winAmount
  };
}

// Simple expected prize per dig calculation (kept for simulation purposes only)
export function expectedPrizePerDig(): number {
  return graveValues.reduce((acc,v,i)=>acc + v * (graveWeights[i] / TOTAL_GRAVE_WEIGHT),0);
}

// Simulation for attempt model with bullets
export function simulateAttemptsWithBullets(rounds:number, stake:number, goldProbability:number, rng:()=>number=Math.random, cfg:AttemptModelConfig=attemptModel){
  let totalWin = 0; let first=0, second=0, third=0, fail=0; let goldHits=0, goldFails=0;
  for(let i=0;i<rounds;i++){
    const gold = rng() < goldProbability; // cosmetic critical tagging only
    const phase = pickAttemptPhase(cfg, rng);
    switch(phase.id){ case 'first': first++; break; case 'second': second++; break; case 'third': third++; break; case 'fail': fail++; break; }
    let digsTotalMult = 0;
    for(let d=0; d<phase.digs; d++){ digsTotalMult += rollGraveValue(rng); }
    const roundWin = stake * digsTotalMult; // multiplier removed (unity)
    totalWin += roundWin;
    if (gold) { if (phase.id === 'fail') goldFails++; else goldHits++; }
  }
  const avgWin = totalWin / rounds;
  return { rounds, stake, averageWin: avgWin, distribution:{ first, second, third, fail }, gold:{ hits: goldHits, fails: goldFails, probability: goldProbability } };
}

// Monte Carlo simulation for sanity check (returns average win on given stake)
export function simulate(rounds: number, stake: number, rng: () => number = Math.random): { rounds: number; stake: number; averageWin: number } {
  let total = 0;
  for (let i = 0; i < rounds; i++) {
    total += resolveGraveFortunesRound(stake, rng).winAmount;
  }
  const averageWin = total / rounds;
  return { rounds, stake, averageWin };
}

// Small deterministic RNG for reproducibility if needed.
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
