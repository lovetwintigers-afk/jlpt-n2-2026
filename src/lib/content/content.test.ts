/**
 * 驗證 content/ 底下實際的學習內容。
 *
 * 這是「內容有沒有寫壞」的把關 —— 每次 npm run test 都會跑，
 * 新增內容打錯字時會在這裡被抓到，而不是等到畫面上才發現。
 */

import { describe, it, expect } from 'vitest';
import { contentIndex } from './registry';
import { parseRuby, rubyToPlainText } from './ruby';
import { getWeekContent, getWeekReadiness, isTaskItemResolvable } from './queries';
import { getDayOutline } from '@/lib/course/outline';
import type { DayIndex } from '@/lib/date/courseCalendar';

describe('實際內容的完整性', () => {
  it('所有內容檔都通過驗證，沒有任何問題', () => {
    // 失敗時把問題印出來，直接看得到是哪個檔案、哪個欄位
    expect(contentIndex.issues, JSON.stringify(contentIndex.issues, null, 2)).toEqual([]);
  });

  it('已經載入了第 1、2 週的內容', () => {
    expect(contentIndex.weeks.has(1)).toBe(true);
    expect(contentIndex.weeks.has(2)).toBe(true);
  });

  it('每個任務項目所指向的內容都存在', () => {
    for (const [week, content] of contentIndex.weeks) {
      for (const day of content.days) {
        for (const item of day.items) {
          expect(
            isTaskItemResolvable(item),
            `第 ${week} 週第 ${day.dayIndex} 天的 ${item.kind} 找不到對應內容`,
          ).toBe(true);
        }
      }
    }
  });

  it('每一天的 dayIndex 都能對應到課綱裡的那一天', () => {
    for (const [week, content] of contentIndex.weeks) {
      for (const day of content.days) {
        expect(
          getDayOutline(week, day.dayIndex as DayIndex),
          `第 ${week} 週沒有第 ${day.dayIndex} 天`,
        ).toBeDefined();
      }
    }
  });
});

describe('著作權欄位', () => {
  it('每一筆語彙、文法、題目、文章都有來源', () => {
    const all = [
      ...[...contentIndex.vocabularySets.values()].flatMap((s) => s.items),
      ...[...contentIndex.grammarSets.values()].flatMap((s) => s.items),
      ...contentIndex.questions.values(),
      ...contentIndex.passages.values(),
      ...contentIndex.comparisons.values(),
    ];
    expect(all.length).toBeGreaterThan(0);
    for (const item of all) {
      expect(item.source.label, `${item.id} 缺少來源標示`).toBeTruthy();
    }
  });

  it('沒有任何內容宣稱自己是官方真題', () => {
    const texts = [
      ...[...contentIndex.quizzes.values()].map((q) => `${q.title} ${q.description ?? ''}`),
      ...[...contentIndex.questions.values()].map((q) => q.source.label + (q.source.note ?? '')),
    ];
    for (const text of texts) {
      expect(text).not.toMatch(/公式問題|過去問|official/i);
    }
  });
});

