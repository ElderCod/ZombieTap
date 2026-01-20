"use strict";

// src/game.ts
var phases = [
  { id: "threeKills", label: "3 Zombies Killed!", digs: 8, zombiesKilled: 3, multiplier: 1, probability: 0.064 },
  { id: "twoKills", label: "2 Zombies Killed", digs: 5, zombiesKilled: 2, multiplier: 1, probability: 0.288 },
  { id: "oneKill", label: "1 Zombie Killed", digs: 3, zombiesKilled: 1, multiplier: 1, probability: 0.432 },
  { id: "fail", label: "All Missed!", digs: 0, zombiesKilled: 0, multiplier: 0, probability: 0.216 }
];
var bonusPhase = {
  id: "horde",
  label: "HORDE MODE!",
  digs: 20,
  // Max potential prizes if all zombies killed
  zombiesKilled: 0,
  // Determined during gameplay
  multiplier: 1,
  probability: 0
};
var zombieShootConfig = {
  hitProbability: 0.25,
  // 25% chance to hit each zombie (tight Lucky Tap feel)
  zombieCount: 3,
  digRanges: {
    threeKills: [2, 3],
    // 3 kills: 2-3 prizes
    twoKills: [1, 2],
    // 2 kills: 1-2 prizes
    oneKill: [1, 1],
    // 1 kill: 1 prize only
    horde: [1, 1]
    // Horde: 1 prize per zombie killed
  },
  hordeBullets: 12,
  // 12 bullets in horde mode
  hordeZombies: 16,
  // 16 zombies spawn in horde
  multipliers: {
    threeKills: 1,
    twoKills: 1,
    oneKill: 1,
    fail: 0,
    horde: 1
  }
};
function randInt(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function shootZombies(cfg = zombieShootConfig, rng = Math.random) {
  const zombiesHit = [];
  let killCount = 0;
  for (let i = 0; i < cfg.zombieCount; i++) {
    const hit = rng() < cfg.hitProbability;
    zombiesHit.push(hit);
    if (hit) killCount++;
  }
  let phase;
  let digs;
  switch (killCount) {
    case 3:
      digs = randInt(cfg.digRanges.threeKills[0], cfg.digRanges.threeKills[1], rng);
      phase = { ...phases.find((p) => p.id === "threeKills"), digs };
      break;
    case 2:
      digs = randInt(cfg.digRanges.twoKills[0], cfg.digRanges.twoKills[1], rng);
      phase = { ...phases.find((p) => p.id === "twoKills"), digs };
      break;
    case 1:
      digs = randInt(cfg.digRanges.oneKill[0], cfg.digRanges.oneKill[1], rng);
      phase = { ...phases.find((p) => p.id === "oneKill"), digs };
      break;
    default:
      phase = { ...phases.find((p) => p.id === "fail") };
      break;
  }
  return { zombiesHit, killCount, phase };
}
function playHordeMode(cfg = zombieShootConfig, rng = Math.random) {
  const shots = [];
  let zombiesKilled = 0;
  const zombiesSpawned = cfg.hordeZombies;
  for (let i = 0; i < cfg.hordeBullets && zombiesKilled < zombiesSpawned; i++) {
    const hit = rng() < cfg.hitProbability;
    shots.push(hit);
    if (hit) zombiesKilled++;
  }
  const digsPerKill = randInt(cfg.digRanges.horde[0], cfg.digRanges.horde[1], rng);
  const totalDigs = zombiesKilled * digsPerKill;
  const phase = {
    ...bonusPhase,
    digs: totalDigs,
    zombiesKilled
  };
  return {
    totalBullets: cfg.hordeBullets,
    zombiesKilled,
    zombiesSpawned,
    shots,
    phase
  };
}
(function validatePhaseProbabilities(p) {
  const total = p.reduce((a, b) => a + b.probability, 0);
  if (Math.abs(total - 1) > 1e-9) {
    console.warn(`[GraveFortunes] Phase probabilities sum to ${total}, expected 1.0`);
  }
})(phases);
var graveValues = [0.2, 0.3, 0.5, 0.8, 1, 1.5, 2, 2.5, 4, 5, 8, 10, 25];
var graveWeights = [
  4e4,
  // 0.2   - Very common (65%)
  2e4,
  // 0.3   - Common (33%)
  8e3,
  // 0.5   - Regular
  2e3,
  // 0.8   - Decent
  500,
  // 1.0   - Good
  100,
  // 1.5   - Nice
  20,
  // 2.0   - Great
  5,
  // 2.5   - Excellent
  1,
  // 4.0   - Very rare 
  0.2,
  // 5.0   - Extremely rare
  0.01,
  // 8.0   - Almost impossible
  1e-3,
  // 10.0  - Almost impossible
  1e-4
  // 25.0  - Legendary
];
var TOTAL_GRAVE_WEIGHT = graveWeights.reduce((a, b) => a + b, 0);
var bonusGraveWeights = [
  4e3,
  // 1.0   - Common bonus
  3e3,
  // 1.5   - Regular bonus
  2e3,
  // 2.0   - Good bonus
  1200,
  // 2.5   - Great bonus
  600,
  // 4.0   - Excellent bonus
  300,
  // 5.0   - Super bonus
  120,
  // 8.0   - Amazing bonus
  50,
  // 10.0  - Fantastic bonus
  15,
  // 25.0  - Rare jackpot
  0.5,
  // 50.0  - EXTREMELY RARE! (~1 in 22,000)
  0.05,
  // 100.0 - ALMOST IMPOSSIBLE! (~1 in 220,000)
  1e-3
  // 250.0 - LEGENDARY!!! (~1 in 11 MILLION!)
];
var TOTAL_BONUS_WEIGHT = bonusGraveWeights.reduce((a, b) => a + b, 0);
function rollGraveValue(rng = Math.random) {
  let r = rng() * TOTAL_GRAVE_WEIGHT;
  for (let i = 0; i < graveValues.length; i++) {
    r -= graveWeights[i];
    if (r <= 0) return graveValues[i];
  }
  return graveValues[graveValues.length - 1];
}

// simulate.ts
var STAKE = 0.2;
var ROUNDS = 1e4;
var GOLD_BULLET_PROBABILITY = 0.05;
var totalSpent = 0;
var totalWon = 0;
var killDistribution = { 0: 0, 1: 0, 2: 0, 3: 0 };
var bonusCount = 0;
var prizeDistribution = {};
for (let round = 0; round < ROUNDS; round++) {
  totalSpent += STAKE;
  const hasGoldBullet = Math.random() < GOLD_BULLET_PROBABILITY;
  const result = shootZombies();
  killDistribution[result.killCount]++;
  if (hasGoldBullet && result.killCount === 3) {
    bonusCount++;
    const hordeResult = playHordeMode();
    for (let i = 0; i < hordeResult.zombiesKilled; i++) {
      const numPrizes = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < numPrizes; j++) {
        const prize = rollGraveValue();
        totalWon += prize;
        prizeDistribution[prize.toString()] = (prizeDistribution[prize.toString()] || 0) + 1;
      }
    }
  } else {
    const numPrizes = result.phase.digs;
    for (let i = 0; i < numPrizes; i++) {
      const prize = rollGraveValue();
      totalWon += prize;
      prizeDistribution[prize.toString()] = (prizeDistribution[prize.toString()] || 0) + 1;
    }
  }
}
var rtp = totalWon / totalSpent * 100;
console.log("\n=== ZOMBIE TAP SIMULATION ===");
console.log(`Rounds: ${ROUNDS.toLocaleString()}`);
console.log(`Stake per round: \xA3${STAKE}`);
console.log(`Total spent: \xA3${totalSpent.toFixed(2)}`);
console.log(`Total won: \xA3${totalWon.toFixed(2)}`);
console.log(`
RTP: ${rtp.toFixed(2)}%`);
console.log(`
Kill Distribution:`);
console.log(`  0 kills: ${killDistribution[0]} (${(killDistribution[0] / ROUNDS * 100).toFixed(1)}%)`);
console.log(`  1 kill:  ${killDistribution[1]} (${(killDistribution[1] / ROUNDS * 100).toFixed(1)}%)`);
console.log(`  2 kills: ${killDistribution[2]} (${(killDistribution[2] / ROUNDS * 100).toFixed(1)}%)`);
console.log(`  3 kills: ${killDistribution[3]} (${(killDistribution[3] / ROUNDS * 100).toFixed(1)}%)`);
console.log(`
Bonus rounds triggered: ${bonusCount} (${(bonusCount / ROUNDS * 100).toFixed(2)}%)`);
console.log(`
Top 10 Prize Values Won:`);
var sortedPrizes = Object.entries(prizeDistribution).sort((a, b) => b[1] - a[1]).slice(0, 10);
sortedPrizes.forEach(([value, count]) => {
  console.log(`  \xA3${value}: ${count} times (${(count / Object.values(prizeDistribution).reduce((a, b) => a + b, 0) * 100).toFixed(1)}%)`);
});
