// UI & animation layer for Zombie Shooter
// Orchestrates a Lucky-Tap style experience with 3-zombie shooting.
import { 
  pickPhase, 
  phases, 
  Phase, 
  graveValues, 
  rollGraveValue, 
  pickAttemptPhase, 
  attemptModel, 
  getShotsTaken,
  shootZombies,
  playHordeMode,
  zombieShootConfig,
  ZombieShootResult,
  HordeModeResult
} from './game';

// Static prize multipliers shown on graves
// Chase prizes (50, 100, 250) are ONLY available in bonus horde mode!
const STATIC_GRAVE_PRIZES: number[] = [0.2, 0.3, 0.5, 0.8, 1, 1.5, 2, 2.5, 4, 5, 8, 10, 25];

// Bonus round grave prizes (includes ultra-rare chase prizes!)
const BONUS_GRAVE_PRIZES: number[] = [1, 1.5, 2, 2.5, 4, 5, 8, 10, 25, 50, 100, 250];

// Utility sleep
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Sound stub (replace with actual audio assets)
// Audio context for sound effects
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playSound(name: string, opts: { pitch?: number } = {}) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Different sound types with unique frequencies and envelopes
    switch (name) {
      case 'gunshot':
        // Sharp, punchy gunshot
        playTone(ctx, 80, 0.05, 'square', 0.5, now);
        playTone(ctx, 40, 0.1, 'sawtooth', 0.3, now + 0.02);
        break;
        
      case 'hit':
        // Hit confirm sound
        playTone(ctx, 600, 0.15, 'sine', 0.3, now);
        playTone(ctx, 800, 0.1, 'sine', 0.2, now + 0.05);
        break;
        
      case 'whiff':
        // Miss whoosh
        playTone(ctx, 200, 0.2, 'sawtooth', 0.15, now, -100);
        break;
        
      case 'target-lock':
        // Quick beep
        playTone(ctx, 800, 0.05, 'sine', 0.2, now);
        break;
        
      case 'coin':
        // Coin pickup with variable pitch
        const pitch = opts.pitch || 1;
        playTone(ctx, 800 * pitch, 0.1, 'sine', 0.15, now);
        break;
        
      case 'zombie-rise':
        // Low rumble
        playTone(ctx, 100, 0.3, 'triangle', 0.2, now, 50);
        break;
        
      case 'chase-hit':
        // Exciting win
        playTone(ctx, 1000, 0.1, 'sine', 0.3, now);
        playTone(ctx, 1200, 0.1, 'sine', 0.3, now + 0.08);
        playTone(ctx, 1500, 0.15, 'sine', 0.35, now + 0.16);
        break;
        
      case 'mega-jackpot':
        // Big win fanfare
        playTone(ctx, 800, 0.15, 'sine', 0.4, now);
        playTone(ctx, 1000, 0.15, 'sine', 0.4, now + 0.1);
        playTone(ctx, 1200, 0.2, 'sine', 0.5, now + 0.2);
        playTone(ctx, 1500, 0.25, 'sine', 0.5, now + 0.3);
        break;
        
      default:
        // Generic beep
        playTone(ctx, 440, 0.1, 'sine', 0.2, now);
    }
  } catch (e) {
    console.log(`[sound] ${name}` + (opts.pitch ? ` pitch=${opts.pitch.toFixed(2)}` : ''));
  }
}