describe('日文標註格式', () => {
  it('所有日文欄位都能正確解析成振假名', () => {
    const japaneseFields: { label: string; text: string }[] = [];

    for (const set of contentIndex.vocabularySets.values()) {
      for (const item of set.items) {
        japaneseFields.push({ label: `${item.id}.word`, text: item.word });
        item.examples.forEach((ex, i) =>
          japaneseFields.push({ label: `${item.id}.examples[${i}]`, text: ex.jp }),
        );
      }
    }
    for (const set of contentIndex.grammarSets.values()) {
      for (const item of set.items) {
        item.examples.forEach((ex, i) =>
          japaneseFields.push({ label: `${item.id}.examples[${i}]`, text: ex.jp }),
        );
      }
    }
    for (const question of contentIndex.questions.values()) {
      japaneseFields.push({ label: `${question.id}.stem`, text: question.stem });
      question.options.forEach((o) =>
        japaneseFields.push({ label: `${question.id}.option${o.key}`, text: o.text }),
      );
    }
    for (const passage of contentIndex.passages.values()) {
      passage.paragraphs.forEach((p, i) =>
        japaneseFields.push({ label: `${passage.id}.paragraphs[${i}]`, text: p }),
      );
    }

    expect(japaneseFields.length).toBeGreaterThan(50);
    for (const field of japaneseFields) {
      expect(() => parseRuby(field.text), field.label).not.toThrow();
    }
  });

  /**
   * 撰寫內容時混進過西里爾字母（例如「увеличение」），
   * 那種字元不會讓 JSON 或 schema 出錯，但會被語音引擎唸出來、也會顯示在畫面上。
   * 這裡把「日文欄位裡不該出現的文字系統」全部擋掉。
   */
  it('日文欄位不含西里爾、希臘、韓文等不該出現的字元', () => {
    const forbidden = /[Ѐ-ӿͰ-Ͽ가-힯֐-׿؀-ۿ]/;
    const fields: { label: string; text: string }[] = [];

    for (const set of contentIndex.vocabularySets.values()) {
      for (const item of set.items) {
        fields.push({ label: `${item.id}.word`, text: item.word });
        fields.push({ label: `${item.id}.reading`, text: item.reading });
        item.examples.forEach((ex, i) => fields.push({ label: `${item.id}.ex${i}`, text: ex.jp }));
      }
    }
    for (const set of contentIndex.grammarSets.values()) {
      for (const item of set.items) {
        fields.push({ label: `${item.id}.pattern`, text: item.pattern });
        fields.push({ label: `${item.id}.connection`, text: item.connection });
        item.examples.forEach((ex, i) => fields.push({ label: `${item.id}.ex${i}`, text: ex.jp }));
      }
    }
    for (const q of contentIndex.questions.values()) {
      fields.push({ label: `${q.id}.stem`, text: q.stem });
      q.options.forEach((o) => fields.push({ label: `${q.id}.opt${o.key}`, text: o.text }));
    }
    for (const p of contentIndex.passages.values()) {
      p.paragraphs.forEach((para, i) => fields.push({ label: `${p.id}.para${i}`, text: para }));
    }
    for (const l of contentIndex.listening.values()) {
      if (l.ttsScript) fields.push({ label: `${l.id}.ttsScript`, text: l.ttsScript });
      l.transcript.forEach((line, i) => fields.push({ label: `${l.id}.transcript${i}`, text: line }));
    }

    expect(fields.length).toBeGreaterThan(100);
    for (const field of fields) {
      const match = forbidden.exec(field.text);
      expect(match, `${field.label} 含有不該出現的字元「${match?.[0]}」`).toBeNull();
    }
  });

  it('語彙的 reading 欄位與標註的讀音一致', () => {
    for (const set of contentIndex.vocabularySets.values()) {
      for (const item of set.items) {
        const segments = parseRuby(item.word);
        const fromRuby = segments.map((s) => s.rt ?? s.base).join('');
        expect(fromRuby, `${item.id}：word 的讀音與 reading 欄位不一致`).toBe(item.reading);
      }
    }
  });

  it('中文說明欄位裡沒有殘留振假名標註（那樣會把大括號原樣顯示出來）', () => {
    const chineseFields: { label: string; text: string }[] = [];

    for (const set of contentIndex.vocabularySets.values()) {
      for (const item of set.items) {
        chineseFields.push({ label: `${item.id}.meaningZh`, text: item.meaningZh });
        if (item.note) chineseFields.push({ label: `${item.id}.note`, text: item.note });
        item.examples.forEach((ex, i) =>
          chineseFields.push({ label: `${item.id}.examples[${i}].zh`, text: ex.zh }),
        );
      }
    }
    for (const set of contentIndex.grammarSets.values()) {
      for (const item of set.items) {
        chineseFields.push({ label: `${item.id}.meaningZh`, text: item.meaningZh });
        chineseFields.push({ label: `${item.id}.nuanceZh`, text: item.nuanceZh });
        if (item.cautionZh) chineseFields.push({ label: `${item.id}.cautionZh`, text: item.cautionZh });
        item.examples.forEach((ex, i) =>
          chineseFields.push({ label: `${item.id}.examples[${i}].zh`, text: ex.zh }),
        );
      }
    }
    for (const q of contentIndex.questions.values()) {
      chineseFields.push({ label: `${q.id}.explanationZh`, text: q.explanationZh });
      for (const [key, note] of Object.entries(q.distractorNotesZh ?? {})) {
        if (note) chineseFields.push({ label: `${q.id}.distractorNotesZh.${key}`, text: note });
      }
    }
    for (const c of contentIndex.comparisons.values()) {
      chineseFields.push({ label: `${c.id}.summaryZh`, text: c.summaryZh });
      c.axes.forEach((axis) =>
        axis.cells.forEach((cell, i) =>
          chineseFields.push({ label: `${c.id}.axes.${axis.label}[${i}]`, text: cell }),
        ),
      );
    }
    for (const p of contentIndex.passages.values()) {
      if (p.translationZh) chineseFields.push({ label: `${p.id}.translationZh`, text: p.translationZh });
    }
    for (const week of contentIndex.weeks.values()) {
      for (const day of week.days) {
        for (const item of day.items) {
          if (item.kind === 'note') {
            chineseFields.push({ label: `week${week.week}.day${day.dayIndex}.note`, text: item.body });
          }
        }
      }
    }

    expect(chineseFields.length).toBeGreaterThan(50);
    for (const field of chineseFields) {
      expect(field.text, `${field.label} 含有振假名標註，應改寫成全形括號`).not.toMatch(/[{}]/);
    }
  });

  it('沒有把讀音寫成「漢字（かんじ）」這種純文字形式', () => {
    for (const set of contentIndex.vocabularySets.values()) {
      for (const item of set.items) {
        expect(rubyToPlainText(parseRuby(item.word)), item.id).not.toMatch(/[（(][ぁ-ん]+[）)]/);
      }
    }
  });
});

