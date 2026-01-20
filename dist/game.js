"use strict";
// Grave Fortunes prototype logic
// ---------------------------------
// Outcome phases define number of digs and a phase multiplier applied to the
// SUM of prizes from individual digs. Each prize is a multiplier on stake units.
Object.defineProperty(exports, "__esModule", { value: true });
exports.graveWeights = exports.graveValues = exports.digLadder = exports.attemptModel = exports.bonusPhase = exports.phases = void 0;
exports.getShotsTaken = getShotsTaken;
exports.pickAttemptPhase = pickAttemptPhase;
exports.resolveBonusPhase = resolveBonusPhase;
exports.pickPhase = pickPhase;
exports.rollGraveValue = rollGraveValue;
exports.rollPrize = rollPrize;
exports.resolveGraveFortunesRound = resolveGraveFortunesRound;
exports.expectedPrizePerDig = expectedPrizePerDig;
exports.simulateAttemptsWithBullets = simulateAttemptsWithBullets;
exports.simulate = simulate;
exports.mulberry32 = mulberry32;
// Simplified phase probabilities for ~97% RTP
// These values are tuned to provide good gameplay balance
exports.phases = [
    { id: "first", label: "First Shot", digs: 6, multiplier: 1, probability: 0.42 },
    { id: "second", label: "Second Shot", digs: 4, multiplier: 1, probability: 0.33 },
    { id: "third", label: "Third Shot", digs: 3, multiplier: 1, probability: 0.16 },
    { id: "fail", label: "Game Over", digs: 0, multiplier: 0, probability: 0.09 }
];
// Bonus phase (triggered only via Gold Bullet — not part of base probability distribution)
// NOTE: Its characteristics should be tuned so overall RTP stays consistent given goldProbability.
// Default values chosen conservatively relative to critical.
exports.bonusPhase = { id: 'bonus', label: 'Bonus Round', digs: 15, multiplier: 1, probability: 0 }; // probability unused (legacy)
exports.attemptModel = {
    // Simplified probabilities for better balance
    p1: 0.06, // 6% chance to hit on first shot
    p2: 0.08, // 8% chance to hit on second shot (if first missed)
    p3: 0.13, // 13% chance to hit on third shot (if first two missed)
    digRanges: {
        first: [4, 6], // First shot hit: 4-6 prizes
        second: [4, 6], // Second shot hit: 4-6 prizes  
        third: [3, 4], // Third shot hit: 3-4 prizes
        bonus: [13, 15] // Bonus (gold bullet): 13-15 prizes
    },
    multipliers: {
        first: 1,
        second: 1,
        third: 1,
        fail: 0,
        bonus: 1
    }
};
function randInt(min, max, rng = Math.random) { return Math.floor(rng() * (max - min + 1)) + min; }
// Get the number of shots taken based on the phase result
function getShotsTaken(phase) {
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
    // Fallback for regular phases
    switch (phase.id) {
        case 'first': return 1;
        case 'second': return 2;
        case 'third': return 3;
        case 'fail': return 3;
        case 'critical':
        case 'bonus': return 1;
        default: return 0;
    }
}
// Derive a phase-like object from attempt model for a SILVER bullet path.
function pickAttemptPhase(cfg = exports.attemptModel, rng = Math.random) {
    const r1 = rng();
    if (r1 < cfg.p1) {
        const digs = randInt(cfg.digRanges.first[0], cfg.digRanges.first[1], rng);
        return { id: 'first', label: 'First Shot', digs, multiplier: cfg.multipliers.first, probability: 0, originalShot: 'first' };
    }
    const r2 = rng();
    if (r2 < cfg.p2) {
        const digs = randInt(cfg.digRanges.second[0], cfg.digRanges.second[1], rng);
        return { id: 'second', label: 'Second Shot', digs, multiplier: cfg.multipliers.second, probability: 0, originalShot: 'second' };
    }
    const r3 = rng();
    if (r3 < cfg.p3) {
        const digs = randInt(cfg.digRanges.third[0], cfg.digRanges.third[1], rng);
        return { id: 'third', label: 'Third Shot', digs, multiplier: cfg.multipliers.third, probability: 0, originalShot: 'third' };
    }
    return { id: 'fail', label: 'Game Over', digs: 0, multiplier: cfg.multipliers.fail, probability: 0, originalShot: 'fail' };
}
// Bonus phase via GOLD bullet using attempt model dig range override
function resolveBonusPhase(cfg = exports.attemptModel, rng = Math.random) {
    const digs = randInt(cfg.digRanges.bonus[0], cfg.digRanges.bonus[1], rng);
    return { id: 'bonus', label: 'Bonus Round', digs, multiplier: cfg.multipliers.bonus, probability: 0, originalShot: 'bonus' };
}
// Validate probability sum (development-time check)
(function validatePhaseProbabilities(p) {
    const total = p.reduce((a, b) => a + b.probability, 0);
    if (Math.abs(total - 1) > 1e-9) {
        console.warn(`[GraveFortunes] Phase probabilities sum to ${total}, expected 1.0`);
    }
})(exports.phases);
// Weighted phase picker using cumulative distribution method.
function pickPhase(list, rng = Math.random) {
    const r = rng();
    let acc = 0;
    for (const phase of list) {
        acc += phase.probability;
        if (r <= acc)
            return phase;
    }
    // Fallback (due to floating point) — return last phase
    return list[list.length - 1];
}
// Legacy ladder retained for reference (not used in new UI math)
exports.digLadder = [];
// Grave values shown on the stones (order matters – must match UI labels)
exports.graveValues = [0.2, 0.3, 0.5, 0.8, 1, 1.5, 2, 2.5, 4, 5, 8, 10, 50, 100, 250];
// Weights chosen so expected prize per dig ≈ 0.2165 stake units.
exports.graveWeights = [
    7000, // 0.2
    250, // 0.3
    90, // 0.5
    35, // 0.8
    15, // 1
    6, // 1.5
    4, // 2
    2.5, // 2.5
    1.2, // 4
    0.8, // 5
    0.4, // 8
    0.25, // 10
    0.02, // 50
    0.008, // 100
    0.002 // 250
];
const TOTAL_GRAVE_WEIGHT = exports.graveWeights.reduce((a, b) => a + b, 0);
function rollGraveValue(rng = Math.random) {
    let r = rng() * TOTAL_GRAVE_WEIGHT;
    for (let i = 0; i < exports.graveValues.length; i++) {
        r -= exports.graveWeights[i];
        if (r <= 0)
            return exports.graveValues[i];
    }
    return exports.graveValues[exports.graveValues.length - 1];
}
// Roll a single prize multiplier from the ladder.
function rollPrize(ladder = exports.digLadder, rng = Math.random) {
    // If legacy ladder empty use grave model
    if (!ladder.length)
        return rollGraveValue(rng);
    const totalWeight = ladder.reduce((a, b) => a + b.weight, 0);
    let r = rng() * totalWeight;
    for (const tier of ladder) {
        r -= tier.weight;
        if (r <= 0)
            return tier.value;
    }
    return ladder[ladder.length - 1].value; // Fallback
}
function resolveGraveFortunesRound(stake, rng = Math.random) {
    if (stake <= 0 || !isFinite(stake)) {
        throw new Error(`Stake must be a positive finite number. Provided: ${stake}`);
    }
    const phase = pickPhase(exports.phases, rng);
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
// Simple expected prize per dig calculation (kept for simulation purposes only)
function expectedPrizePerDig() {
    return exports.graveValues.reduce((acc, v, i) => acc + v * (exports.graveWeights[i] / TOTAL_GRAVE_WEIGHT), 0);
}
// Simulation for attempt model with bullets
function simulateAttemptsWithBullets(rounds, stake, goldProbability, rng = Math.random, cfg = exports.attemptModel) {
    let totalWin = 0;
    let first = 0, second = 0, third = 0, fail = 0;
    let goldHits = 0, goldFails = 0;
    for (let i = 0; i < rounds; i++) {
        const gold = rng() < goldProbability; // cosmetic critical tagging only
        const phase = pickAttemptPhase(cfg, rng);
        switch (phase.id) {
            case 'first':
                first++;
                break;
            case 'second':
                second++;
                break;
            case 'third':
                third++;
                break;
            case 'fail':
                fail++;
                break;
        }
        let digsTotalMult = 0;
        for (let d = 0; d < phase.digs; d++) {
            digsTotalMult += rollGraveValue(rng);
        }
        const roundWin = stake * digsTotalMult; // multiplier removed (unity)
        totalWin += roundWin;
        if (gold) {
            if (phase.id === 'fail')
                goldFails++;
            else
                goldHits++;
        }
    }
    const avgWin = totalWin / rounds;
    return { rounds, stake, averageWin: avgWin, distribution: { first, second, third, fail }, gold: { hits: goldHits, fails: goldFails, probability: goldProbability } };
}
// Monte Carlo simulation for sanity check (returns average win on given stake)
function simulate(rounds, stake, rng = Math.random) {
    let total = 0;
    for (let i = 0; i < rounds; i++) {
        total += resolveGraveFortunesRound(stake, rng).winAmount;
    }
    const averageWin = total / rounds;
    return { rounds, stake, averageWin };
}
// Small deterministic RNG for reproducibility if needed.
function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
