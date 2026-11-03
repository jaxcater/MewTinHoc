#!/usr/bin/env node
// ============================================================
//  Worker: bù đề vào kho cho đủ mục tiêu (15 ICT + 15 CS)
//
//  Chạy định kỳ bằng cron/pm2 (KHÔNG dùng while(true) trong process API):
//    node server/exam/worker.js              → bù tới mục tiêu rồi thoát
//    node server/exam/worker.js --check      → chỉ in trạng thái, không ghi
//    node server/exam/worker.js --reset      → xoá sạch kho đề rồi bù lại
//    node server/exam/worker.js --loop       → vòng lặp 10 phút (chỉ dev)
//    node server/exam/worker.js --simulate 3 → sinh thử, in cấu trúc đề
//
//  Cron trên VPS (aaPanel hoặc crontab), mỗi 10 phút:
//    */10 * * * * cd /www/wwwroot/mewtinhoc && node server/exam/worker.js >> /var/log/mewtinhoc-exam.log 2>&1
// ============================================================
import fs from 'node:fs';
import {
  DATA_ROOT,
  LOCK_FILE,
  POOL_TARGET,
  describeLayout,
  ensureDirs,
} from './config.js';
import { describePool } from './builder.js';
import {
  getPool,
  refillPool,
  validatePool,
} from './examService.js';
import {
  clearPool,
  countPool,
  pruneSessions,
  pruneTmp,
} from './storage.js';

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);
const flagValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
};

// ------------------------------------------------------------
//  Lock: chống 2 worker chạy chồng (cron 10' + admin bấm tay)
// ------------------------------------------------------------
const LOCK_STALE_MS = 5 * 60 * 1000;

function acquireLock() {
  ensureDirs();
  try {
    const stat = fs.statSync(LOCK_FILE);
    if (Date.now() - stat.mtimeMs < LOCK_STALE_MS) {
      return false; // worker khác đang chạy
    }
  } catch {
    /* chưa có lock */
  }
  try {
    fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf8');
    return true;
  } catch {
    return false;
  }
}

function releaseLock() {
  try {
    const pid = fs.readFileSync(LOCK_FILE, 'utf8').trim();
    if (pid === String(process.pid)) fs.unlinkSync(LOCK_FILE);
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------
//  Lệnh
// ------------------------------------------------------------

async function printStatus() {
  const layout = describeLayout();
  console.log('=== Bố cục thư mục ===');
  console.log(`  DATA_ROOT   ${DATA_ROOT}`);
  console.log(`  Nguồn       ${layout.sourceDir}`);
  console.log(`  Kho đề      ${layout.examRoot}`);
  layout.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));

  const pool = await getPool();

  if (pool.stats.files.length) {
    console.log('\n=== File nguồn đã đọc ===');
    for (const file of pool.stats.files) {
      const status = file.rejected > 0 ? ` (loại ${file.rejected})` : '';
      console.log(
        `  ${file.file.padEnd(24)} ${String(file.accepted).padStart(3)} câu dùng được` +
          ` / ${String(file.records).padStart(3)} bản ghi${status}`,
      );
    }
  }

  console.log('\n=== Kho câu hỏi ===');
  console.log(describePool(pool));

  const { problems, warnings, plan } = validatePool(pool);
  if (warnings.length) {
    console.log('\n⚠ CẢNH BÁO:');
    warnings.forEach((warning) => console.log('  - ' + warning));
  }
  if (problems.length) {
    console.log('\n✗ KHÔNG ĐỦ CÂU:');
    problems.forEach((problem) => console.log('  - ' + problem));
  } else {
    console.log('\n✓ Kho câu hỏi đủ để sinh đề');
  }

  console.log(
    '\nPhân bổ thực tế mỗi đề: ' +
      Object.entries(plan)
        .map(([topic, count]) => `${topic}=${count}`)
        .join(' · '),
  );

  const counts = countPool();
  console.log('\n=== Kho đề ===');
  console.log(`  ICT: ${counts.ict}/${POOL_TARGET.ict}`);
  console.log(`  CS:  ${counts.cs}/${POOL_TARGET.cs}`);
  console.log(`  Tổng: ${counts.total}/${POOL_TARGET.ict + POOL_TARGET.cs}`);

  return problems.length === 0;
}