describe('跨週的內容品質（一次撰寫 17 週才做得到的檢查）', () => {
  it('同一個語彙不會在不同週重複出現', () => {
    const seen = new Map<string, string>();
    for (const set of contentIndex.vocabularySets.values()) {
      for (const item of set.items) {
        const key = `${item.word}|${item.reading}`;
        const previous = seen.get(key);
        expect(
          previous,
          `語彙「${item.reading}」重複：${previous} 與 ${item.id}（第 ${item.week} 週）`,
        ).toBeUndefined();
        seen.set(key, `${item.id}（第 ${item.week} 週）`);
      }
    }
  });

  it('同一個文法句型不會在不同週重複教', () => {
    const seen = new Map<string, string>();
    for (const set of contentIndex.grammarSets.values()) {
      for (const item of set.items) {
        const previous = seen.get(item.pattern);
        expect(
          previous,
          `文法「${item.pattern}」重複：${previous} 與 ${item.id}（第 ${item.week} 週）`,
        ).toBeUndefined();
        seen.set(item.pattern, `${item.id}（第 ${item.week} 週）`);
      }
    }
  });

  it('id 的週次前綴與 week 欄位一致（避免複製貼上時漏改）', () => {
    const check = (id: string, week: number, label: string) => {
      const match = /w(\d{2})/.exec(id);
      if (!match) return;
      expect(Number(match[1]), `${label}：id 是 ${id} 但 week 是 ${week}`).toBe(week);
    };
    for (const set of contentIndex.vocabularySets.values()) {
      for (const item of set.items) check(item.id, item.week, item.id);
    }
    for (const set of contentIndex.grammarSets.values()) {
      for (const item of set.items) check(item.id, item.week, item.id);
    }
    for (const question of contentIndex.questions.values()) {
      check(question.id, question.week, question.id);
    }
  });

  it('難度隨週次遞進：基礎階段以 basic/core 為主，不出現 advanced 佔多數', () => {
    const byWeek = new Map<number, string[]>();
    for (const set of contentIndex.vocabularySets.values()) {
      for (const item of set.items) {
        byWeek.set(item.week, [...(byWeek.get(item.week) ?? []), item.difficulty]);
      }
    }
    for (const [week, difficulties] of byWeek) {
      if (week > 5 || difficulties.length === 0) continue;
      const advanced = difficulties.filter((d) => d === 'N2-advanced').length;
      expect(
        advanced / difficulties.length,
        `第 ${week} 週（基礎階段）的 N2-advanced 比例過高`,
      ).toBeLessThanOrEqual(0.25);
    }
  });
});

