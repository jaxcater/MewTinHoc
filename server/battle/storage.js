import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { BATTLE_ROOT, BATTLE_TARGET } from './config.js';
import { buildBattleExam } from './builder.js';
import { loadBattleQuestionPool } from '../exam/questionPool.js';

/** Kho riêng: không thay khoá hay trạng thái kho đề thi thử. */
export function createBattleStorage(root = BATTLE_ROOT) {
  let key;
  const dir = kind => path.join(root, kind);
  function init() {
    for (const name of ['pool', 'rooms']) fs.mkdirSync(dir(name), { recursive: true });
    if (key) return;
    const keyPath = path.join(root, '.key-secret');
    try { key = fs.readFileSync(keyPath); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (['pool', 'rooms'].some(kind => fs.readdirSync(dir(kind)).some(n => n.endsWith('.dat')))) {
        throw new Error('Battle key missing; restore the existing key');
      }
      const generated = crypto.randomBytes(32);
      try { fs.writeFileSync(keyPath, generated, { flag: 'wx', mode: 0o600 }); }
      catch (err) { if (err.code !== 'EEXIST') throw err; }
      key = fs.readFileSync(keyPath);
    }
    if (key.length !== 32) { key = null; throw new Error('Invalid battle key'); }
  }
  function seal(data) {
    init();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
    return Buffer.concat([Buffer.from('MTB1'), iv, cipher.getAuthTag(), encrypted]);
  }
  function read(kind, id) {
    init();
    const buffer = fs.readFileSync(path.join(dir(kind), `${id}.dat`));
    if (buffer.subarray(0, 4).toString() !== 'MTB1') throw new Error('Invalid battle file');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, buffer.subarray(4, 16));
    decipher.setAuthTag(buffer.subarray(16, 32));
    return JSON.parse(Buffer.concat([decipher.update(buffer.subarray(32)), decipher.final()]).toString('utf8'));
  }
  function write(kind, id, data) {
    const buffer = seal(data);
    const target = path.join(dir(kind), `${id}.dat`);
    const tmp = `${target}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(tmp, buffer, { flag: 'wx', mode: 0o600 });
    fs.renameSync(tmp, target);
  }
  function list(kind) {
    init();
    return fs.readdirSync(dir(kind)).filter(n => /^[a-f\d-]{36}\.dat$/.test(n)).map(n => n.slice(0, -4));
  }
  function remove(kind, id) { fs.unlinkSync(path.join(dir(kind), `${id}.dat`)); }
  function refill() {
    const ids = list('pool');
    // Kiểm tra khoá trước khi ghi thêm; lỗi quyền/hỏng dữ liệu không xoá file.
    if (ids.length) read('pool', ids[0]);
    if (ids.length >= BATTLE_TARGET) return ids.length;
    const source = loadBattleQuestionPool();
    for (let count = ids.length; count < BATTLE_TARGET; count++) {
      const exam = buildBattleExam(source);
      write('pool', exam.id, exam);
    }
    return BATTLE_TARGET;
  }
  function take() {
    let ids = list('pool');
    if (!ids.length) { refill(); ids = list('pool'); }
    const id = ids[crypto.randomInt(ids.length)];
    const exam = read('pool', id);
    // Một tiến trình, thao tác đồng bộ: một đề chỉ được cấp một lần.
    remove('pool', id);
    return exam;
  }
  return { init, read, write, list, remove, refill, take };
}
