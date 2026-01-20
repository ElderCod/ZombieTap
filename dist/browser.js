"use strict";
(() => {
  // src/game.ts
  var phases = [
    { id: "threeKills", label: "3 Zombies Killed!", digs: 8, zombiesKilled: 3, multiplier: 1, probability: 0.064 },
    { id: "twoKills", label: "2 Zombies Killed", digs: 5, zombiesKilled: 2, multiplier: 1, probability: 0.288 },
    { id: "oneKill", label: "1 Zombie Killed", digs: 3, zombiesKilled: 1, multiplier: 1, probability: 0.432 },
    { id: "fail", label: "All Missed!", digs: 0, zombiesKilled: 0, multiplier: 0, probability: 0.216 }
  ];
  (function validatePhaseProbabilities(p) {
    const total = p.reduce((a, b) => a + b.probability, 0);
    if (Math.abs(total - 1) > 1e-9) {
      console.warn(`[GraveFortunes] Phase probabilities sum to ${total}, expected 1.0`);
    }
  })(phases);
  function pickPhase(list, rng = Math.random) {
    const r = rng();
    let acc = 0;
    for (const phase of list) {
      acc += phase.probability;
      if (r <= acc) return phase;
    }
    return list[list.length - 1];
  }
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
  function resolveGraveFortunesRound(stake, rng = Math.random) {
    if (stake <= 0 || !isFinite(stake)) {
      throw new Error(`Stake must be a positive finite number. Provided: ${stake}`);
    }
    const phase = pickPhase(phases, rng);
    const digPrizes = [];
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
  function simulate(rounds, stake, rng = Math.random) {
    let total = 0;
    for (let i = 0; i < rounds; i++) {
      total += resolveGraveFortunesRound(stake, rng).winAmount;
    }
    const averageWin = total / rounds;
    return { rounds, stake, averageWin };
  }
  function mulberry32(seed) {
    return function() {
      seed |= 0;
      seed = seed + 1831565813 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // src/browser.ts
  var api = {
    phases,
    playRound: (stake) => resolveGraveFortunesRound(stake),
    simulate: (rounds, stake, seed) => {
      const rng = mulberry32(seed ?? Date.now());
      return simulate(rounds, stake, rng);
    }
  };
  window.GraveFortunes = api;
})();
