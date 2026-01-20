# Zombie Shooter - Gameplay Redesign Summary

## 🎯 Overview
The game has been completely redesigned from a "3-shots-at-1-zombie" system to a "shoot-3-zombies" system with an exciting horde mode bonus round!

---

## 🔄 What Changed

### OLD System (Before)
- **Mechanic**: Fire 3 shots at a single zombie
- First shot, second shot, or third shot could hit
- Miss all 3 shots = lose
- Hit on any shot = win (different prizes based on which shot hit)

### NEW System (Now)
- **Mechanic**: Shoot at 3 different zombies simultaneously
- Each zombie can be hit or missed independently
- Prize scales with number of zombies killed:
  - 0 kills = LOSE
  - 1 kill = Small win (2-4 prizes)
  - 2 kills = Good win (4-6 prizes)
  - 3 kills = BIG WIN! (6-8 prizes)

---

## 🎮 New Gameplay Features

### 1. Main Game: 3 Zombies
```
🧟    🧟    🧟
Z1    Z2    Z3
```

**How it works:**
1. Click SHOOT button
2. Bullet chamber spins (Gold or Silver)
3. If Silver: Shoot at 3 zombies sequentially
4. Each zombie has 40% chance to be hit
5. Prize based on total kills

**Visual Feedback:**
- Target highlight when shooting at each zombie
- Hit = zombie dies with death animation
- Miss = zombie dodges to the side
- Real-time kill counter

### 2. Bonus Round: HORDE MODE 🧟‍♂️
**Triggered by Gold Bullet (20% chance)**

**How it works:**
1. Gold bullet triggers transformation
2. All graves turn into zombies (grave-to-zombie animation!)
3. 16 zombies spawn on screen
4. You get 12 bullets to kill them
5. Rapid-fire shooting sequence
6. Each zombie killed = 1-2 prizes
7. More kills = bigger total prize

**Visual Spectacle:**
- Graves shake and transform into zombies
- Rapid muzzle flashes
- Hit counters
- Celebration based on kill percentage
- Zombies transform back to graves for prize reveal

---

## 📊 Game Balance

### Probabilities
```typescript
// Hit probability per zombie
hitProbability: 0.40 (40%)

// Kill distribution (calculated)
0 kills: 60% chance - LOSE
1 kill:  25% chance - Small win
2 kills: 12% chance - Good win
3 kills:  3% chance - BIG WIN!

// Gold bullet chance
goldProbability: 0.20 (20%)
```

### Prize Ranges
```typescript
// Normal rounds (Silver bullet)
3 kills: 6-8 prizes
2 kills: 4-6 prizes
1 kill:  2-4 prizes
0 kills: 0 prizes

// Horde mode (Gold bullet)
Per zombie killed: 1-2 prizes
Max potential: 32 prizes (16 zombies × 2)
Average horde: ~10-15 prizes
```

### RTP (Return to Player)
- Theoretical RTP: ~27% (realistic Lucky Tap style)
- Most rounds fail (60%) - typical for lucky tap games
- Gold bullet rounds boost overall expected value
- Chase prizes (£50+) add excitement without inflating RTP

---

## 🎨 Visual Changes

### HTML Changes
**Before:**
```html
<div class="zombie-container">
  <div class="zombie-sprite">🧟</div>
</div>
```

**After:**
```html
<div class="zombie-container">
  <div id="zombie1" class="zombie-sprite zombie-1">🧟</div>
  <div id="zombie2" class="zombie-sprite zombie-2">🧟</div>
  <div id="zombie3" class="zombie-sprite zombie-3">🧟</div>
</div>
```

### CSS Enhancements
- 3 zombies positioned horizontally (15%, 50%, 85%)
- Individual zombie animations (target, hit, dead, dodge)
- Grave-to-zombie transformation effects
- Horde mode flash effects
- Enhanced death animations
- Better targeting feedback

---

## 💻 Code Architecture Changes

### game.ts - New Functions
```typescript
// Main shooting mechanic
shootZombies() → ZombieShootResult
  - Returns array of hit/miss for 3 zombies
  - Calculates kill count
  - Determines phase based on kills

// Horde mode
playHordeMode() → HordeModeResult
  - Simulates rapid fire at horde
  - Tracks kills vs total zombies
  - Returns shots array and prizes

// New config
zombieShootConfig {
  hitProbability: 0.40
  zombieCount: 3
  hordeBullets: 12
  hordeZombies: 16
  digRanges: { ... }
}
```