async function runRefill({ quiet = false } = {}) {
  ensureDirs();
  const started = Date.now();
  const outcome = await refillPool();
  const elapsed = Date.now() - started;

  if (!quiet) {
    if (outcome.created === 0 && outcome.failed === 0) {
      console.log(
        `[${new Date().toISOString()}] Kho đã đủ ` +
          `(ICT ${outcome.counts.ict}/${POOL_TARGET.ict}, CS ${outcome.counts.cs}/${POOL_TARGET.cs})`,
      );
    } else {
      console.log(
        `[${new Date().toISOString()}] Sinh ${outcome.created} đề trong ${elapsed}ms ` +
          `→ ICT ${outcome.counts.ict}/${POOL_TARGET.ict}, CS ${outcome.counts.cs}/${POOL_TARGET.cs}`,
      );
    }
  }

  if (outcome.failed > 0) {
    console.error(`[exam] ${outcome.failed} đề sinh thất bại — kiểm tra kho câu hỏi`);
    process.exitCode = 1;
  }

  const prunedSessions = pruneSessions();
  const prunedTmp = pruneTmp();
  if (!quiet && (prunedSessions || prunedTmp)) {
    console.log(`[exam] Dọn dẹp: ${prunedSessions} session cũ, ${prunedTmp} file tạm`);
  }
}

/**
 * Sinh thử đề và in cấu trúc — dùng để kiểm tra sau khi cập nhật dữ liệu nguồn.
 * KHÔNG ghi vào kho thật, KHÔNG trả đáp án.
 */
async function simulate(count) {
  const total = Math.max(1, Number(count) || 1);
  const pool = await getPool();
  const { problems } = validatePool(pool);

  if (problems.length) {
    console.error('✗ Không thể sinh đề:\n  ' + problems.join('\n  '));
    process.exitCode = 1;
    return;
  }

  const { buildExam } = await import('./builder.js');

  for (const track of ['ict', 'cs']) {
    for (let i = 0; i < total; i += 1) {
      const { publicExam, meta } = buildExam(pool, track);
      const dist = meta.plan;
      const partIIPart = publicExam.partII
        .map((question) => question.scenario.slice(0, 34))
        .join(' | ');

      console.log(`\n${track.toUpperCase()} #${i + 1}  ${meta.examId}`);
      console.log(
        '  Phần I  ' +
          Object.entries(dist)
            .map(([topic, n]) => `${topic}:${n}`)
            .join(' ') +
          ` = ${meta.partICount} câu`,
      );
      console.log(
        `  Phần II ${meta.partIICount} câu · ${publicExam.partII[0].statements.length} ý/câu`,
      );
      console.log(`  Đ/S:     ${partIIPart}`);
      if (meta.reallocated.length) {
        console.log('  ⚠ ' + meta.reallocated.join(' | '));
      }
    }
  }
}

// ------------------------------------------------------------
//  Entry point
// ------------------------------------------------------------

async function main() {
  // Các lệnh chỉ đọc, không cần lock
  if (hasFlag('--check')) {
    const ok = await printStatus();
    if (!ok) process.exitCode = 1;
    return;
  }

  if (hasFlag('--simulate')) {
    await simulate(flagValue('--simulate', 1));
    return;
  }

  if (!acquireLock()) {
    console.log(
      `[${new Date().toISOString()}] Worker khác đang chạy, bỏ qua lượt này`,
    );
    return;
  }

  try {
    if (hasFlag('--reset')) {
      const removed = clearPool();
      console.log(`[exam] Đã xoá ${removed} đề cũ khỏi kho`);
    }

    await runRefill();

    if (hasFlag('--loop')) {
      const intervalMs = 10 * 60 * 1000;
      console.log(`[exam] Chế độ loop: kiểm tra lại sau ${intervalMs / 60000} phút`);
      setInterval(() => {
        if (!acquireLock()) return;
        runRefill()
          .catch((err) => console.error('[exam] Lỗi vòng lặp:', err.message))
          .finally(releaseLock);
      }, intervalMs);
      return; // giữ process sống
    }
  } finally {
    if (!hasFlag('--loop')) releaseLock();
  }
}

// Thoát êm khi cron kill giữa chừng
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    releaseLock();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[exam] Worker lỗi:', err);
  releaseLock();
  process.exitCode = 1;
});
