# Zombie Shooter - Lucky Tap Prototype

A lightweight TypeScript prototype for a Lucky Tap style zombie shooter game.

## 🎮 Core Gameplay (NEW!)

### Main Game: Shoot 3 Zombies
- **NEW MECHANIC**: Instead of 3 shots at 1 zombie, you shoot at **3 different zombies**
- Each zombie can be HIT or MISS independently
- Prize depends on how many zombies you kill:
  - **3 Zombies Killed** = BIG WIN! (6-8 prizes)
  - **2 Zombies Killed** = Good Win (4-6 prizes)
  - **1 Zombie Killed** = Small Win (2-4 prizes)
  - **0 Zombies Killed** = LOSE (no prizes)

### Bonus Round: HORDE MODE! 🧟‍♂️
- **Gold Bullet** triggers the HORDE MODE bonus
- Graves transform into zombies - a horde attack!
- You get **12 bullets** to shoot **16 zombies**
- The more zombies you kill, the better your prize!
- Each zombie killed earns you 1-2 prizes
- Fast-paced rapid-fire action!

## 🎯 Bullet Chamber
Press SHOOT to spin the chamber:
- **Silver Bullet** (80% chance): Normal 3-zombie round
- **Gold Bullet** (20% chance): Triggers HORDE MODE!

## 💰 Prize System
- Each grave shows a cash value
- When you win, random graves are revealed
- The sum of revealed graves = your total win
- Chase prizes (£50, £100, £250) are ultra-rare but possible!

## 🎲 Game Balance
- **Hit Probability**: 40% chance to hit each zombie
- **Theoretical RTP**: ~27% (realistic Lucky Tap style)
- **Win Distribution**:
  - 3 kills: 3% (rare but exciting!)
  - 2 kills: 12% (good wins)
  - 1 kill: 25% (small wins)
  - 0 kills: 60% (most rounds fail - typical Lucky Tap)

## 🚀 Running the Game
## 🚀 Running the Game

### Browser Play (Recommended)
1. Open `index.html` in any modern browser
2. Click "SHOOT" to play
3. Watch the bullet chamber spin
4. See if you can kill all 3 zombies!

### Build Commands
```powershell
# Build browser bundle
npm run build:browser

# Auto-rebuild on changes
npm run watch:browser

# Run simulations (CLI)
npm run simulate
```

## 🎨 Visual Features
- **3 Zombies** displayed horizontally
- Each zombie reacts individually to hits/misses
- Zombies dodge when you miss
- Death animations when you hit
- **Horde Mode** transforms graves into zombies
- Camera shake and muzzle flash effects
- Special celebration for chase prizes (£50+)

## 🔧 Debug Mode
- Press **Ctrl+D** to enable debug mode
- Force next bullet to be Gold (Bonus Round)
- Force specific chase prizes (£50, £100, £250)
- Hotkeys: **B**=Bonus, **1**=£50, **2**=£100, **3**=£250

## 📊 Technical Details

### Game Configuration
```typescript
// Main game (3 zombies)
zombieShootConfig = {
  hitProbability: 0.40,  // 40% to hit each zombie
  zombieCount: 3,
  digRanges: {
    threeKills: [6, 8],  // 6-8 prizes
    twoKills: [4, 6],    // 4-6 prizes
    oneKill: [2, 4],     // 2-4 prizes
  }
}

// Horde mode (bonus)
{
  hordeBullets: 12,      // 12 bullets
  hordeZombies: 16,      // 16 zombies to kill
  horde: [1, 2]          // 1-2 prizes per zombie killed
}
```

### Prize Values
Graves display cash amounts: £0.20, £0.30, £0.50, £0.80, £1, £1.50, £2, £2.50, £4, £5, £8, £10, £25, £50, £100, £250

Chase prizes (£50+) are ultra-rare but add excitement:
- £50: ~1 in 2 million chance
- £100: ~1 in 10 million chance
- £250: ~1 in 40 million chance (LEGENDARY!)

## 🎯 Strategy Tips
- Most rounds will fail (60%) - that's normal for Lucky Tap
- Gold bullets are your best chance for big wins
- In Horde Mode, accuracy matters - make every shot count!
- Chase prizes are dreams, not expectations

## 🔮 Future Enhancements
- Add sound effects (gunshots, zombie groans, etc.)
- Implement particle effects for hits/misses
- Add combo multipliers for consecutive hits
- Create themed zombie types with different behaviors
- Add player progression/unlocks
- Implement provable fairness with seed display

## ⚠️ Disclaimer
This is a prototype for demonstration purposes only. No real money is involved. Ensure compliance with local gambling regulations before adapting to production.

## 📝 License
Prototype © 2025 - For demonstration only
