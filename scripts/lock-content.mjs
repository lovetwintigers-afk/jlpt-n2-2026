/**
 * 產生內容鎖定檔。
 *
 * 使用者開始作答之後，已經出過的題目就不能再改動 id、正解、或選項順序 ——
 * 因為進度紀錄存的是「這題我選了 B」，選項一換位置，那筆紀錄就指向別的東西，
 * 錯題本會顯示錯誤的資訊。
 *
 * 這個腳本把目前所有題目的結構寫進 content/.lock.json，
 * 之後由測試把關。新增的題目不在鎖定檔裡，可以自由加。
 *
 * 用法：
 *   node scripts/lock-content.mjs          產生／更新鎖定檔
 *   node scripts/lock-content.mjs --check  只檢查，不寫入
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const QUESTIONS_DIR = path.join(ROOT, 'content/questions');
const LOCK_PATH = path.join(ROOT, 'content/.lock.json');

function readAllQuestions() {
  const questions = [];
  for (const file of fs.readdirSync(QUESTIONS_DIR).sort()) {
    if (!file.endsWith('.json')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf8'));
    questions.push(...data.questions);
  }
  return questions;
}

/** 一題的結構指紋：正解 + 依序排列的選項內容 */
function fingerprint(question) {
  return {
    answer: question.answer,
    options: question.options.map((option) => `${option.key}:${option.text}`),
  };
}

const existing = fs.existsSync(LOCK_PATH)
  ? JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'))
  : { note: '', lockedAt: '', questions: {} };

const lock = {
  note: '使用者開始作答後，這裡列出的題目就不可再改動正解或選項順序。詳見 scripts/lock-content.mjs。',
  lockedAt: existing.lockedAt || new Date().toISOString().slice(0, 10),
  questions: { ...existing.questions },
};

let added = 0;
for (const question of readAllQuestions()) {
  if (lock.questions[question.id]) continue; // 已鎖定的不覆蓋
  lock.questions[question.id] = fingerprint(question);
  added++;
}

if (process.argv.includes('--check')) {
  console.log(`鎖定檔已有 ${Object.keys(existing.questions ?? {}).length} 題，本次會新增 ${added} 題`);
  process.exit(0);
}

fs.writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + '\n');
console.log(`已寫入 ${LOCK_PATH}`);
console.log(`  鎖定題數：${Object.keys(lock.questions).length}（本次新增 ${added} 題）`);
