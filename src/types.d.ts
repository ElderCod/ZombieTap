// Global type augmentation for browser bundle
import type { RoundResult, Phase } from './game';

interface GraveFortunesAPI {
	phases: Phase[];
	playRound(stake: number): RoundResult;
	simulate(rounds: number, stake: number, seed?: number): { rounds: number; stake: number; averageWin: number };
}

// Bullet feature (UI layer only) types for future extension
export type BulletType = 'gold' | 'silver';
export interface BulletConfig { goldProbability: number; }

declare global {
	interface Window {
		GraveFortunes: GraveFortunesAPI;
	}
}

export {};