// Helper to play a tone with frequency modulation
function playTone(
  ctx: AudioContext, 
  freq: number, 
  duration: number, 
  type: OscillatorType, 
  volume: number, 
  startTime: number,
  freqSlide: number = 0
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  
  if (freqSlide !== 0) {
    osc.frequency.exponentialRampToValueAtTime(freq + freqSlide, startTime + duration);
  }
  
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// Camera shake helper
function cameraShake(duration = 200) {
  const root = document.getElementById('gameRoot');
  if (!root) return;
  const start = performance.now();
  function frame(now: number) {
    const t = now - start;
    if (t < duration && root) {
      const x = (Math.random() * 8 - 4);
      const y = (Math.random() * 8 - 4);
      root.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(frame);
    } else if (root) {
      root.style.transform = 'translate(0,0)';
    }
  }
  requestAnimationFrame(frame);
}

// Elements
let graveContainer: HTMLElement;
let zombieContainer: HTMLElement;
let zombie1: HTMLElement;
let zombie2: HTMLElement;
let zombie3: HTMLElement;
let shootButton: HTMLButtonElement;
let textPanel: HTMLElement;
let stakeInput: HTMLInputElement;
let winPanel: HTMLElement;
let subtotalPanel: HTMLElement;
let statsPanel: HTMLElement;
let resetStatsBtn: HTMLButtonElement;
let bulletChamberEl: HTMLElement;
let bulletWheelEl: HTMLElement;
let bulletResultEl: HTMLElement;
let shotInfoEl: HTMLElement;

// State
let misses = 0; // visual misses for approach scaling
let busy = false; // guard against double round fire
let currentStake = 1;
let debugMode = false; // Debug mode for testing
let forceGoldBullet = false; // Force next bullet to be gold (debug)
let forceThreeKills = false; // Force all 3 zombies to be hit (debug)
let forceChasePrize = 0; // Force specific chase prize (0=none, 50=£50, 100=£100, 250=£250)
let isHordeMode = false; // Track if we're in horde mode

function initDomRefs() {
  graveContainer = document.getElementById('graveContainer')!;
  zombieContainer = document.getElementById('zombieContainer')!;
  // Get individual zombie elements
  zombie1 = document.getElementById('zombie1')!;
  zombie2 = document.getElementById('zombie2')!;
  zombie3 = document.getElementById('zombie3')!;
  
  // Reset zombie states on load
  [zombie1, zombie2, zombie3].forEach(z => {
    z.classList.remove('target', 'hit', 'dead', 'dodge', 'aiming');
  });
  
  shootButton = document.getElementById('shootButton') as HTMLButtonElement;
  textPanel = document.getElementById('textPanel')!;
  stakeInput = document.getElementById('stakeInput') as HTMLInputElement;
  winPanel = document.getElementById('winPanel')!;
  subtotalPanel = document.getElementById('subtotalPanel')!;
  statsPanel = document.getElementById('statsPanel')!;
  resetStatsBtn = document.getElementById('resetStatsBtn') as HTMLButtonElement;
  bulletChamberEl = document.getElementById('bulletChamber')!;
  bulletWheelEl = document.getElementById('bulletWheel')!;
  bulletResultEl = document.getElementById('bulletResult')!;
  // create shotInfo element dynamically (simpler than adding to HTML)
  shotInfoEl = document.createElement('div');
  shotInfoEl.id = 'shotInfo';
  shotInfoEl.className = 'shot-info';
  document.querySelector('.hud')?.appendChild(shotInfoEl);
}

// Session stats (global scope)
interface SessionStats {
  rounds: number;
  stakePennies: number;
  winPennies: number;
  wins: number;
  losses: number;
  critical: number;
  fails: number;
  goldBullets: number;
  teases: number; // gold bullet rounds that failed
  // Streak tracking
  currentWinStreak: number;
  currentLossStreak: number;
  bestWinStreak: number;
  bestLossStreak: number;
  // Chase prize tracking  
  chaseHits: number; // £50+ prizes hit
  megaHits: number;  // £100+ prizes hit
  legendaryHits: number; // £250 prizes hit
}
const stats: SessionStats = {
  rounds: 0,
  stakePennies: 0,
  winPennies: 0,
  wins: 0,
  losses: 0,
  critical: 0,
  fails: 0,
  goldBullets: 0,
  teases: 0,
  currentWinStreak: 0,
  currentLossStreak: 0,
  bestWinStreak: 0,
  bestLossStreak: 0,
  chaseHits: 0,
  megaHits: 0,
  legendaryHits: 0
};

function resetStats() {
  stats.rounds = 0;
  stats.stakePennies = 0;
  stats.winPennies = 0;
  stats.wins = 0;
  stats.losses = 0;
  stats.critical = 0;
  stats.fails = 0;
  stats.goldBullets = 0;
  stats.teases = 0;
  stats.currentWinStreak = 0;
  stats.currentLossStreak = 0;
  stats.bestWinStreak = 0;
  stats.bestLossStreak = 0;
  stats.chaseHits = 0;
  stats.megaHits = 0;
  stats.legendaryHits = 0;
  renderStats();
}

function renderStats() {
  const stake = stats.stakePennies / 100;
  const win = stats.winPennies / 100;
  const net = win - stake;
  const rtpSession = stake > 0 ? (win / stake) * 100 : 0;
  (document.getElementById('statRounds')!).textContent = String(stats.rounds);
  (document.getElementById('statStake')!).textContent = `£${stake.toFixed(2)}`;
  (document.getElementById('statWin')!).textContent = `£${win.toFixed(2)}`;
  (document.getElementById('statNet')!).textContent = `£${net.toFixed(2)}`;
  (document.getElementById('statRTP')!).textContent = `${rtpSession.toFixed(2)}%`;
  (document.getElementById('statRTPTheo')!).textContent = `~27%`; // Realistic Lucky Tap RTP (most rounds fail)
  (document.getElementById('statWins')!).textContent = String(stats.wins);
  (document.getElementById('statLosses')!).textContent = String(stats.losses);
  (document.getElementById('statCritical')!).textContent = String(stats.critical);
  (document.getElementById('statFails')!).textContent = String(stats.fails);
  const gb = document.getElementById('statGoldBullets');
  if (gb) gb.textContent = String(stats.goldBullets);
  const tz = document.getElementById('statTeases');
  if (tz) tz.textContent = String(stats.teases);
  
  // Update streak displays
  const winStreak = document.getElementById('statWinStreak');
  if (winStreak) winStreak.textContent = `${stats.currentWinStreak} (Best: ${stats.bestWinStreak})`;
  const lossStreak = document.getElementById('statLossStreak');  
  if (lossStreak) lossStreak.textContent = `${stats.currentLossStreak} (Best: ${stats.bestLossStreak})`;
  
  // Update chase prize stats
  const chase = document.getElementById('statChase');
  if (chase) chase.textContent = `${stats.chaseHits} / ${stats.megaHits} / ${stats.legendaryHits}`;;
}

function updateStats(phase: Phase, stakeCash: number, winCash: number, bulletType: 'gold' | 'silver') {
  stats.rounds += 1;
  stats.stakePennies += toPennies(stakeCash);
  stats.winPennies += toPennies(winCash);
  
  // Win/Loss tracking with streaks
  if (winCash > 0) {
    stats.wins += 1;
    stats.currentWinStreak += 1;
    stats.currentLossStreak = 0;
    if (stats.currentWinStreak > stats.bestWinStreak) {
      stats.bestWinStreak = stats.currentWinStreak;
    }
  } else {
    stats.losses += 1;
    stats.currentLossStreak += 1;
    stats.currentWinStreak = 0;
    if (stats.currentLossStreak > stats.bestLossStreak) {
      stats.bestLossStreak = stats.currentLossStreak;
    }
  }
  
  if (phase.id === 'critical') stats.critical += 1;
  if (phase.id === 'fail') stats.fails += 1;
  if (bulletType === 'gold') stats.goldBullets += 1;
  if (bulletType === 'gold' && phase.id === 'fail') stats.teases += 1;
  
  renderStats();
}

// Track chase prizes separately (called from highlight function)
function trackChasePrize(amount: number) {
  if (amount >= 250) stats.legendaryHits += 1;
  if (amount >= 100) stats.megaHits += 1;  
  if (amount >= 50) stats.chaseHits += 1;
}

function setPhaseMessage(msg: string, cls: string = '') {
  textPanel.textContent = msg;
  textPanel.classList.remove('pulse', 'critical');
  if (cls) textPanel.classList.add(cls);
}

const approachScales = [1.00, 1.12, 1.28, 1.45];
function setZombieMissCount(n: number) {
  misses = n;
  const s = approachScales[Math.min(n, approachScales.length - 1)];
  zombieContainer.style.transform = `translate(-50%, -50%) scale(${s})`;
}

// Build graves with absolute cash prizes (values on stones are final winnings if selected)
function buildGravesWithPrizes(prizes: number[]) {
  graveContainer.innerHTML = '';
  const radiusPct = 38;
  const centerX = 50;
  const centerY = 50;
  prizes.forEach((cashValue, i) => {
    const angle = (i / prizes.length) * Math.PI * 2 - Math.PI / 2;
    const x = centerX + radiusPct * Math.cos(angle);
    const y = centerY + radiusPct * Math.sin(angle);
    const g = document.createElement('div');
    g.className = 'grave';
    g.id = `grave-${i}`;
    // Store explicit cash
    g.dataset.cash = String(cashValue);
    g.dataset.mult = String(cashValue); // reuse existing field for backwards compatibility
    g.style.left = x + '%';
    g.style.top = y + '%';
    g.innerHTML = `<span class="grave-value">${formatPrize(cashValue)}</span>`;
    graveContainer.appendChild(g);
  });
}

function formatPrize(mult: number): string {
  if (mult >= 1) return mult.toFixed(2);
  return mult.toFixed(2); // show two decimals for consistency
}


function muzzleFlash() {
  const pf = document.querySelector('.playfield');
  if (!pf) return;
  const flash = document.createElement('div');
  flash.className = 'muzzle-flash';
  pf.appendChild(flash);
  setTimeout(() => flash.remove(), 220);
}

// Show individual shot result feedback
function showShotResultFeedback(kind: 'miss' | 'hit', shotNumber: number) {
  const pf = document.querySelector('.playfield');
  if (!pf) return;
  
  const result = document.createElement('div');
  result.className = `shot-result ${kind}`;
  
  if (kind === 'miss') {
    const missMessages = ['MISS!', 'DODGED!', 'TOO FAST!', 'WHIFF!'];
    result.textContent = missMessages[Math.min(shotNumber - 1, missMessages.length - 1)];
  } else {
    const hitMessages = ['HIT!', 'GOT HIM!', 'DIRECT HIT!'];
    result.textContent = hitMessages[Math.min(shotNumber - 1, hitMessages.length - 1)];
  }
  
  pf.appendChild(result);
  
  // Remove after animation
  setTimeout(() => result.remove(), 1200);
}

// Make zombie dodge (slide left or right)
function zombieDodge() {
  const dodgeDirection = Math.random() < 0.5 ? 'dodge-left' : 'dodge-right';
  zombieContainer.classList.add(dodgeDirection);
  playSound('whoosh'); // Dodge sound effect
  
  // Add dust cloud effect
  const pf = document.querySelector('.playfield');
  if (pf) {
    const dust = document.createElement('div');
    dust.className = 'dodge-dust';
    dust.textContent = '💨';
    pf.appendChild(dust);
    setTimeout(() => dust.remove(), 800);
  }
  
  setTimeout(() => zombieContainer.classList.remove(dodgeDirection), 800);
}

async function playShot(kind: 'miss' | 'hit' | 'crit', missCountSoFar: number, shotNumber: number) {
  muzzleFlash();
  playSound('gunshot');
  zombieContainer.classList.add('recoil');
  cameraShake(140);
  await sleep(140); // muzzle duration
  zombieContainer.classList.remove('recoil');
  
  if (kind === 'miss') {
    zombieDodge(); // Zombie dodges when shot misses
    setZombieMissCount(missCountSoFar + 1);
    playSound('whiff');
    showShotResultFeedback('miss', shotNumber);
    setPhaseMessage(`Shot ${shotNumber}: MISS!`, 'pulse');
  } else {
    hitSplash(kind === 'crit');
    playSound(kind === 'crit' ? 'crit_hit' : 'hit');
    showShotResultFeedback('hit', shotNumber);
    setPhaseMessage(`Shot ${shotNumber}: HIT!`);
    if (kind === 'crit') {
      document.body.classList.add('flash-green');
      setTimeout(() => document.body.classList.remove('flash-green'), 500);
    }
  }
  await sleep(600); // longer settle time to read feedback
}

function hitSplash(isCrit: boolean) {
  const pf = document.querySelector('.playfield');
  if (!pf) return;
  const splash = document.createElement('div');
  splash.className = 'hit-splash';
  splash.style.background = isCrit ? 'radial-gradient(circle,#3aff6d,#0d3f20)' : 'radial-gradient(circle,#ffdd6d,#663300)';
  pf.appendChild(splash);
  setTimeout(() => splash.remove(), 260);
}

function showShotResult(phase: Phase, bulletType: 'gold' | 'silver') {
  const shotsTaken = getShotsTaken(phase);
  
  if (phase.id === 'fail') {
    setPhaseMessage('💥 OUT OF BULLETS!', 'pulse');
  } else {
    const isCritical = phase.id === 'critical';
    const shotWord = shotsTaken === 1 ? 'shot' : 'shots';
    
    if (isCritical) {
      setPhaseMessage(`🏆 CRITICAL HIT! Down in ${shotsTaken} ${shotWord}!`, 'critical');
    } else {
      setPhaseMessage(`🎯 Zombie down in ${shotsTaken} ${shotWord}!`);
    }
  }
}

async function playZombieReaction(phase: Phase, bulletType: 'gold' | 'silver') {
  if (phase.id === 'fail') {
    zombieContainer.classList.add('leap');
    playSound('zombie-leap');
    document.body.classList.add('flash-red');
    showShotResult(phase, bulletType);
    await sleep(900);
    document.body.classList.remove('flash-red');
    zombieContainer.classList.remove('leap');
    setZombieMissCount(3);
    return;
  }
  
  setZombieMissCount(0);
  showShotResult(phase, bulletType);
}

// --- New Dig Reveal Flow (after shots) ---
// Removed random grave picking; prize rolls now determine which grave glows.

// Formatting helpers
function money(p:number){ return `£${(p/100).toFixed(2)}`; }
function moneyCash(c:number){ return `£${c.toFixed(2)}`; }
// Subtotal now represents RAW (un-multiplied) dig cash total (A+B fix)
function updateSubtotalCash(c:number){ subtotalPanel.textContent = moneyCash(c); }

// Popup removed; using glow effect instead.

// --- Stable grave reading & reveal pipeline ---
type GraveRef = { id: string; el: HTMLElement; pennies: number };

function moneyFromPennies(p: number) { return `£${(p/100).toFixed(2)}`; }

function parsePenniesFromCash(el: HTMLElement): number {
  // Interpret displayed cash (dataset.cash or dataset.mult) directly; convert to pennies for stats only.
  const raw = el.dataset.cash ?? el.dataset.mult ?? el.textContent ?? '0';
  const v = parseFloat(raw);
  return Number.isFinite(v) ? Math.round(v * 100) : 0;
}

function readGraves(): GraveRef[] {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('.grave'));
  return nodes.map((el, i) => {
    if (!el.id) el.id = `grave-${i}`;
    const pennies = parsePenniesFromCash(el);
    return { id: el.id, el, pennies };
  });
}

