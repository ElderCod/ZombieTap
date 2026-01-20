"use strict";
(() => {
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
    // NEW: Tiered bonus system - more gold kills = better rewards!
    hordeTiers: {
      oneGoldKill: { zombies: [4, 5], multiplier: 1 },
      // 1 gold: 4-5 zombies, 1x prizes
      twoGoldKills: { zombies: [6, 7], multiplier: 2 },
      // 2 gold: 6-7 zombies, 2x prizes
      threeGoldKills: { zombies: [8, 10], multiplier: 3 }
      // 3 gold: 8-10 zombies, 3x prizes
    },
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
  function playHordeMode(goldKills = 3, cfg = zombieShootConfig, rng = Math.random) {
    let tier;
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
    const zombiesSpawned = randInt(tier.zombies[0], tier.zombies[1], rng);
    const multiplier = tier.multiplier;
    const shots = [];
    let zombiesKilled = 0;
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
      zombiesKilled,
      multiplier
      // Apply tier multiplier
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
  (function validatePhaseProbabilities(p) {
    const total = p.reduce((a, b) => a + b.probability, 0);
    if (Math.abs(total - 1) > 1e-9) {
      console.warn(`[GraveFortunes] Phase probabilities sum to ${total}, expected 1.0`);
    }
  })(phases);
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

  // src/app.ts
  var STATIC_GRAVE_PRIZES = [0.2, 0.3, 0.5, 0.8, 1, 1.5, 2, 2.5, 4, 5, 8, 10, 25];
  var BONUS_GRAVE_PRIZES = [1, 1.5, 2, 2.5, 4, 5, 8, 10, 25, 50, 100, 250];
  var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  var audioContext = null;
  function getAudioContext() {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    return audioContext;
  }
  function playSound(name, opts = {}) {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      switch (name) {
        case "gunshot":
          playTone(ctx, 80, 0.05, "square", 0.5, now);
          playTone(ctx, 40, 0.1, "sawtooth", 0.3, now + 0.02);
          break;
        case "hit":
          playTone(ctx, 600, 0.15, "sine", 0.3, now);
          playTone(ctx, 800, 0.1, "sine", 0.2, now + 0.05);
          break;
        case "whiff":
          playTone(ctx, 200, 0.2, "sawtooth", 0.15, now, -100);
          break;
        case "target-lock":
          playTone(ctx, 800, 0.05, "sine", 0.2, now);
          break;
        case "coin":
          const pitch = opts.pitch || 1;
          playTone(ctx, 800 * pitch, 0.1, "sine", 0.15, now);
          break;
        case "zombie-rise":
          playTone(ctx, 100, 0.3, "triangle", 0.2, now, 50);
          break;
        case "chase-hit":
          playTone(ctx, 1e3, 0.1, "sine", 0.3, now);
          playTone(ctx, 1200, 0.1, "sine", 0.3, now + 0.08);
          playTone(ctx, 1500, 0.15, "sine", 0.35, now + 0.16);
          break;
        case "mega-jackpot":
          playTone(ctx, 800, 0.15, "sine", 0.4, now);
          playTone(ctx, 1e3, 0.15, "sine", 0.4, now + 0.1);
          playTone(ctx, 1200, 0.2, "sine", 0.5, now + 0.2);
          playTone(ctx, 1500, 0.25, "sine", 0.5, now + 0.3);
          break;
        default:
          playTone(ctx, 440, 0.1, "sine", 0.2, now);
      }
    } catch (e) {
      console.log(`[sound] ${name}` + (opts.pitch ? ` pitch=${opts.pitch.toFixed(2)}` : ""));
    }
  }
  function playTone(ctx, freq, duration, type, volume, startTime, freqSlide = 0) {
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
  function cameraShake(duration = 200) {
    const root = document.getElementById("gameRoot");
    if (!root) return;
    const start = performance.now();
    function frame(now) {
      const t = now - start;
      if (t < duration && root) {
        const x = Math.random() * 8 - 4;
        const y = Math.random() * 8 - 4;
        root.style.transform = `translate(${x}px, ${y}px)`;
        requestAnimationFrame(frame);
      } else if (root) {
        root.style.transform = "translate(0,0)";
      }
    }
    requestAnimationFrame(frame);
  }
  var graveContainer;
  var zombieContainer;
  var zombie1;
  var zombie2;
  var zombie3;
  var shootButton;
  var textPanel;
  var stakeInput;
  var winPanel;
  var subtotalPanel;
  var statsPanel;
  var resetStatsBtn;
  var bulletChamberEl;
  var bulletWheelEl;
  var bulletResultEl;
  var shotInfoEl;
  var misses = 0;
  var busy = false;
  var currentStake = 1;
  var debugMode = false;
  var forceGoldBullet = false;
  var forceThreeKills = false;
  var forceChasePrize = 0;
  function initDomRefs() {
    graveContainer = document.getElementById("graveContainer");
    zombieContainer = document.getElementById("zombieContainer");
    zombie1 = document.getElementById("zombie1");
    zombie2 = document.getElementById("zombie2");
    zombie3 = document.getElementById("zombie3");
    [zombie1, zombie2, zombie3].forEach((z) => {
      z.classList.remove("target", "hit", "dead", "dodge", "aiming");
    });
    shootButton = document.getElementById("shootButton");
    textPanel = document.getElementById("textPanel");
    stakeInput = document.getElementById("stakeInput");
    winPanel = document.getElementById("winPanel");
    subtotalPanel = document.getElementById("subtotalPanel");
    statsPanel = document.getElementById("statsPanel");
    resetStatsBtn = document.getElementById("resetStatsBtn");
    bulletChamberEl = document.getElementById("bulletChamber");
    bulletWheelEl = document.getElementById("bulletWheel");
    bulletResultEl = document.getElementById("bulletResult");
    shotInfoEl = document.createElement("div");
    shotInfoEl.id = "shotInfo";
    shotInfoEl.className = "shot-info";
    document.querySelector(".hud")?.appendChild(shotInfoEl);
  }
  var stats = {
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
    const rtpSession = stake > 0 ? win / stake * 100 : 0;
    document.getElementById("statRounds").textContent = String(stats.rounds);
    document.getElementById("statStake").textContent = `\xA3${stake.toFixed(2)}`;
    document.getElementById("statWin").textContent = `\xA3${win.toFixed(2)}`;
    document.getElementById("statNet").textContent = `\xA3${net.toFixed(2)}`;
    document.getElementById("statRTP").textContent = `${rtpSession.toFixed(2)}%`;
    document.getElementById("statRTPTheo").textContent = `~27%`;
    document.getElementById("statWins").textContent = String(stats.wins);
    document.getElementById("statLosses").textContent = String(stats.losses);
    document.getElementById("statCritical").textContent = String(stats.critical);
    document.getElementById("statFails").textContent = String(stats.fails);
    const gb = document.getElementById("statGoldBullets");
    if (gb) gb.textContent = String(stats.goldBullets);
    const tz = document.getElementById("statTeases");
    if (tz) tz.textContent = String(stats.teases);
    const winStreak = document.getElementById("statWinStreak");
    if (winStreak) winStreak.textContent = `${stats.currentWinStreak} (Best: ${stats.bestWinStreak})`;
    const lossStreak = document.getElementById("statLossStreak");
    if (lossStreak) lossStreak.textContent = `${stats.currentLossStreak} (Best: ${stats.bestLossStreak})`;
    const chase = document.getElementById("statChase");
    if (chase) chase.textContent = `${stats.chaseHits} / ${stats.megaHits} / ${stats.legendaryHits}`;
    ;
  }
  function updateStats(phase, stakeCash, winCash, bulletType) {
    stats.rounds += 1;
    stats.stakePennies += toPennies(stakeCash);
    stats.winPennies += toPennies(winCash);
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
    if (phase.id === "critical") stats.critical += 1;
    if (phase.id === "fail") stats.fails += 1;
    if (bulletType === "gold") stats.goldBullets += 1;
    if (bulletType === "gold" && phase.id === "fail") stats.teases += 1;
    renderStats();
  }
  function trackChasePrize(amount) {
    if (amount >= 250) stats.legendaryHits += 1;
    if (amount >= 100) stats.megaHits += 1;
    if (amount >= 50) stats.chaseHits += 1;
  }
  function setPhaseMessage(msg, cls = "") {
    textPanel.textContent = msg;
    textPanel.classList.remove("pulse", "critical");
    if (cls) textPanel.classList.add(cls);
  }
  var approachScales = [1, 1.12, 1.28, 1.45];
  function setZombieMissCount(n) {
    misses = n;
    const s = approachScales[Math.min(n, approachScales.length - 1)];
    zombieContainer.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  function buildGravesWithPrizes(prizes) {
    graveContainer.innerHTML = "";
    const radiusPct = 38;
    const centerX = 50;
    const centerY = 50;
    prizes.forEach((cashValue, i) => {
      const angle = i / prizes.length * Math.PI * 2 - Math.PI / 2;
      const x = centerX + radiusPct * Math.cos(angle);
      const y = centerY + radiusPct * Math.sin(angle);
      const g = document.createElement("div");
      g.className = "grave";
      g.id = `grave-${i}`;
      g.dataset.cash = String(cashValue);
      g.dataset.mult = String(cashValue);
      g.style.left = x + "%";
      g.style.top = y + "%";
      g.innerHTML = `<span class="grave-value">${formatPrize(cashValue)}</span>`;
      graveContainer.appendChild(g);
    });
  }
  function formatPrize(mult) {
    if (mult >= 1) return mult.toFixed(2);
    return mult.toFixed(2);
  }
  function muzzleFlash() {
    const pf = document.querySelector(".playfield");
    if (!pf) return;
    const flash = document.createElement("div");
    flash.className = "muzzle-flash";
    pf.appendChild(flash);
    setTimeout(() => flash.remove(), 220);
  }
  function moneyCash(c) {
    return `\xA3${c.toFixed(2)}`;
  }
  function updateSubtotalCash(c) {
    subtotalPanel.textContent = moneyCash(c);
  }
  function parsePenniesFromCash(el) {
    const raw = el.dataset.cash ?? el.dataset.mult ?? el.textContent ?? "0";
    const v = parseFloat(raw);
    return Number.isFinite(v) ? Math.round(v * 100) : 0;
  }
  function readGraves() {
    const nodes = Array.from(document.querySelectorAll(".grave"));
    return nodes.map((el, i) => {
      if (!el.id) el.id = `grave-${i}`;
      const pennies = parsePenniesFromCash(el);
      return { id: el.id, el, pennies };
    });
  }
  function pickDistinct(arr, n) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, Math.min(n, a.length));
  }
  function highlightOne(g, cashAmount) {
    g.el.classList.add("glow", "lit");
    console.debug("[reveal] highlight", g.id, "cash=", cashAmount.toFixed(2));
    const isChase = cashAmount >= 50;
    const isMega = cashAmount >= 100;
    const isLegendary = cashAmount >= 250;
    if (isChase) {
      trackChasePrize(cashAmount);
      document.body.classList.add("edge-glow");
      cameraShake(800);
      if (isMega) {
        playSound("mega-jackpot");
        document.body.style.background = "#ffd700";
        setTimeout(() => {
          document.body.style.background = "";
          document.body.classList.remove("edge-glow");
        }, 1e3);
      } else {
        playSound("chase-hit");
        setTimeout(() => document.body.classList.remove("edge-glow"), 800);
      }
      if (isLegendary) {
        setPhaseMessage("\u{1F386} LEGENDARY JACKPOT! \xA3250! \u{1F386}", "critical");
      } else if (isMega) {
        setPhaseMessage("\u{1F48E} MEGA JACKPOT! \xA3100+! \u{1F48E}", "critical");
      } else {
        setPhaseMessage("\u{1F31F} CHASE PRIZE! \xA350+! \u{1F31F}", "critical");
      }
    }
    const pop = document.createElement("div");
    pop.className = `popup-win ${isChase ? "chase-prize" : ""}`;
    pop.textContent = `+ ${moneyCash(cashAmount)}`;
    g.el.appendChild(pop);
    return pop.animate([
      { opacity: 0, transform: "translate(-50%,0)" },
      { opacity: 1, transform: "translate(-50%,-22px)" }
    ], { duration: isChase ? 800 : 320, easing: "ease-out", fill: "forwards" }).finished.then(() => {
      setTimeout(() => pop.remove(), isChase ? 1e3 : 250);
    });
  }
  async function revealGraves(graves, digCash) {
    if (graves.length !== digCash.length) {
      console.error("COUNT MISMATCH", { graves: graves.length, digCashLen: digCash.length, graveIds: graves.map((g) => g.id) });
      throw new Error("graves.length !== digCash.length");
    }
    graveContainer.classList.add("active");
    let runningCash = 0;
    for (let i = 0; i < graves.length; i++) {
      const g = graves[i];
      const c = digCash[i];
      if (!g || typeof c !== "number" || !Number.isFinite(c)) {
        console.error("BAD MAPPING AT INDEX", { i, g, c });
        throw new Error("Bad mapping index");
      }
      runningCash += c;
      await highlightOne(g, c);
      updateSubtotalCash(runningCash);
      playSound("coin", { pitch: 1 + i * 0.05 });
    }
    graveContainer.classList.remove("active");
  }
  function cleanupGraveHighlights() {
    document.querySelectorAll(".grave.lit").forEach((el) => el.classList.remove("lit"));
    document.querySelectorAll(".popup-win").forEach((el) => el.remove());
    document.querySelectorAll(".grave.glow,.grave.highlight,.grave.flicker").forEach((el) => el.classList.remove("glow", "highlight", "flicker"));
    console.debug("[reveal] cleanup complete");
  }
  function showTotalWin(winCash) {
    winPanel.classList.remove("loss");
    winPanel.textContent = `\xA3${winCash.toFixed(2)}`;
    winPanel.classList.add("visible");
    if (winCash > 0) {
      winPanel.classList.add("celebrate");
      setTimeout(() => winPanel.classList.remove("celebrate"), 900);
    } else {
      winPanel.classList.add("loss");
    }
  }
  function toPennies(x) {
    return Math.round(x * 100);
  }
  function computeDigAmountsFromTargets(phase, stakeCash, targets) {
    if (phase.id === "fail") return { phase, digs: 0, digCash: [], subtotalCash: 0, totalCash: 0, winCash: 0 };
    const digCash = targets.map((t, index) => {
      if (forceChasePrize > 0 && index === 0) {
        const prize = forceChasePrize;
        forceChasePrize = 0;
        console.log(`[DEBUG] Forced chase prize: \xA3${prize}`);
        return prize;
      }
      const val = t.el.dataset.mult ? parseFloat(t.el.dataset.mult) : 0;
      return val;
    });
    const subtotalCash = digCash.reduce((a, b) => a + b, 0);
    const totalCash = parseFloat(subtotalCash.toFixed(2));
    return { phase, digs: digCash.length, digCash, subtotalCash, totalCash, winCash: totalCash };
  }
  async function onShoot() {
    if (busy) return;
    busy = true;
    winPanel.classList.remove("visible");
    shotInfoEl.classList.remove("visible");
    subtotalPanel.textContent = "\xA30.00";
    cleanupGraveHighlights();
    currentStake = parseFloat(stakeInput.value) || 1;
    const bulletType = await spinBulletChamber();
    const hasGoldBullet = bulletType === "gold";
    const result = await playNormalRound(hasGoldBullet);
    const killCount = result.killCount;
    const goldKills = result.goldKills;
    if (forceThreeKills) {
      forceThreeKills = false;
      console.log("[DEBUG] Force 3 kills used and reset");
    }
    if (goldKills > 0) {
      await sleep(800);
      if (goldKills === 3) {
        setPhaseMessage("\u{1F3AF} PERFECT! 3 GOLD KILLS! MEGA HORDE MODE! \u{1F9DF}\u200D\u2642\uFE0F\u{1F9DF}\u200D\u2640\uFE0F\u{1F9DF}", "critical");
      } else if (goldKills === 2) {
        setPhaseMessage("\u26A1 2 GOLD KILLS! SUPER HORDE MODE! \u{1F9DF}\u200D\u2642\uFE0F\u{1F9DF}", "critical");
      } else {
        setPhaseMessage("\u{1F4A5} GOLD KILL! HORDE MODE UNLOCKED! \u{1F9DF}", "critical");
      }
      await sleep(1500);
      await playHordeModeRound(goldKills);
    } else if (hasGoldBullet && killCount > 0) {
      await sleep(500);
      setPhaseMessage("\u{1F494} GOLD BULLET WASTED! No gold kills!", "pulse");
      await sleep(1e3);
      const phase = getPhaseFromKillCount(killCount);
      const allGraves = readGraves();
      const targets = pickDistinct(allGraves, phase.digs);
      const payout = computeDigAmountsFromTargets(phase, currentStake, targets);
      await revealGraves(targets, payout.digCash);
      showTotalWin(payout.winCash);
      updateStats(phase, currentStake, payout.winCash, "silver");
      await sleep(1e3);
      resetZombiesForNextRound();
    }
    shootButton.disabled = false;
    busy = false;
  }
  function getPhaseFromKillCount(killCount) {
    let phase;
    let digs;
    switch (killCount) {
      case 3:
        digs = Math.floor(Math.random() * (zombieShootConfig.digRanges.threeKills[1] - zombieShootConfig.digRanges.threeKills[0] + 1)) + zombieShootConfig.digRanges.threeKills[0];
        phase = { ...phases.find((p) => p.id === "threeKills"), digs };
        break;
      case 2:
        digs = Math.floor(Math.random() * (zombieShootConfig.digRanges.twoKills[1] - zombieShootConfig.digRanges.twoKills[0] + 1)) + zombieShootConfig.digRanges.twoKills[0];
        phase = { ...phases.find((p) => p.id === "twoKills"), digs };
        break;
      case 1:
        digs = Math.floor(Math.random() * (zombieShootConfig.digRanges.oneKill[1] - zombieShootConfig.digRanges.oneKill[0] + 1)) + zombieShootConfig.digRanges.oneKill[0];
        phase = { ...phases.find((p) => p.id === "oneKill"), digs };
        break;
      default:
        phase = { ...phases.find((p) => p.id === "fail") };
        break;
    }
    return phase;
  }
  async function playNormalRound(hasGoldBullet = false) {
    [zombie1, zombie2, zombie3].forEach((z) => {
      z.classList.remove("target", "hit", "dead", "dodge", "aiming");
      z.style.opacity = "1";
    });
    setPhaseMessage("TARGET THE ZOMBIES...", "pulse");
    await sleep(800);
    const zombiesLeftToRight = [zombie1, zombie2, zombie3];
    let killCount = 0;
    let goldKills = 0;
    const zombiesHit = [];
    for (let i = 0; i < 3; i++) {
      const zombieEl = zombiesLeftToRight[i];
      const position = ["LEFT", "CENTER", "RIGHT"][i];
      const hit = forceThreeKills ? true : Math.random() < zombieShootConfig.hitProbability;
      zombiesHit.push(hit);
      if (hit) {
        killCount++;
        if (hasGoldBullet) goldKills++;
      }
      setPhaseMessage(`TARGETING ${position} ZOMBIE...`);
      await sleep(50);
      await playShotAtZombie(zombieEl, hit, i + 1);
      if (hit) {
        const killType = hasGoldBullet ? "\u2B50 GOLD KILL!" : "KILLED!";
        setPhaseMessage(`${position} ZOMBIE: ${killType} \u{1F480}`, "critical");
      } else {
        setPhaseMessage(`${position} ZOMBIE: ESCAPED! \u{1F47B}`, "pulse");
      }
      await sleep(50);
    }
    const phase = getPhaseFromKillCount(killCount);
    await sleep(300);
    if (killCount === 0) {
      setPhaseMessage("\u{1F4A5} ALL ZOMBIES ESCAPED!", "pulse");
      document.body.classList.add("flash-red");
      await sleep(800);
      document.body.classList.remove("flash-red");
    } else if (killCount === 3) {
      setPhaseMessage("\u{1F3AF} PERFECT! ALL 3 ZOMBIES DOWN!", "critical");
      document.body.classList.add("flash-green");
      await sleep(800);
      document.body.classList.remove("flash-green");
    } else {
      setPhaseMessage(`\u{1F480} ${killCount} ZOMBIE${killCount > 1 ? "S" : ""} KILLED!`);
      await sleep(600);
    }
    shotInfoEl.textContent = `${killCount}/3 zombies killed`;
    shotInfoEl.classList.add("visible");
    if (phase.id === "fail") {
      showTotalWin(0);
      updateStats(phase, currentStake, 0, "silver");
      return { killCount: 0, goldKills: 0 };
    }
    if (goldKills === 0) {
      await sleep(500);
      const allGraves = readGraves();
      const targets = pickDistinct(allGraves, phase.digs);
      const payout = computeDigAmountsFromTargets(phase, currentStake, targets);
      await revealGraves(targets, payout.digCash);
      showTotalWin(payout.winCash);
      updateStats(phase, currentStake, payout.winCash, "silver");
      await sleep(1e3);
      resetZombiesForNextRound();
    }
    return { killCount, goldKills };
  }
  async function playHordeModeRound(goldKills = 3) {
    let tierMessage;
    let tierColor;
    if (goldKills === 3) {
      tierMessage = "\u{1F9DF} MEGA HORDE MODE! \u{1F9DF}\u200D\u2642\uFE0F\u{1F9DF}\u200D\u2640\uFE0F\u{1F9DF}";
      tierColor = "gold";
    } else if (goldKills === 2) {
      tierMessage = "\u{1F9DF} SUPER HORDE MODE! \u{1F9DF}\u200D\u2642\uFE0F\u{1F9DF}";
      tierColor = "silver";
    } else {
      tierMessage = "\u{1F9DF} HORDE MODE! \u{1F9DF}";
      tierColor = "bronze";
    }
    setPhaseMessage(tierMessage, "critical");
    await sleep(1e3);
    buildGravesWithPrizes(BONUS_GRAVE_PRIZES);
    await transformGravesToZombies();
    const hordeResult = playHordeMode(goldKills);
    const totalBullets = hordeResult.totalBullets;
    const zombiesSpawned = hordeResult.zombiesSpawned;
    const multiplier = hordeResult.multiplier;
    setPhaseMessage(`${totalBullets} BULLETS! ${multiplier}x PRIZES! SHOOT THE HORDE!`, "pulse");
    await sleep(800);
    const guaranteedKills = zombiesSpawned;
    let zombiesKilled = 0;
    const hitGraves = [];
    const prizeAmounts = [];
    for (let i = 0; i < totalBullets && zombiesKilled < zombiesSpawned; i++) {
      const forceHit = zombiesKilled < guaranteedKills && i < totalBullets;
      const hit = forceHit || Math.random() < zombieShootConfig.hitProbability;
      if (hit) {
        zombiesKilled++;
        const allGraves = Array.from(document.querySelectorAll(".grave.zombie-transform"));
        const availableGraves = allGraves.filter((g) => !g.classList.contains("horde-killed"));
        if (availableGraves.length > 0) {
          const targetGrave = availableGraves[Math.floor(Math.random() * availableGraves.length)];
          const prizeValue = parseFloat(targetGrave.dataset.cash || "0");
          targetGrave.classList.add("horde-killed");
          hitGraves.push(targetGrave);
          const basePrize = prizeValue;
          const multipliedPrize = basePrize * multiplier;
          prizeAmounts.push(multipliedPrize);
          playSound("hit");
          createHordeZombieKillEffect(targetGrave, multipliedPrize);
          await sleep(250);
        }
      } else {
        playSound("whiff");
        await sleep(180);
      }
    }
    await sleep(500);
    const killPercent = Math.round(zombiesKilled / zombiesSpawned * 100);
    setPhaseMessage(`\u{1F480} ${zombiesKilled}/${zombiesSpawned} ZOMBIES ELIMINATED! (${killPercent}%)`, "critical");
    await sleep(1e3);
    const totalWin = prizeAmounts.reduce((a, b) => a + b, 0);
    showHordeModeWinPopup(zombiesKilled, totalWin, goldKills, multiplier);
    await sleep(2e3);
    await transformZombiesToGraves();
    buildGravesWithPrizes(STATIC_GRAVE_PRIZES);
    const phase = {
      id: "horde",
      label: "HORDE MODE",
      digs: zombiesKilled,
      zombiesKilled,
      multiplier: 1,
      probability: 0
    };
    shotInfoEl.textContent = `\u{1F947} HORDE: ${zombiesKilled}/${zombiesSpawned} kills`;
    shotInfoEl.classList.add("visible");
    showTotalWin(totalWin);
    updateStats(phase, currentStake, totalWin, "gold");
    await sleep(1e3);
    resetZombiesForNextRound();
  }
  function resetZombiesForNextRound() {
    console.log("[RESET] Bringing zombies back for next round");
    [zombie1, zombie2, zombie3].forEach((z, idx) => {
      z.classList.remove("target", "hit", "dead", "dodge", "aiming");
      z.style.opacity = "1";
      z.style.visibility = "visible";
      z.style.animation = "zombieRespawn 0.5s ease-out";
      setTimeout(() => {
        z.style.animation = "";
      }, 500);
      console.log(`[RESET] Zombie ${idx + 1} reset`);
    });
  }
  async function playShotAtZombie(zombieEl, hit, zombieNumber) {
    console.log(`[SHOOT] Starting shot at zombie ${zombieNumber}, hit=${hit}`);
    [zombie1, zombie2, zombie3].forEach((z, idx) => {
      z.classList.remove("target", "aiming", "dodge");
      void z.offsetWidth;
      console.log(`[CLEAR] Cleared zombie ${idx + 1} classes`);
    });
    await sleep(25);
    zombieEl.classList.add("target", "aiming");
    console.log(`[TARGET] Added aiming to zombie ${zombieNumber}`);
    playSound("target-lock");
    await sleep(250);
    muzzleFlash();
    playSound("gunshot");
    cameraShake(140);
    await sleep(70);
    zombieEl.classList.remove("aiming");
    if (hit) {
      console.log(`[HIT] Zombie ${zombieNumber} killed`);
      zombieEl.classList.add("hit", "dead");
      zombieEl.classList.remove("target");
      playSound("hit");
      createZombieDeathEffect(zombieEl);
      const rect = zombieEl.getBoundingClientRect();
      const playfield = document.querySelector(".playfield").getBoundingClientRect();
      const hitText = document.createElement("div");
      hitText.className = "zombie-hit-text";
      hitText.textContent = "\u{1F480} KILL!";
      hitText.style.position = "absolute";
      hitText.style.left = rect.left + rect.width / 2 - playfield.left + "px";
      hitText.style.top = rect.top + rect.height / 2 - playfield.top + "px";
      document.querySelector(".playfield")?.appendChild(hitText);
      setTimeout(() => hitText.remove(), 500);
    } else {
      console.log(`[MISS] Zombie ${zombieNumber} dodging`);
      zombieEl.classList.remove("target");
      void zombieEl.offsetWidth;
      zombieEl.classList.add("dodge");
      playSound("whiff");
      const rect = zombieEl.getBoundingClientRect();
      const playfield = document.querySelector(".playfield").getBoundingClientRect();
      const dust = document.createElement("div");
      dust.className = "dodge-dust";
      dust.textContent = "\u{1F4A8}";
      dust.style.position = "absolute";
      dust.style.left = rect.left + rect.width / 2 - playfield.left + "px";
      dust.style.top = rect.top - 30 - playfield.top + "px";
      dust.style.transform = "translateX(-50%)";
      dust.style.fontSize = "32px";
      dust.style.pointerEvents = "none";
      dust.style.zIndex = "15";
      document.querySelector(".playfield")?.appendChild(dust);
      setTimeout(() => dust.remove(), 400);
      const missText = document.createElement("div");
      missText.className = "zombie-miss-text";
      missText.textContent = "\u{1F47B} MISS!";
      missText.style.position = "absolute";
      missText.style.left = rect.left + rect.width / 2 - playfield.left + "px";
      missText.style.top = rect.top + rect.height / 2 - playfield.top + "px";
      document.querySelector(".playfield")?.appendChild(missText);
      setTimeout(() => missText.remove(), 500);
      await sleep(300);
      zombieEl.classList.remove("dodge");
      console.log(`[MISS] Zombie ${zombieNumber} dodge complete`);
    }
    await sleep(10);
    console.log(`[SHOOT] Finished shot at zombie ${zombieNumber}`);
  }
  async function transformGravesToZombies() {
    const graves = document.querySelectorAll(".grave");
    for (let i = 0; i < graves.length; i++) {
      const grave = graves[i];
      setTimeout(() => {
        grave.classList.add("zombie-transform");
        grave.innerHTML = '<span class="zombie-emoji">\u{1F9DF}</span>';
        playSound("zombie-rise");
      }, i * 80);
    }
    await sleep(graves.length * 80 + 500);
  }
  async function transformZombiesToGraves() {
    const graves = document.querySelectorAll(".grave");
    for (let i = 0; i < graves.length; i++) {
      const grave = graves[i];
      const cashValue = parseFloat(grave.dataset.cash || "0");
      setTimeout(() => {
        grave.classList.remove("zombie-transform");
        grave.innerHTML = `<span class="grave-value">${formatPrize(cashValue)}</span>`;
      }, i * 60);
    }
    await sleep(graves.length * 60 + 300);
  }
  function createZombieDeathEffect(zombieEl) {
    const rect = zombieEl.getBoundingClientRect();
    const pf = document.querySelector(".playfield");
    if (!pf) return;
    const splash = document.createElement("div");
    splash.className = "zombie-death-effect";
    splash.textContent = "\u{1F480}\u{1F4A5}";
    splash.style.left = rect.left + rect.width / 2 + "px";
    splash.style.top = rect.top + rect.height / 2 + "px";
    pf.appendChild(splash);
    setTimeout(() => splash.remove(), 800);
  }
  function createHordeZombieKillEffect(graveEl, prizeValue) {
    graveEl.style.filter = "brightness(2) saturate(2) hue-rotate(320deg)";
    setTimeout(() => {
      graveEl.style.filter = "";
      graveEl.classList.add("horde-killed-state");
    }, 100);
    const rect = graveEl.getBoundingClientRect();
    const graveContainer2 = document.querySelector(".grave-container");
    if (!graveContainer2) return;
    const containerRect = graveContainer2.getBoundingClientRect();
    const prizeText = document.createElement("div");
    prizeText.className = "horde-prize-float";
    prizeText.textContent = `\xA3${prizeValue.toFixed(2)}`;
    prizeText.style.position = "absolute";
    prizeText.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
    prizeText.style.top = `${rect.top - containerRect.top + rect.height / 2}px`;
    prizeText.style.transform = "translate(-50%, -50%)";
    prizeText.style.fontSize = "1.5rem";
    prizeText.style.fontWeight = "bold";
    prizeText.style.color = "#FFD700";
    prizeText.style.textShadow = "2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(255,215,0,0.8)";
    prizeText.style.animation = "floatUpAndFade 1.5s ease-out";
    prizeText.style.pointerEvents = "none";
    prizeText.style.zIndex = "2000";
    graveContainer2.appendChild(prizeText);
    setTimeout(() => prizeText.remove(), 1500);
  }
  function showHordeModeWinPopup(zombiesKilled, totalWin, goldKills, multiplier) {
    let tierTitle = "";
    if (goldKills === 3) {
      tierTitle = "\u{1F947} MEGA HORDE CLEARED! \u{1F947}";
    } else if (goldKills === 2) {
      tierTitle = "\u{1F948} SUPER HORDE CLEARED! \u{1F948}";
    } else {
      tierTitle = "\u{1F949} HORDE CLEARED! \u{1F949}";
    }
    const popup = document.createElement("div");
    popup.className = "horde-win-popup";
    popup.innerHTML = `
    <div class="horde-win-content">
      <h2>${tierTitle}</h2>
      <div class="horde-tier-info">
        <p class="gold-kills">${goldKills} Gold Kill${goldKills > 1 ? "s" : ""} = ${multiplier}x Multiplier!</p>
      </div>
      <div class="horde-win-stats">
        <p class="zombies-killed">${zombiesKilled} Zombies Eliminated</p>
        <p class="total-win">\xA3${totalWin.toFixed(2)}</p>
      </div>
      <button class="horde-close-btn">CONTINUE</button>
    </div>
  `;
    document.body.appendChild(popup);
    const closeBtn = popup.querySelector(".horde-close-btn");
    closeBtn.addEventListener("click", () => {
      popup.style.opacity = "0";
      setTimeout(() => popup.remove(), 300);
    });
  }
  function triggerBonusRound() {
    if (busy) {
      console.log("[DEBUG] Cannot trigger bonus - game is busy");
      return;
    }
    forceGoldBullet = true;
    forceThreeKills = true;
    console.log("[DEBUG] Next shot will be GOLD BULLET + 3 KILLS (bonus round guaranteed)");
    setPhaseMessage("\u{1F3AF} DEBUG: Bonus round loaded!", "critical");
    setTimeout(() => setPhaseMessage("Ready"), 2e3);
  }
  window.triggerBonus = triggerBonusRound;
  function forceChasePrizeDebug(amount) {
    if (busy) {
      console.log("[DEBUG] Cannot force chase prize - game is busy");
      return;
    }
    forceChasePrize = amount;
    console.log(`[DEBUG] Next grave will contain \xA3${amount} chase prize!`);
    setPhaseMessage(`\u{1F48E} DEBUG: \xA3${amount} loaded!`, "critical");
    setTimeout(() => setPhaseMessage("Ready"), 2e3);
  }
  function toggleDebugMode() {
    debugMode = !debugMode;
    console.log(`[DEBUG] Debug mode ${debugMode ? "ENABLED" : "DISABLED"}`);
    updateDebugDisplay();
  }
  function updateDebugDisplay() {
    let debugPanel = document.getElementById("debugPanel");
    if (debugMode && !debugPanel) {
      debugPanel = document.createElement("div");
      debugPanel.id = "debugPanel";
      debugPanel.className = "debug-panel";
      debugPanel.innerHTML = `
      <h4>\u{1F527} DEBUG MODE</h4>
      <button id="triggerBonusBtn">Force Gold Bullet</button>
      <button id="force50Btn">Force \xA350</button>
      <button id="force100Btn">Force \xA3100</button>
      <button id="force250Btn">Force \xA3250</button>
      <button id="toggleDebugBtn">Disable Debug</button>
      <p><small>Hotkeys: B=Bonus, 1=\xA350, 2=\xA3100, 3=\xA3250</small></p>
    `;
      document.body.appendChild(debugPanel);
      document.getElementById("triggerBonusBtn").addEventListener("click", triggerBonusRound);
      document.getElementById("force50Btn").addEventListener("click", () => forceChasePrizeDebug(50));
      document.getElementById("force100Btn").addEventListener("click", () => forceChasePrizeDebug(100));
      document.getElementById("force250Btn").addEventListener("click", () => forceChasePrizeDebug(250));
      document.getElementById("toggleDebugBtn").addEventListener("click", toggleDebugMode);
    } else if (!debugMode && debugPanel) {
      debugPanel.remove();
    }
  }
  function wireEvents() {
    shootButton.addEventListener("click", () => onShoot());
    resetStatsBtn.addEventListener("click", resetStats);
    const debugBonusBtn = document.getElementById("debugBonusBtn");
    if (debugBonusBtn) {
      debugBonusBtn.addEventListener("click", () => {
        triggerBonusRound();
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.code === "KeyD" && e.ctrlKey) {
        e.preventDefault();
        toggleDebugMode();
      } else if (debugMode && !busy) {
        if (e.code === "KeyB") {
          e.preventDefault();
          triggerBonusRound();
        } else if (e.code === "Digit1") {
          e.preventDefault();
          forceChasePrizeDebug(50);
        } else if (e.code === "Digit2") {
          e.preventDefault();
          forceChasePrizeDebug(100);
        } else if (e.code === "Digit3") {
          e.preventDefault();
          forceChasePrizeDebug(250);
        }
      }
    });
  }
  var bulletConfig = {
    // Adjusted down slightly to 20% to balance increased bonus EV
    goldProbability: 0.2
  };
  async function spinBulletChamber() {
    bulletResultEl.textContent = "";
    bulletResultEl.className = "bullet-result";
    bulletWheelEl.classList.add("spinning");
    shootButton.disabled = true;
    setPhaseMessage("SPINNING...", "pulse");
    await sleep(debugMode && forceGoldBullet ? 400 : 900);
    bulletWheelEl.classList.remove("spinning");
    let type;
    if (forceGoldBullet) {
      type = "gold";
      forceGoldBullet = false;
      console.log("[DEBUG] Forced Gold bullet!");
    } else {
      const r = Math.random();
      type = r < bulletConfig.goldProbability ? "gold" : "silver";
    }
    bulletResultEl.textContent = type === "gold" ? "GOLD" : "SILVER";
    bulletResultEl.classList.add(type);
    setPhaseMessage(type === "gold" ? "GOLD BULLET!" : "Silver Bullet");
    await sleep(350);
    return type;
  }
  function init() {
    initDomRefs();
    buildGravesWithPrizes(STATIC_GRAVE_PRIZES);
    setZombieMissCount(0);
    wireEvents();
    setPhaseMessage("Ready");
    renderStats();
    console.log("Grave Fortunes UI ready.");
    console.log("\u{1F527} DEBUG: Press Ctrl+D to enable debug mode");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
