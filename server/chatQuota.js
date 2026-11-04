import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const CHAT_DAILY_LIMIT = 5;
const DEFAULT_DIRECTORY = new URL('../var/chat-usage/', import.meta.url);

// Each account has its own file; updates are synchronous and atomic in one Node process.
export function createChatQuota(directory = process.env.CHAT_USAGE_DIR || DEFAULT_DIRECTORY, now = Date.now) {
  const root = directory instanceof URL ? fileURLToPath(directory) : path.resolve(directory);
  function read(userId) {
    const time = now();
    const day = new Date(time + 7 * 3600000).toISOString().slice(0, 10);
    const resetAt = new Date(Date.parse(day + 'T00:00:00+07:00') + 86400000).toISOString();
    const file = path.join(root, crypto.createHash('sha256').update(userId).digest('hex') + '.json');
    let used = 0;
    try {
      const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (stored.day === day) {
        if (!Number.isInteger(stored.used) || stored.used < 0) throw new Error('Invalid chat quota');
        used = stored.used;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return { file, day, used, resetAt };
  }
  function view(record) {
    return { limit: CHAT_DAILY_LIMIT, used: record.used,
      remaining: Math.max(0, CHAT_DAILY_LIMIT - record.used), resetAt: record.resetAt };
  }
  return {
    status(userId) { return view(read(userId)); },
    consume(userId) {
      const record = read(userId);
      if (record.used >= CHAT_DAILY_LIMIT) return { allowed: false, quota: view(record) };
      record.used += 1;
      fs.mkdirSync(path.dirname(record.file), { recursive: true });
      const temporary = record.file + '.' + crypto.randomUUID() + '.tmp';
      fs.writeFileSync(temporary, JSON.stringify({ day: record.day, used: record.used }), { mode: 0o600 });
      fs.renameSync(temporary, record.file);
      return { allowed: true, quota: view(record) };
    },
  };
}

export const chatQuota = createChatQuota();