function pickDistinct<T>(arr: T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

function highlightOne(g: GraveRef, cashAmount: number): Promise<void> {
  g.el.classList.add('glow','lit');
  console.debug('[reveal] highlight', g.id, 'cash=', cashAmount.toFixed(2));
  
  // Special effects for ultra-rare chase prizes!
  const isChase = cashAmount >= 50;
  const isMega = cashAmount >= 100;
  const isLegendary = cashAmount >= 250;
  
  if (isChase) {
    // Track the chase prize hit
    trackChasePrize(cashAmount);
    
    // Mega celebration effects
    document.body.classList.add('edge-glow');
    cameraShake(800);
    if (isMega) {
      playSound('mega-jackpot');
      // Flash screen gold for mega prizes
      document.body.style.background = '#ffd700';
      setTimeout(() => {
        document.body.style.background = '';
        document.body.classList.remove('edge-glow');
      }, 1000);
    } else {
      playSound('chase-hit');
      setTimeout(() => document.body.classList.remove('edge-glow'), 800);
    }
    
    if (isLegendary) {
      // Ultimate celebration for £250!
      setPhaseMessage('🎆 LEGENDARY JACKPOT! £250! 🎆', 'critical');
    } else if (isMega) {
      setPhaseMessage('💎 MEGA JACKPOT! £100+! 💎', 'critical');
    } else {
      setPhaseMessage('🌟 CHASE PRIZE! £50+! 🌟', 'critical');
    }
  }
  
  const pop = document.createElement('div');
  pop.className = `popup-win ${isChase ? 'chase-prize' : ''}`;
  pop.textContent = `+ ${moneyCash(cashAmount)}`;
  g.el.appendChild(pop);
  
  return pop.animate([
    { opacity: 0, transform: 'translate(-50%,0)' },
    { opacity: 1, transform: 'translate(-50%,-22px)' }
  ], { duration: isChase ? 800 : 320, easing: 'ease-out', fill: 'forwards' }).finished
    .then(() => {
      setTimeout(() => pop.remove(), isChase ? 1000 : 250);
    });
}

// New reveal uses raw cash amounts (no per-dig rounding to pennies) to avoid inflation.
async function revealGraves(graves: GraveRef[], digCash: number[]) {
  if (graves.length !== digCash.length) {
    console.error('COUNT MISMATCH', { graves: graves.length, digCashLen: digCash.length, graveIds: graves.map(g=>g.id) });
    throw new Error('graves.length !== digCash.length');
  }
  graveContainer.classList.add('active');
  let runningCash = 0;
  for (let i = 0; i < graves.length; i++) {
    const g = graves[i];
    const c = digCash[i];
    if (!g || typeof c !== 'number' || !Number.isFinite(c)) {
      console.error('BAD MAPPING AT INDEX', { i, g, c });
      throw new Error('Bad mapping index');
    }
    runningCash += c;
    await highlightOne(g, c);
    updateSubtotalCash(runningCash);
    playSound('coin', { pitch: 1 + i * 0.05 });
  }
  graveContainer.classList.remove('active');
}

function cleanupGraveHighlights() {
  document.querySelectorAll('.grave.lit').forEach(el => el.classList.remove('lit'));
  document.querySelectorAll('.popup-win').forEach(el => el.remove());
  document.querySelectorAll('.grave.glow,.grave.highlight,.grave.flicker').forEach(el => el.classList.remove('glow','highlight','flicker'));
  console.debug('[reveal] cleanup complete');
}

// (legacy revealPrize removed in favor of popup animation)

// Bonus overlay removed.

// Update shot info panel to show shots taken
function showShotInfo(phase: Phase, bulletType: 'gold' | 'silver') {
  const shotsTaken = getShotsTaken(phase);
  
  if (phase.id === 'fail') {
    shotInfoEl.textContent = `💥 All 3 shots missed!`;
  } else {
    const shotWord = shotsTaken === 1 ? 'shot' : 'shots';
    const bulletEmoji = bulletType === 'gold' ? '🥇' : '🥈';
    shotInfoEl.textContent = `${bulletEmoji} Hit in ${shotsTaken} ${shotWord}`;
  }
  
  shotInfoEl.classList.add('visible');
  // Auto-hide after 3 seconds
  setTimeout(() => {
    shotInfoEl.classList.remove('visible');
  }, 3000);
}

// Win panel now shows ONLY the summed cash of highlighted graves (no shot/stake context)
function showTotalWin(winCash: number) {
  winPanel.classList.remove('loss');
  winPanel.textContent = `£${winCash.toFixed(2)}`;
  winPanel.classList.add('visible');
  if (winCash > 0) {
    winPanel.classList.add('celebrate');
    setTimeout(() => winPanel.classList.remove('celebrate'), 900);
  } else {
    winPanel.classList.add('loss');
  }
}

function scriptFor(phase: Phase['id']): ('hit'|'miss'|'crit')[] {
  switch (phase) {
    case 'critical': return ['crit'];
    case 'bonus': return ['miss','hit']; // include tease possibility for bonus (gold bullet)
    case 'first': return ['hit'];
    case 'second': return ['miss','hit'];
    case 'third': return ['miss','miss','hit'];
    case 'fail': return ['miss','miss','miss'];
    default: return ['miss','hit'];
  }
}

function toPennies(x:number){ return Math.round(x*100); }
function fromPennies(p:number){ return p/100; }

function rollDigMult(): number { return rollGraveValue(); }

// Unique weighted grave sampling (without replacement) so successive digs glow different graves for clearer feedback.

// A+B minimal fix: compute raw dig cash amounts, apply multiplier once, single rounding at final total.
// Absolute prize mode: grave values are fixed cash amounts (stake no longer scales them)
function computeDigAmountsFromTargets(phase: Phase, stakeCash: number, targets: GraveRef[]) {
  if (phase.id === 'fail') return { phase, digs:0, digCash:[], subtotalCash:0, totalCash:0, winCash:0 };
  
  const digCash = targets.map((t, index) => {
    // Check if we should force a chase prize (debug)
    if (forceChasePrize > 0 && index === 0) {
      const prize = forceChasePrize;
      forceChasePrize = 0; // Reset after use
      console.log(`[DEBUG] Forced chase prize: £${prize}`);
      return prize;
    }
    
    const val = t.el.dataset.mult ? parseFloat(t.el.dataset.mult) : 0; // interpret UI number as cash
    return val;
  });
  
  const subtotalCash = digCash.reduce((a,b)=>a+b,0);
  const totalCash = parseFloat(subtotalCash.toFixed(2));
  return { phase, digs: digCash.length, digCash, subtotalCash, totalCash, winCash: totalCash };
}

async function onShoot() {
  if (busy) return;
  busy = true;
  winPanel.classList.remove('visible');
  shotInfoEl.classList.remove('visible');
  subtotalPanel.textContent = '£0.00';
  // Clear previous glow/highlight state
  cleanupGraveHighlights();
  currentStake = parseFloat(stakeInput.value) || 1;
  
  // 1) Spin bullet chamber
  const bulletType = await spinBulletChamber();
  
  // 2) Store if gold bullet was used
  const hasGoldBullet = bulletType === 'gold';
  
  // 3) Play normal round and track gold kills
  const result = await playNormalRound(hasGoldBullet);
  const killCount = result.killCount;
  const goldKills = result.goldKills; // How many zombies killed with gold bullet
  
  // Reset force flag after use
  if (forceThreeKills) {
    forceThreeKills = false;
    console.log('[DEBUG] Force 3 kills used and reset');
  }
  
  // 4) Check if horde mode should trigger (ANY gold kill triggers bonus!)
  if (goldKills > 0) {
    // HORDE MODE UNLOCKED! Show tier message
    await sleep(800);
    if (goldKills === 3) {
      setPhaseMessage('🎯 PERFECT! 3 GOLD KILLS! MEGA HORDE MODE! 🧟‍♂️🧟‍♀️🧟', 'critical');
    } else if (goldKills === 2) {
      setPhaseMessage('⚡ 2 GOLD KILLS! SUPER HORDE MODE! 🧟‍♂️🧟', 'critical');
    } else {
      setPhaseMessage('💥 GOLD KILL! HORDE MODE UNLOCKED! 🧟', 'critical');
    }
    await sleep(1500);
    await playHordeModeRound(goldKills);
  } else if (hasGoldBullet && killCount > 0) {
    // Had gold bullet but no kills WITH gold were made - show normal prizes
    await sleep(500);
    setPhaseMessage('💔 GOLD BULLET WASTED! No gold kills!', 'pulse');
    await sleep(1000);
    
    // Show normal game prizes now
    const phase = getPhaseFromKillCount(killCount);
    const allGraves = readGraves();
    const targets = pickDistinct(allGraves, phase.digs);
    const payout = computeDigAmountsFromTargets(phase, currentStake, targets);
    await revealGraves(targets, payout.digCash);
    showTotalWin(payout.winCash);
    updateStats(phase, currentStake, payout.winCash, 'silver');
    
    await sleep(1000);
    resetZombiesForNextRound();
  }
  
  shootButton.disabled = false;
  busy = false;
}

// Helper function to get phase from kill count
function getPhaseFromKillCount(killCount: number): Phase {
  let phase: Phase;
  let digs: number;
  
  switch (killCount) {
    case 3:
      digs = Math.floor(Math.random() * (zombieShootConfig.digRanges.threeKills[1] - zombieShootConfig.digRanges.threeKills[0] + 1)) + zombieShootConfig.digRanges.threeKills[0];
      phase = { ...phases.find(p => p.id === 'threeKills')!, digs };
      break;
    case 2:
      digs = Math.floor(Math.random() * (zombieShootConfig.digRanges.twoKills[1] - zombieShootConfig.digRanges.twoKills[0] + 1)) + zombieShootConfig.digRanges.twoKills[0];
      phase = { ...phases.find(p => p.id === 'twoKills')!, digs };
      break;
    case 1:
      digs = Math.floor(Math.random() * (zombieShootConfig.digRanges.oneKill[1] - zombieShootConfig.digRanges.oneKill[0] + 1)) + zombieShootConfig.digRanges.oneKill[0];
      phase = { ...phases.find(p => p.id === 'oneKill')!, digs };
      break;
    default: // 0 kills
      phase = { ...phases.find(p => p.id === 'fail')! };
      break;
  }
  
  return phase;
}

// Normal mode: Shoot at 3 zombies (LEFT TO RIGHT)
async function playNormalRound(hasGoldBullet: boolean = false): Promise<{ killCount: number; goldKills: number }> {
  // Reset all zombie states from previous round
  [zombie1, zombie2, zombie3].forEach(z => {
    z.classList.remove('target', 'hit', 'dead', 'dodge', 'aiming');
    z.style.opacity = '1';
  });
  
  setPhaseMessage('TARGET THE ZOMBIES...', 'pulse');
  await sleep(800);
  
  // Array of zombies in LEFT TO RIGHT order
  const zombiesLeftToRight = [zombie1, zombie2, zombie3];
  
  // Track kills
  let killCount = 0;
  let goldKills = 0; // NEW: Track how many were killed WITH gold bullet
  const zombiesHit: boolean[] = [];
  
  // Show each shot sequentially - LEFT TO RIGHT
  // IMPORTANT: Determine hit/miss ONE AT A TIME, not all at once!
  for (let i = 0; i < 3; i++) {
    const zombieEl = zombiesLeftToRight[i];
    const position = ['LEFT', 'CENTER', 'RIGHT'][i];
    
    // Roll hit/miss for THIS zombie right now (not pre-determined)
    // Debug: Force all hits if forceThreeKills is true
    const hit = forceThreeKills ? true : Math.random() < zombieShootConfig.hitProbability;
    zombiesHit.push(hit);
    if (hit) {
      killCount++;
      if (hasGoldBullet) goldKills++; // Count as gold kill if using gold bullet
    }
    
    // Clear message and prepare for this zombie
    setPhaseMessage(`TARGETING ${position} ZOMBIE...`);
    await sleep(50);
    
    // Fire at this specific zombie (only this one reacts!)
    await playShotAtZombie(zombieEl, hit, i + 1);
    
    // Show result of this shot
    if (hit) {
      const killType = hasGoldBullet ? '⭐ GOLD KILL!' : 'KILLED!';
      setPhaseMessage(`${position} ZOMBIE: ${killType} 💀`, 'critical');
    } else {
      setPhaseMessage(`${position} ZOMBIE: ESCAPED! 👻`, 'pulse');
    }
    
    // Pause before next zombie
    await sleep(50);
  }
  
  // Determine phase based on kill count
  const phase = getPhaseFromKillCount(killCount);
  
  // Show final result message
  await sleep(300);
  if (killCount === 0) {
    setPhaseMessage('💥 ALL ZOMBIES ESCAPED!', 'pulse');
    document.body.classList.add('flash-red');
    await sleep(800);
    document.body.classList.remove('flash-red');
  } else if (killCount === 3) {
    setPhaseMessage('🎯 PERFECT! ALL 3 ZOMBIES DOWN!', 'critical');
    document.body.classList.add('flash-green');
    await sleep(800);
    document.body.classList.remove('flash-green');
  } else {
    setPhaseMessage(`💀 ${killCount} ZOMBIE${killCount > 1 ? 'S' : ''} KILLED!`);
    await sleep(600);
  }
  
  // Update shot info display
  shotInfoEl.textContent = `${killCount}/3 zombies killed`;
  shotInfoEl.classList.add('visible');
  
  if (phase.id === 'fail') {
    // Record loss stats and show zero win
    showTotalWin(0);
    updateStats(phase, currentStake, 0, 'silver');
    return { killCount: 0, goldKills: 0 };
  }
  
  // If no gold kills, show prizes now
  if (goldKills === 0) {
    // Reveal prizes
    await sleep(500);
    const allGraves = readGraves();
    const targets = pickDistinct(allGraves, phase.digs);
    const payout = computeDigAmountsFromTargets(phase, currentStake, targets);
    await revealGraves(targets, payout.digCash);
    showTotalWin(payout.winCash);
    updateStats(phase, currentStake, payout.winCash, 'silver');
    
    // Reset zombies for next round - bring them back!
    await sleep(1000);
    resetZombiesForNextRound();
  }
  
  return { killCount, goldKills };
}

// Horde mode: Graves turn into zombies, shoot as many as possible
// goldKills determines the tier and multiplier
async function playHordeModeRound(goldKills: number = 3) {
  // Determine tier based on gold kills
  let tierMessage: string;
  let tierColor: string;
  if (goldKills === 3) {
    tierMessage = '🧟 MEGA HORDE MODE! 🧟‍♂️🧟‍♀️🧟';
    tierColor = 'gold';
  } else if (goldKills === 2) {
    tierMessage = '🧟 SUPER HORDE MODE! 🧟‍♂️🧟';
    tierColor = 'silver';
  } else {
    tierMessage = '🧟 HORDE MODE! 🧟';
    tierColor = 'bronze';
  }
  
  setPhaseMessage(tierMessage, 'critical');
  await sleep(1000);
  
  // Switch to bonus grave prizes for horde mode
  buildGravesWithPrizes(BONUS_GRAVE_PRIZES);
  
  // Transform graves into zombies
  await transformGravesToZombies();
  
  // Get tier configuration from game logic
  const hordeResult = playHordeMode(goldKills);
  const totalBullets = hordeResult.totalBullets;
  const zombiesSpawned = hordeResult.zombiesSpawned;
  const multiplier = hordeResult.multiplier;
  
  setPhaseMessage(`${totalBullets} BULLETS! ${multiplier}x PRIZES! SHOOT THE HORDE!`, 'pulse');
  await sleep(800);
  
  // Use the guaranteed kills from the tier (zombiesSpawned is the target)
  const guaranteedKills = zombiesSpawned;
  
  let zombiesKilled = 0;
  const hitGraves: HTMLElement[] = []; // Track which graves were hit
  const prizeAmounts: number[] = []; // Track prize for each hit
  
  // Slower shooting sequence for horde mode - shoot at individual graves/zombies
  for (let i = 0; i < totalBullets && zombiesKilled < zombiesSpawned; i++) {
    // Force hits until we reach guaranteed kills, then use normal probability
    const forceHit = zombiesKilled < guaranteedKills && i < totalBullets;
    const hit = forceHit || Math.random() < zombieShootConfig.hitProbability;
    
    if (hit) {
      zombiesKilled++;
      
      // Find a grave that hasn't been hit yet
      const allGraves = Array.from(document.querySelectorAll<HTMLElement>('.grave.zombie-transform'));
      const availableGraves = allGraves.filter(g => !g.classList.contains('horde-killed'));
      
      if (availableGraves.length > 0) {
        const targetGrave = availableGraves[Math.floor(Math.random() * availableGraves.length)];
        const prizeValue = parseFloat(targetGrave.dataset.cash || '0');
        
        // Mark this grave/zombie as killed
        targetGrave.classList.add('horde-killed');
        hitGraves.push(targetGrave);
        
        // Apply tier multiplier to prize
        const basePrize = prizeValue;
        const multipliedPrize = basePrize * multiplier;
        prizeAmounts.push(multipliedPrize);
        
        // Visual feedback - zombie dies, shows multiplied prize
        playSound('hit');
        createHordeZombieKillEffect(targetGrave, multipliedPrize);
        await sleep(250);
      }
    } else {
      // Miss effect
      playSound('whiff');
      await sleep(180);
    }
  }
  
  // Show result
  await sleep(500);
  const killPercent = Math.round((zombiesKilled / zombiesSpawned) * 100);
  setPhaseMessage(`💀 ${zombiesKilled}/${zombiesSpawned} ZOMBIES ELIMINATED! (${killPercent}%)`, 'critical');
  
  await sleep(1000);
  
  // Calculate total win
  const totalWin = prizeAmounts.reduce((a, b) => a + b, 0);
  
  // Show big win popup
  showHordeModeWinPopup(zombiesKilled, totalWin, goldKills, multiplier);
  
  await sleep(2000);
  
  // Transform zombies back to graves
  await transformZombiesToGraves();
  
  // Build normal graves again
  buildGravesWithPrizes(STATIC_GRAVE_PRIZES);
  
  // Update stats
  const phase = {
    id: 'horde',
    label: 'HORDE MODE',
    digs: zombiesKilled,
    zombiesKilled,
    multiplier: 1,
    probability: 0
  };
  
  // Update shot info
  shotInfoEl.textContent = `🥇 HORDE: ${zombiesKilled}/${zombiesSpawned} kills`;
  shotInfoEl.classList.add('visible');
  
  showTotalWin(totalWin);
  updateStats(phase, currentStake, totalWin, 'gold');
  
  // Reset zombies for next round
  await sleep(1000);
  resetZombiesForNextRound();
}

// Reset zombies back to their starting state for the next round
function resetZombiesForNextRound() {
  console.log('[RESET] Bringing zombies back for next round');
  
  [zombie1, zombie2, zombie3].forEach((z, idx) => {
    // Remove all state classes
    z.classList.remove('target', 'hit', 'dead', 'dodge', 'aiming');
    
    // Reset opacity and visibility
    z.style.opacity = '1';
    z.style.visibility = 'visible';
    
    // Add a subtle "respawn" animation
    z.style.animation = 'zombieRespawn 0.5s ease-out';
    setTimeout(() => {
      z.style.animation = '';
    }, 500);
    
    console.log(`[RESET] Zombie ${idx + 1} reset`);
  });
}

// Shoot at a single zombie (ONE CHANCE per zombie)
// Only THIS zombie reacts - others stay frozen
async function playShotAtZombie(zombieEl: HTMLElement, hit: boolean, zombieNumber: number) {
  console.log(`[SHOOT] Starting shot at zombie ${zombieNumber}, hit=${hit}`);
  
  // CRITICAL: Remove ALL animation classes from ALL zombies first
  [zombie1, zombie2, zombie3].forEach((z, idx) => {
    z.classList.remove('target', 'aiming', 'dodge');
    // Force reflow to ensure animations reset
    void z.offsetWidth;
    console.log(`[CLEAR] Cleared zombie ${idx + 1} classes`);
  });
  
  // Small delay to ensure classes are fully cleared
  await sleep(25);
  
  // Highlight ONLY THIS zombie as the target
  zombieEl.classList.add('target', 'aiming');
  console.log(`[TARGET] Added aiming to zombie ${zombieNumber}`);
  playSound('target-lock');
  
  // Aiming time - build tension (only target zombie pulses)
  await sleep(250);
  
  // FIRE!
  muzzleFlash();
  playSound('gunshot');
  cameraShake(140);
  
  await sleep(70);
  
  // Remove aiming state
  zombieEl.classList.remove('aiming');
  
  if (hit) {
    // HIT - THIS zombie dies (others stay still)
    console.log(`[HIT] Zombie ${zombieNumber} killed`);
    zombieEl.classList.add('hit', 'dead');
    zombieEl.classList.remove('target');
    playSound('hit');
    createZombieDeathEffect(zombieEl);
    
    // Success feedback positioned at THIS zombie using its actual position
    const rect = zombieEl.getBoundingClientRect();
    const playfield = document.querySelector('.playfield')!.getBoundingClientRect();
    
    const hitText = document.createElement('div');
    hitText.className = 'zombie-hit-text';
    hitText.textContent = '💀 KILL!';
    hitText.style.position = 'absolute';
    hitText.style.left = (rect.left + rect.width / 2 - playfield.left) + 'px';
    hitText.style.top = (rect.top + rect.height / 2 - playfield.top) + 'px';
    document.querySelector('.playfield')?.appendChild(hitText);
    setTimeout(() => hitText.remove(), 500);
    
  } else {
    // MISS - THIS zombie dodges (others stay still)
    console.log(`[MISS] Zombie ${zombieNumber} dodging`);
    zombieEl.classList.remove('target');
    
    // Force reflow before adding dodge
    void zombieEl.offsetWidth;
    
    zombieEl.classList.add('dodge');
    playSound('whiff');
    
    // Get zombie's actual position on screen
    const rect = zombieEl.getBoundingClientRect();
    const playfield = document.querySelector('.playfield')!.getBoundingClientRect();
    
    // Add dodge dust effect above zombie's head
    const dust = document.createElement('div');
    dust.className = 'dodge-dust';
    dust.textContent = '💨';
    dust.style.position = 'absolute';
    dust.style.left = (rect.left + rect.width / 2 - playfield.left) + 'px';
    dust.style.top = (rect.top - 30 - playfield.top) + 'px';
    dust.style.transform = 'translateX(-50%)';
    dust.style.fontSize = '32px';
    dust.style.pointerEvents = 'none';
    dust.style.zIndex = '15';
    document.querySelector('.playfield')?.appendChild(dust);
    setTimeout(() => dust.remove(), 400);
    
    // Miss feedback positioned at THIS zombie
    const missText = document.createElement('div');
    missText.className = 'zombie-miss-text';
    missText.textContent = '👻 MISS!';
    missText.style.position = 'absolute';
    missText.style.left = (rect.left + rect.width / 2 - playfield.left) + 'px';
    missText.style.top = (rect.top + rect.height / 2 - playfield.top) + 'px';
    document.querySelector('.playfield')?.appendChild(missText);
    setTimeout(() => missText.remove(), 500);
    
    // Wait for dodge animation to complete
    await sleep(300);
    zombieEl.classList.remove('dodge');
    console.log(`[MISS] Zombie ${zombieNumber} dodge complete`);
  }
  
  // Brief pause before moving to next zombie - RAPID FIRE!
  await sleep(10);
  console.log(`[SHOOT] Finished shot at zombie ${zombieNumber}`);
}

// Transform graves into zombies for horde mode
async function transformGravesToZombies() {
  const graves = document.querySelectorAll('.grave');
  
  for (let i = 0; i < graves.length; i++) {
    const grave = graves[i] as HTMLElement;
    
    // Stagger the transformation
    setTimeout(() => {
      grave.classList.add('zombie-transform');
      grave.innerHTML = '<span class="zombie-emoji">🧟</span>';
      playSound('zombie-rise');
    }, i * 80);
  }
  
  await sleep(graves.length * 80 + 500);
}

// Transform zombies back to graves
async function transformZombiesToGraves() {
  const graves = document.querySelectorAll('.grave');
  
  for (let i = 0; i < graves.length; i++) {
    const grave = graves[i] as HTMLElement;
    const cashValue = parseFloat(grave.dataset.cash || '0');
    
    setTimeout(() => {
      grave.classList.remove('zombie-transform');
      grave.innerHTML = `<span class="grave-value">${formatPrize(cashValue)}</span>`;
    }, i * 60);
  }
  
  await sleep(graves.length * 60 + 300);
}

// Create death effect for individual zombie
function createZombieDeathEffect(zombieEl: HTMLElement) {
  const rect = zombieEl.getBoundingClientRect();
  const pf = document.querySelector('.playfield');
  if (!pf) return;
  
  const splash = document.createElement('div');
  splash.className = 'zombie-death-effect';
  splash.textContent = '💀💥';
  splash.style.left = rect.left + rect.width / 2 + 'px';
  splash.style.top = rect.top + rect.height / 2 + 'px';
  pf.appendChild(splash);
  
  setTimeout(() => splash.remove(), 800);
}

// Create hit effect for horde mode
// Create zombie kill effect - shows the zombie dying and the prize won
function createHordeZombieKillEffect(graveEl: HTMLElement, prizeValue: number) {
  // Flash the grave/zombie red for hit feedback
  graveEl.style.filter = 'brightness(2) saturate(2) hue-rotate(320deg)';
  
  setTimeout(() => {
    graveEl.style.filter = '';
    graveEl.classList.add('horde-killed-state');
  }, 100);
  
  // Show the prize amount floating up from the grave
  const rect = graveEl.getBoundingClientRect();
  const graveContainer = document.querySelector('.grave-container') as HTMLElement;
  if (!graveContainer) return;
  
  const containerRect = graveContainer.getBoundingClientRect();
  
  const prizeText = document.createElement('div');
  prizeText.className = 'horde-prize-float';
  prizeText.textContent = `£${prizeValue.toFixed(2)}`;
  prizeText.style.position = 'absolute';
  prizeText.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
  prizeText.style.top = `${rect.top - containerRect.top + rect.height / 2}px`;
  prizeText.style.transform = 'translate(-50%, -50%)';
  prizeText.style.fontSize = '1.5rem';
  prizeText.style.fontWeight = 'bold';
  prizeText.style.color = '#FFD700';
  prizeText.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(255,215,0,0.8)';
  prizeText.style.animation = 'floatUpAndFade 1.5s ease-out';
  prizeText.style.pointerEvents = 'none';
  prizeText.style.zIndex = '2000';
  
  graveContainer.appendChild(prizeText);
  setTimeout(() => prizeText.remove(), 1500);
}

// Show horde mode win popup
function showHordeModeWinPopup(zombiesKilled: number, totalWin: number, goldKills: number, multiplier: number) {
  let tierTitle = '';
  if (goldKills === 3) {
    tierTitle = '🥇 MEGA HORDE CLEARED! 🥇';
  } else if (goldKills === 2) {
    tierTitle = '🥈 SUPER HORDE CLEARED! 🥈';
  } else {
    tierTitle = '🥉 HORDE CLEARED! 🥉';
  }
  
  const popup = document.createElement('div');
  popup.className = 'horde-win-popup';
  popup.innerHTML = `
    <div class="horde-win-content">
      <h2>${tierTitle}</h2>
      <div class="horde-tier-info">
        <p class="gold-kills">${goldKills} Gold Kill${goldKills > 1 ? 's' : ''} = ${multiplier}x Multiplier!</p>
      </div>
      <div class="horde-win-stats">
        <p class="zombies-killed">${zombiesKilled} Zombies Eliminated</p>
        <p class="total-win">£${totalWin.toFixed(2)}</p>
      </div>
      <button class="horde-close-btn">CONTINUE</button>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Close button handler
  const closeBtn = popup.querySelector('.horde-close-btn') as HTMLButtonElement;
  closeBtn.addEventListener('click', () => {
    popup.style.opacity = '0';
    setTimeout(() => popup.remove(), 300);
  });
}

function createHordeHitEffect() {
  const pf = document.querySelector('.playfield');
  if (!pf) return;
  
  const splash = document.createElement('div');
  splash.className = 'horde-hit-flash';
  pf.appendChild(splash);
  
  setTimeout(() => splash.remove(), 200);
}

// Debug functions
function triggerBonusRound() {
  if (busy) {
    console.log('[DEBUG] Cannot trigger bonus - game is busy');
    return;
  }
  forceGoldBullet = true;
  forceThreeKills = true;
  console.log('[DEBUG] Next shot will be GOLD BULLET + 3 KILLS (bonus round guaranteed)');
  setPhaseMessage('🎯 DEBUG: Bonus round loaded!', 'critical');
  setTimeout(() => setPhaseMessage('Ready'), 2000);
}

// Expose debug function globally
(window as any).triggerBonus = triggerBonusRound;

function forceChasePrizeDebug(amount: number) {
  if (busy) {
    console.log('[DEBUG] Cannot force chase prize - game is busy');
    return;
  }
  forceChasePrize = amount;
  console.log(`[DEBUG] Next grave will contain £${amount} chase prize!`);
  setPhaseMessage(`💎 DEBUG: £${amount} loaded!`, 'critical');
  setTimeout(() => setPhaseMessage('Ready'), 2000);
}

function toggleDebugMode() {
  debugMode = !debugMode;
  console.log(`[DEBUG] Debug mode ${debugMode ? 'ENABLED' : 'DISABLED'}`);
  updateDebugDisplay();
}

function updateDebugDisplay() {
  let debugPanel = document.getElementById('debugPanel');
  if (debugMode && !debugPanel) {
    // Create debug panel
    debugPanel = document.createElement('div');
    debugPanel.id = 'debugPanel';
    debugPanel.className = 'debug-panel';
    debugPanel.innerHTML = `
      <h4>🔧 DEBUG MODE</h4>
      <button id="triggerBonusBtn">Force Gold Bullet</button>
      <button id="force50Btn">Force £50</button>
      <button id="force100Btn">Force £100</button>
      <button id="force250Btn">Force £250</button>
      <button id="toggleDebugBtn">Disable Debug</button>
      <p><small>Hotkeys: B=Bonus, 1=£50, 2=£100, 3=£250</small></p>
    `;
    document.body.appendChild(debugPanel);
    
    // Wire debug buttons
    document.getElementById('triggerBonusBtn')!.addEventListener('click', triggerBonusRound);
    document.getElementById('force50Btn')!.addEventListener('click', () => forceChasePrizeDebug(50));
    document.getElementById('force100Btn')!.addEventListener('click', () => forceChasePrizeDebug(100));
    document.getElementById('force250Btn')!.addEventListener('click', () => forceChasePrizeDebug(250));
    document.getElementById('toggleDebugBtn')!.addEventListener('click', toggleDebugMode);
  } else if (!debugMode && debugPanel) {
    // Remove debug panel
    debugPanel.remove();
  }
}

function wireEvents() { 
  shootButton.addEventListener('click', () => onShoot());
  resetStatsBtn.addEventListener('click', resetStats);
  
  // Debug bonus button
  const debugBonusBtn = document.getElementById('debugBonusBtn') as HTMLButtonElement;
  if (debugBonusBtn) {
    debugBonusBtn.addEventListener('click', () => {
      triggerBonusRound();
    });
  }
  
  // Debug keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyD' && e.ctrlKey) {
      e.preventDefault();
      toggleDebugMode();
    } else if (debugMode && !busy) {
      if (e.code === 'KeyB') {
        e.preventDefault();
        triggerBonusRound();
      } else if (e.code === 'Digit1') {
        e.preventDefault();
        forceChasePrizeDebug(50);
      } else if (e.code === 'Digit2') {
        e.preventDefault();
        forceChasePrizeDebug(100);
      } else if (e.code === 'Digit3') {
        e.preventDefault();
        forceChasePrizeDebug(250);
      }
    }
  });
}

// Bullet chamber configuration & spin logic
const bulletConfig = {
  // Adjusted down slightly to 20% to balance increased bonus EV
  goldProbability: 0.20
};

async function spinBulletChamber(): Promise<'gold'|'silver'> {
  // Visual spin
  bulletResultEl.textContent = '';
  bulletResultEl.className = 'bullet-result';
  bulletWheelEl.classList.add('spinning');
  shootButton.disabled = true;
  setPhaseMessage('SPINNING...', 'pulse');
  await sleep(debugMode && forceGoldBullet ? 400 : 900); // faster spin in debug
  bulletWheelEl.classList.remove('spinning');
  
  // Determine bullet (check debug override first)
  let type: 'gold'|'silver';
  if (forceGoldBullet) {
    type = 'gold';
    forceGoldBullet = false; // Reset after use
    console.log('[DEBUG] Forced Gold bullet!');
  } else {
    const r = Math.random();
    type = r < bulletConfig.goldProbability ? 'gold' : 'silver';
  }
  
  bulletResultEl.textContent = type === 'gold' ? 'GOLD' : 'SILVER';
  bulletResultEl.classList.add(type);
  setPhaseMessage(type === 'gold' ? 'GOLD BULLET!' : 'Silver Bullet');
  await sleep(350); // brief pause before shots start
  return type;
}

function init() {
  initDomRefs();
  buildGravesWithPrizes(STATIC_GRAVE_PRIZES);
  setZombieMissCount(0);
  wireEvents();
  setPhaseMessage('Ready');
  renderStats();
  console.log('Grave Fortunes UI ready.');
  console.log('🔧 DEBUG: Press Ctrl+D to enable debug mode');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for potential debugging
export { onShoot };
