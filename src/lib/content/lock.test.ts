/**
 * 內容鎖定測試。
 *
 * 這道測試保護的是**使用者已經累積的學習紀錄**。
 *
 * 進度紀錄存的是「這題我選了 B」。如果之後把 B 和 D 的內容對調，
 * 那筆紀錄就指向別的選項了，錯題本會顯示錯誤的資訊。
 * 同理，改掉正解會讓已經記錄的對錯與現況不符。
 *
 * 所以 content/.lock.json 裡列出的題目，正解與選項順序都不可再改動。
 * 新增題目不受影響 —— 不在鎖定檔裡的題目可以自由增加。
 *
 * 真的需要改一道已鎖定的題目時（例如發現答案標錯）：
 * 1. 先在 content/.lock.json 手動刪掉那一題的項目
 * 2. 改題目
 * 3. 執行 node scripts/lock-content.mjs 重新鎖定
 * 4. **明確告知使用者哪一題變了**，讓她知道舊紀錄對那題已不適用
 */

import { describe, it, expect } from 'vitest';
import { contentIndex } from './registry';
import lockFile from '../../../content/.lock.json';

interface LockedQuestion {
  answer: string;
  options: string[];
}

const locked = lockFile.questions as Record<string, LockedQuestion>;

describe('已出過的題目不可改動（保護使用者的學習紀錄）', () => {
  it('鎖定檔涵蓋第 1–7 週的所有題目', () => {
    const lockedCount = Object.keys(locked).length;
    expect(lockedCount).toBeGreaterThanOrEqual(122);
  });

  it('鎖定的題目仍然存在（不可刪除，刪了會讓錯題紀錄變成孤兒）', () => {
    for (const id of Object.keys(locked)) {
      expect(contentIndex.questions.has(id), `題目 ${id} 被刪掉了`).toBe(true);
    }
  });

  it('鎖定的題目正解未被改動', () => {
    for (const [id, expected] of Object.entries(locked)) {
      const question = contentIndex.questions.get(id);
      if (!question) continue;
      expect(
        question.answer,
        `${id} 的正解從 ${expected.answer} 改成了 ${question.answer}。` +
          `使用者已記錄的對錯會與現況不符 —— 詳見 lock.test.ts 開頭的修改步驟。`,
      ).toBe(expected.answer);
    }
  });

  it('鎖定的題目選項順序與內容未被改動', () => {
    for (const [id, expected] of Object.entries(locked)) {
      const question = contentIndex.questions.get(id);
      if (!question) continue;
      const current = question.options.map((option) => `${option.key}:${option.text}`);
      expect(
        current,
        `${id} 的選項變了。使用者紀錄中的「我選了 B」會指向不同的內容 —— ` +
          `詳見 lock.test.ts 開頭的修改步驟。`,
      ).toEqual(expected.options);
    }
  });

  it('新增的題目不受鎖定限制（第 8 週以後可以自由加）', () => {
    const unlocked = [...contentIndex.questions.keys()].filter((id) => !locked[id]);
    // 目前應該沒有未鎖定的題目；之後新增的題目會出現在這裡，這是正常的
    for (const id of unlocked) {
      expect(contentIndex.questions.get(id)).toBeDefined();
    }
  });
});

describe('其他不可改動的識別碼', () => {
  it('已存在的語彙集與文法集 setId 不可改名（會讓任務完成紀錄變成孤兒）', () => {
    const requiredVocab = ['voc-w01', 'voc-w02', 'voc-w03', 'voc-w04', 'voc-w05', 'voc-w06', 'voc-w07'];
    const requiredGrammar = ['gra-w01', 'gra-w02', 'gra-w03', 'gra-w04', 'gra-w05', 'gra-w06', 'gra-w07'];
    for (const id of requiredVocab) {
      expect(contentIndex.vocabularySets.has(id), `語彙集 ${id} 不見了`).toBe(true);
    }
    for (const id of requiredGrammar) {
      expect(contentIndex.grammarSets.has(id), `文法集 ${id} 不見了`).toBe(true);
    }
  });

  it('已存在的測驗 id 不可改名（會讓測驗成績紀錄變成孤兒）', () => {
    const required = [
      'diag-01',
      'diag-02',
      'w02-review',
      'w03-review',
      'w04-review',
      'w04-reading',
      'w04-listening',
      'w05-review',
      'w05-reading',
      'w05-listening',
      'w05-stage-review',
      'w06-review',
      'w06-reading',
      'w06-listening',
      'w07-review',
      'w07-reading',
      'w07-listening',
    ];
    for (const id of required) {
      expect(contentIndex.quizzes.has(id), `測驗 ${id} 不見了`).toBe(true);
    }
  });
});
