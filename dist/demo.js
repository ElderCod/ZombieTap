"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("./game");
function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].replace(/^--/, '');
            const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
            opts[key] = val;
            if (val !== 'true')
                i++;
        }
    }
    return opts;
}
const opts = parseArgs();
const stake = parseFloat(opts.stake || '1');
if (opts.simulate) {
    const rounds = parseInt(opts.simulate, 10) || 10000;
    const seed = opts.seed ? parseInt(opts.seed, 10) : Date.now();
    const rng = (0, game_1.mulberry32)(seed);
    const result = (0, game_1.simulate)(rounds, stake, rng);
    console.log(`Simulation (seed=${seed}) over ${rounds} rounds at stake=${stake}`);
    console.table(result);
    process.exit(0);
}
// Attempt model + bullets simulation
if (opts.attemptSim) {
    const rounds = parseInt(opts.attemptSim, 10) || 10000;
    const goldProb = opts.goldProb ? parseFloat(opts.goldProb) : 0.20;
    const seed = opts.seed ? parseInt(opts.seed, 10) : Date.now();
    const rng = (0, game_1.mulberry32)(seed);
    const sim = (0, game_1.simulateAttemptsWithBullets)(rounds, stake, goldProb, rng, game_1.attemptModel);
    console.log(`Attempt Simulation (seed=${seed}) rounds=${rounds} stake=${stake} goldProb=${goldProb}`);
    console.table({ averageWin: sim.averageWin.toFixed(4) });
    console.log('Distribution counts:', sim.distribution);
    console.log('Gold bullet stats:', sim.gold);
    process.exit(0);
}
const result = (0, game_1.resolveGraveFortunesRound)(stake);
console.log('Grave Fortunes Round Result');
console.log({
    phase: result.phase.id,
    phaseLabel: result.phase.label,
    digs: result.phase.digs,
    digPrizes: result.digPrizes,
    phaseMultiplier: result.phaseMultiplier,
    totalDigMultiplier: result.totalDigMultiplier.toFixed(4),
    totalMultiplier: result.totalMultiplier.toFixed(4),
    winAmount: result.winAmount.toFixed(2)
});
console.log(`Game configured for ~97% RTP target`);