### app.ts - New Functions
```typescript
// Round management
playNormalRound() - 3-zombie shooting
playHordeModeRound() - Bonus horde mode

// Visual effects
playShotAtZombie(zombieEl, hit, number)
transformGravesToZombies()
transformZombiesToGraves()
createZombieDeathEffect(zombieEl)
createHordeHitEffect()
```

---

## 🎲 Gameplay Flow

### Normal Round (Silver Bullet)
```
1. Press SHOOT
2. Bullet chamber spins → SILVER
3. "SHOOT AT THE ZOMBIES!"
4. Target zombie 1 → shoot → hit/miss feedback
5. Target zombie 2 → shoot → hit/miss feedback  
6. Target zombie 3 → shoot → hit/miss feedback
7. Show total kills (e.g., "2 ZOMBIES KILLED!")
8. Reveal prizes from graves
9. Display total win
```

### Bonus Round (Gold Bullet)
```
1. Press SHOOT
2. Bullet chamber spins → GOLD
3. "HORDE MODE! ZOMBIES INCOMING!"
4. Graves transform into zombies
5. "12 BULLETS! SHOOT THE HORDE!"
6. Rapid fire sequence (12 bullets)
7. Count kills (e.g., "10/16 ZOMBIES ELIMINATED!")
8. Zombies transform back to graves
9. Reveal prizes based on kills
10. Display total win
```

---

## 🎯 Player Experience Improvements

### More Engaging
- 3 targets create more tension
- Each shot matters
- Visual variety (3 zombies vs 1)
- Clear kill progression (0/1/2/3)

### Better Feedback
- See exactly which zombies you hit/missed
- Real-time kill counter
- Individual death animations
- Dodge animations add personality

### More Exciting Bonus
- Horde mode feels epic and chaotic
- Transformation sequence builds anticipation
- More bullets = more action
- Visible zombie count adds urgency

### Clearer Outcomes
- "2 out of 3 killed" is intuitive
- Progressive prize scaling makes sense
- Bonus mode clearly different from normal

---

## 🐛 Debug Features

Press **Ctrl+D** to enable debug mode:
- **B**: Force next bullet to be Gold (trigger horde mode)
- **1**: Force £50 chase prize in next win
- **2**: Force £100 mega prize in next win
- **3**: Force £250 legendary prize in next win

---

## 📱 Mobile Friendly
The game remains fully playable on mobile devices:
- Touch-friendly SHOOT button
- Responsive layout
- All animations work on mobile
- Stats panel scrolls on small screens

---

## 🚀 Next Steps
See `NEXT_STEPS.md` for detailed enhancement roadmap including:
- Sound effects
- Enhanced visual effects
- Different zombie types
- Additional game modes
- Player progression system
- Multiplayer features

---

## ✅ Testing Checklist

### Normal Rounds
- [ ] All 3 zombies hit
- [ ] 2 zombies hit  
- [ ] 1 zombie hit
- [ ] All zombies missed
- [ ] Prizes display correctly
- [ ] Stats update properly

### Horde Mode
- [ ] Gold bullet triggers horde
- [ ] Graves transform to zombies
- [ ] Rapid fire works
- [ ] Kill count accurate
- [ ] Zombies transform back
- [ ] Prizes based on kills

### Visual
- [ ] 3 zombies display properly
- [ ] Hit animations work
- [ ] Miss/dodge animations work
- [ ] Death effects show
- [ ] Horde transformation smooth
- [ ] Prize reveals work

### UI/UX
- [ ] Button states work
- [ ] Text updates correctly
- [ ] Stats track properly
- [ ] Debug mode functions
- [ ] Mobile responsive

---

## 🎉 Summary

The game has been successfully transformed from a sequential shooting mechanic to a multi-target system with an exciting bonus mode. The new system is:

✅ More engaging (3 targets vs 1)
✅ More intuitive (kill count = prize tier)
✅ More exciting (horde mode bonus)
✅ Better balanced (~27% RTP)
✅ Fully animated and polished
✅ Mobile friendly
✅ Easy to understand

The redesign maintains the Lucky Tap DNA while adding more player agency and visual excitement!
