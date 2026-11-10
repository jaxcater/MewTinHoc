import { loadRepoEnv } from '../envLoader.js';
loadRepoEnv();
const { loadBattleQuestionPool } = await import('../exam/questionPool.js');
const { createBattleStorage } = await import('./storage.js');
if (process.argv.includes('--check')) {
  const source = loadBattleQuestionPool();
  console.log(`Battle: ${source.mcq.length} trắc nghiệm, ${source.tf.length} đúng/sai chung. Chỉ đọc nguồn.`);
} else {
  console.log(`Battle: kho đã có ${createBattleStorage().refill()} đề.`);
}