describe('題目品質', () => {
  const questions = [...contentIndex.questions.values()];

  it('每題都有解說', () => {
    for (const q of questions) {
      expect(q.explanationZh.length, `${q.id} 的解說太短`).toBeGreaterThan(5);
    }
  });

  it('選項數量一致（全部 4 選 1）', () => {
    for (const q of questions) {
      expect(q.options.length, q.id).toBe(4);
    }
  });

  /**
   * 「不會就選 B」不能變成有效策略。
   * 題數少時容忍度放寬，題數多了就要求接近平均（每個選項理論值 25%）。
   */
  it('正確答案的分布不會偏向某個選項', () => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    for (const q of questions) counts[q.answer]++;
    const label = `答案分布：${JSON.stringify(counts)}（共 ${questions.length} 題）`;

    if (questions.length >= 40) {
      // 每個選項都要落在 12%–40% 之間
      for (const [key, count] of Object.entries(counts)) {
        const ratio = count / questions.length;
        expect(ratio, `${label}／選項 ${key} 佔比 ${Math.round(ratio * 100)}%`).toBeGreaterThanOrEqual(0.12);
        expect(ratio, `${label}／選項 ${key} 佔比 ${Math.round(ratio * 100)}%`).toBeLessThanOrEqual(0.4);
      }
    } else {
      expect(Math.max(...Object.values(counts)), label).toBeLessThanOrEqual(questions.length / 2);
    }
  });

  it('讀解題的 contextId 都指得到文章', () => {
    for (const q of questions) {
      if (q.contextId) {
        expect(
          contentIndex.passages.has(q.contextId) || contentIndex.listening.has(q.contextId),
          `${q.id} 的 contextId ${q.contextId} 找不到`,
        ).toBe(true);
      }
    }
  });

  it('題幹的挖空符號寫法一致', () => {
    for (const q of questions) {
      if (q.stem.includes('＿')) {
        expect(q.stem, `${q.id} 的挖空應統一用兩個全形底線`).toContain('＿＿');
      }
    }
  });
});

describe('測驗定義', () => {
  it('模擬考與診斷測驗一律交卷後才顯示答案', () => {
    for (const quiz of contentIndex.quizzes.values()) {
      if (quiz.kind === 'diagnostic' || quiz.kind === 'full-mock' || quiz.kind === 'section-mock') {
        expect(quiz.showAnswerMode, quiz.id).toBe('after-submit');
      }
    }
  });

  it('第 1 週的診斷測驗存在，且涵蓋語彙、文法、讀解', () => {
    const diag1 = contentIndex.quizzes.get('diag-01');
    const diag2 = contentIndex.quizzes.get('diag-02');
    expect(diag1).toBeDefined();
    expect(diag2).toBeDefined();

    const skills = new Set(
      [...diag1!.questionIds, ...diag2!.questionIds].map(
        (id) => contentIndex.questions.get(id)!.skill,
      ),
    );
    expect(skills).toContain('vocabulary');
    expect(skills).toContain('grammar');
    expect(skills).toContain('reading');
  });

  it('診斷測驗不限時（第一次測驗不加時間壓力）', () => {
    expect(contentIndex.quizzes.get('diag-01')!.timeLimitSec).toBeUndefined();
    expect(contentIndex.quizzes.get('diag-02')!.timeLimitSec).toBeUndefined();
  });
});

describe('內容備妥狀態', () => {
  it('第 1、2 週已備妥，尚未撰寫的週次標為未建立', () => {
    expect(getWeekReadiness(1)).toBe('ready');
    expect(getWeekReadiness(2)).toBe('ready');
    expect(getWeekReadiness(17)).toBe('empty');
  });

  it('沒有內容的週次不會拋錯，只是回傳空的任務清單', () => {
    expect(getWeekContent(10)).toBeUndefined();
    expect(() => getWeekReadiness(10)).not.toThrow();
  });
});
