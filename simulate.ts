// Quick simulation to check RTP
import { shootZombies, rollGraveValue, zombieShootConfig, playHordeMode } from './src/game';

const STAKE = 0.2; // £0.20 stake
const ROUNDS = 10000;
const GOLD_BULLET_PROBABILITY = 0.05; // 5% chance

let totalSpent = 0;
let totalWon = 0;
let killDistribution = { 0: 0, 1: 0, 2: 0, 3: 0 };
let bonusCount = 0;
let prizeDistribution: { [key: string]: number } = {};

for (let round = 0; round < ROUNDS; round++) {
  totalSpent += STAKE;
  
  // Check for gold bullet
  const hasGoldBullet = Math.random() < GOLD_BULLET_PROBABILITY;
  
  // Shoot zombies
  const result = shootZombies();
  killDistribution[result.killCount as 0 | 1 | 2 | 3]++;
  
  // If gold bullet + 3 kills = bonus
  if (hasGoldBullet && result.killCount === 3) {
    bonusCount++;
    const hordeResult = playHordeMode();
    
    // Award prizes for each zombie killed in horde
    for (let i = 0; i < hordeResult.zombiesKilled; i++) {
      const numPrizes = Math.floor(Math.random() * 2) + 1; // 1-2 prizes per zombie
      for (let j = 0; j < numPrizes; j++) {
        const prize = rollGraveValue();
        totalWon += prize;
        prizeDistribution[prize.toString()] = (prizeDistribution[prize.toString()] || 0) + 1;
      }
    }
  } else {
    // Regular prizes based on kill count
    const numPrizes = result.phase.digs;
    for (let i = 0; i < numPrizes; i++) {
      const prize = rollGraveValue();
      totalWon += prize;
      prizeDistribution[prize.toString()] = (prizeDistribution[prize.toString()] || 0) + 1;
    }
  }
}

const rtp = (totalWon / totalSpent) * 100;

console.log('\n=== ZOMBIE TAP SIMULATION ===');
console.log(`Rounds: ${ROUNDS.toLocaleString()}`);
console.log(`Stake per round: £${STAKE}`);
console.log(`Total spent: £${totalSpent.toFixed(2)}`);
console.log(`Total won: £${totalWon.toFixed(2)}`);
console.log(`\nRTP: ${rtp.toFixed(2)}%`);
console.log(`\nKill Distribution:`);
console.log(`  0 kills: ${killDistribution[0]} (${((killDistribution[0]/ROUNDS)*100).toFixed(1)}%)`);
console.log(`  1 kill:  ${killDistribution[1]} (${((killDistribution[1]/ROUNDS)*100).toFixed(1)}%)`);
console.log(`  2 kills: ${killDistribution[2]} (${((killDistribution[2]/ROUNDS)*100).toFixed(1)}%)`);
console.log(`  3 kills: ${killDistribution[3]} (${((killDistribution[3]/ROUNDS)*100).toFixed(1)}%)`);
console.log(`\nBonus rounds triggered: ${bonusCount} (${((bonusCount/ROUNDS)*100).toFixed(2)}%)`);
console.log(`\nTop 10 Prize Values Won:`);
const sortedPrizes = Object.entries(prizeDistribution).sort((a, b) => b[1] - a[1]).slice(0, 10);
sortedPrizes.forEach(([value, count]) => {
  console.log(`  £${value}: ${count} times (${((count/Object.values(prizeDistribution).reduce((a,b)=>a+b,0))*100).toFixed(1)}%)`);
});
