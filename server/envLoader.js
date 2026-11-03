// ============================================================
//  Nạp biến môi trường phía máy chủ từ .env.local / .env
//
//  Vite chỉ tự nạp các biến có tiền tố VITE_ cho phía client, nên các
//  khoá bí mật (Gemini, Botpress, Supabase service…) phải được đọc thủ
//  công ở đây. `.evn.local` giữ lại để tương thích với các bản deploy
//  gõ nhầm tên file từ trước.
//
//  Nguyên tắc: biến đã có trong process.env KHÔNG bị ghi đè — PM2 và
//  biến môi trường của hệ điều hành luôn thắng file.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');

const ENV_FILES = ['.env.local', '.evn.local', '.env'];

/** Parse nội dung .env: chịu được BOM, CRLF, dấu nháy và tiền tố `export` */
export function parseEnvContent(content) {
  const result = {};
  const text = String(content).replace(/^\uFEFF/, '');

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eqIdx = normalized.indexOf('=');
    if (eqIdx <= 0) continue;

    const key = normalized.slice(0, eqIdx).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let val = normalized.slice(eqIdx + 1).trim();
    const quoted = val.match(/^(['"])([\s\S]*)\1$/);
    val = quoted ? quoted[2] : val.replace(/\s+#.*$/, '').trim();
    result[key] = val;
  }

  return result;
}

let loaded = false;
/** Danh sách file đã thực sự cung cấp biến — chỉ để chẩn đoán, không lộ giá trị */
const loadedFiles = [];

/** Nạp 1 lần cho cả tiến trình. Gọi được nhiều lần, không tốn đĩa. */
export function loadRepoEnv({ force = false } = {}) {
  if (loaded && !force) return loadedFiles;
  loaded = true;
  loadedFiles.length = 0;

  for (const file of ENV_FILES) {
    const fullPath = path.join(rootDir, file);
    if (!fs.existsSync(fullPath)) continue;

    let vars;
    try {
      vars = parseEnvContent(fs.readFileSync(fullPath, 'utf8'));
    } catch (err) {
      console.warn(`[env] Không đọc được ${file}: ${err.message}`);
      continue;
    }

    let used = false;
    for (const [key, value] of Object.entries(vars)) {
      if (process.env[key]) continue;
      process.env[key] = value;
      used = true;
    }
    if (used) loadedFiles.push(file);
  }

  return loadedFiles;
}

/**
 * Đọc 1 biến môi trường đã trim.
 * @param {string} key
 * @param {string} fallback giá trị dùng khi biến trống hoặc không tồn tại
 */
export function readEnv(key, fallback = '') {
  loadRepoEnv();
  const value = process.env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

/** Kiểm tra nhanh một khoá đã được cấu hình thật (không phải placeholder) */
export function hasEnv(key) {
  const value = readEnv(key, '');
  if (!value) return false;
  return !/^(your|<|changeme|todo|xxx)/i.test(value);
}

export { rootDir as repoRoot };
