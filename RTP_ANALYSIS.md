# RTP Analysis - Zombie Tap 5

## Target RTP: 95-97%

## Key Changes Made

### 1. Phase Probabilities (Based on 40% Hit Rate)
**Mathematical probability with 40% hit chance per zombie:**
- 3 kills: 0.4³ = **6.4%** chance → 6-8 digs
- 2 kills: 3×0.4²×0.6 = **28.8%** chance → 4-6 digs
- 1 kill: 3×0.4×0.6² = **43.2%** chance → 2-4 digs
- 0 kills: 0.6³ = **21.6%** chance → 0 digs

These natural probabilities give us a good win rate (~78.4% hit something).

### 2. Base Game Prize Weights (Adjusted for 95-97% RTP)

```
Prize   Weight   Probability   EV Contribution
£0.20   10000    37.0%         0.074x stake
£0.30   8000     29.6%         0.089x stake
£0.50   5000     18.5%         0.093x stake
£0.80   2500     9.2%          0.074x stake
£1.00   1000     3.7%          0.037x stake
£1.50   400      1.5%          0.022x stake
£2.00   150      0.55%         0.011x stake
£2.50   60       0.22%         0.006x stake
£4.00   20       0.07%         0.003x stake
£5.00   8        0.03%         0.001x stake
£8.00   3        0.01%         0.001x stake
£10.00  1        0.004%        0.0004x stake
£25.00  0.2      0.0007%       0.0002x stake
```

**Average Prize Value per Dig: ~0.41x stake**

### 3. Expected Return Calculation

**Base Game (per £1 stake):**
- 3 kills (6.4%): avg 7 digs × £0.41 = £2.87 × 0.064 = **£0.184**
- 2 kills (28.8%): avg 5 digs × £0.41 = £2.05 × 0.288 = **£0.590**
- 1 kill (43.2%): avg 3 digs × £0.41 = £1.23 × 0.432 = **£0.531**
- 0 kills (21.6%): £0 × 0.216 = **£0.000**

**Total Expected Return: £1.305 per £1 stake**

Wait, that's 130.5% which is too high! Let me recalculate with more conservative weights...
