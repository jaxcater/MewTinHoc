import '../envLoader.js';
import path from 'node:path';
import { DATA_ROOT } from '../exam/config.js';

export const BATTLE_ROOT = path.join(DATA_ROOT, 'battle');
export const BATTLE_DURATION = 15 * 60 * 1000;
export const BATTLE_TARGET = 100;
export const REFILL_INTERVAL = 5 * 60 * 1000;
export const ROOM_SIZE = 3;
export const WAITING_TTL = 2 * 60 * 1000;
export const RESULT_TTL = 24 * 60 * 60 * 1000;
