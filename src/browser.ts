// Browser entry point: exposes GraveFortunes API on window
import { resolveGraveFortunesRound, simulate, mulberry32, phases, type Phase, type RoundResult } from './game';

interface GraveFortunesAPI {
  phases: Phase[];
  playRound: (stake: number) => RoundResult;
  simulate: (rounds: number, stake: number, seed?: number) => ReturnType<typeof simulate>;
}

const api: GraveFortunesAPI = {
  phases,
  playRound: (stake: number) => resolveGraveFortunesRound(stake),
  simulate: (rounds: number, stake: number, seed?: number) => {
    const rng = mulberry32(seed ?? Date.now());
    return simulate(rounds, stake, rng);
  }
};

// Attach to window
// @ts-ignore - define global
(window as any).GraveFortunes = api;

export {}; // ensure module isolation
