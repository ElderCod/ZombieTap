# Horde Mode Improvements

## Changes Implemented

### 1. Chase Prize Economy Rebalance ✅
**Goal**: Make £50/£100/£250 prizes extremely rare and bonus-only

**Changes**:
- Removed chase prizes (£50, £100, £250) from base game graves completely
- Moved them exclusively to bonus rounds (gold bullet only)
- Set extremely rare weights:
  - £50: 0.5 weight (~1 in 18,000 digs)
  - £100: 0.05 weight (~1 in 175,000 digs)
  - £250: 0.005 weight (~1 in 1,750,000 digs)

**Files Modified**:
- `src/game.ts`: Updated `graveValues` and `graveWeights` arrays
- `src/app.ts`: Split into `STATIC_GRAVE_PRIZES` (£0.20-£25) and `BONUS_GRAVE_PRIZES` (£1-£250)

### 2. Enhanced Horde Mode Visual Feedback ✅
**Goal**: Show individual zombie hits with prize values like base game graves

**Features**:
- **Individual Zombie Targeting**: Each bullet now targets a specific random grave/zombie
- **Hit Feedback**: When a zombie is hit:
  - Flash red/bright effect on the grave
  - Grave transitions to grayscale "killed" state
  - Prize value floats up from the grave (£X.XX in gold)
  - Prize display uses same visual style as base game
- **Sequential Shooting**: 250ms between hits, 180ms between misses (slower paced)
- **Kill Tracking**: Graves marked with `horde-killed` class and tracked in array

**New Functions**:
- `createHordeZombieKillEffect(graveEl, prizeValue)`: Shows death + prize
- `showHordeModeWinPopup(zombiesKilled, totalWin)`: End-of-round summary

### 3. Horde Mode Win Popup ✅
**Goal**: Display total round winnings in a popup overlay

**Features**:
- Full-screen dark overlay (85% black)
- Centered popup with gradient background
- Shows:
  - "🧟 HORDE CLEARED! 🧟" header
  - Number of zombies eliminated
  - Total prize money won (large, gold text)
- Auto-dismisses after 2 seconds with fade-out
- Prevents player from clicking through during display

**CSS Classes Added**:
- `.horde-win-popup`: Fullscreen overlay container
- `.horde-win-content`: Centered card with border/shadow
- `.horde-win-stats`: Stats display area
- `.zombies-killed`: Zombie count (orange text)
- `.total-win`: Large gold prize amount

### 4. Improved Prize Display System
**Features**:
- Uses `getBoundingClientRect()` for accurate positioning
- Prize text appears at center of killed zombie/grave
- Floats upward with fade-out animation (`floatUpAndFade`)
- Gold color (#FFD700) with glow effect
- 1.5s duration before removal

**CSS Additions**:
- `.horde-killed-state`: Visual state for killed zombies (50% opacity, grayscale)
- `.horde-prize-float`: Floating prize text styling (inline via JS)
- `@keyframes floatUpAndFade`: Animation for prize reveal

## Technical Implementation

### Horde Mode Flow (Redesigned)
1. **Setup**: Switch to `BONUS_GRAVE_PRIZES` array
2. **Transformation**: Graves → Zombies animation
3. **Shooting Phase**: 
   - Loop through 12 bullets
   - Each hit picks random available grave
   - Show kill effect + prize immediately
   - Track hits in arrays
4. **Results**: Show elimination stats (X/16 zombies)
5. **Win Popup**: Display total winnings overlay
6. **Cleanup**: Transform zombies → graves, rebuild normal graves
7. **Respawn**: Reset zombies for next round

### Data Tracking
```typescript
const hitGraves: HTMLElement[] = []; // Which graves were hit
const prizeAmounts: number[] = [];  // Prize for each hit
const totalWin = prizeAmounts.reduce((a, b) => a + b, 0);
```

### Visual States
- `.horde-killed`: Marks a grave as already hit (prevents double-hit)
- `.horde-killed-state`: Visual styling for killed graves
- Filter effects for flash: `brightness(2) saturate(2) hue-rotate(320deg)`

## Testing Checklist
- [ ] Verify chase prizes (£50/£100/£250) never appear in base game graves
- [ ] Confirm chase prizes appear (rarely) in gold bullet bonus rounds
- [ ] Check individual zombie hit feedback shows clearly
- [ ] Verify prize amounts float up from correct zombie positions
- [ ] Confirm win popup displays correct total
- [ ] Test popup auto-dismisses after 2 seconds
- [ ] Verify no duplicate zombie kills in same round
- [ ] Check grayscale effect on killed zombies

## Player Experience
**Before**:
- Random hit effects, no clear feedback which zombies died
- No individual prize display
- No summary of round winnings
- Chase prizes too common

**After**:
- Clear visual feedback for each zombie killed
- Prize amounts displayed like base game graves
- Satisfying popup showing total haul
- Chase prizes feel special and exclusive to bonus rounds
- Better pacing with slower shooting sequence

## Version
Updated to **v7** (script tags in index.html)
