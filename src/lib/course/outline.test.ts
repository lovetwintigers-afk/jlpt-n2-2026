import { describe, it, expect } from 'vitest';
import {
  WEEK_OUTLINES,
  getWeekOutline,
  getDayOutline,
  getCountedDayCount,
  getWeekEstimatedMinutes,
  STAGE_LABELS,
  FOCUS_LABELS,
} from './outline';
import { TOTAL_WEEKS, getDateForWeekDay, getDayOfWeek } from '@/lib/date/courseCalendar';
import type { DayIndex } from '@/lib/date/courseCalendar';

describe('課綱結構完整性', () => {
  it('恰好 17 週，週次為 1–17 且不重複', () => {
    expect(WEEK_OUTLINES).toHaveLength(TOTAL_WEEKS);
    const weeks = WEEK_OUTLINES.map((w) => w.week);
    expect(weeks).toEqual(Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1));
  });

  it('每週都有 7 天，dayIndex 為 1–7 且不重複', () => {
    for (const outline of WEEK_OUTLINES) {
      expect(outline.days, `第 ${outline.week} 週`).toHaveLength(7);
      expect(outline.days.map((d) => d.dayIndex)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    }
  });

  it('每週都有標題、目標與焦點能力', () => {
    for (const outline of WEEK_OUTLINES) {
      expect(outline.title.length, `第 ${outline.week} 週標題`).toBeGreaterThan(0);
      expect(outline.goals.length, `第 ${outline.week} 週目標`).toBeGreaterThanOrEqual(3);
      expect(outline.focusSkills.length).toBeGreaterThan(0);
    }
  });

  it('所有 stage 與 focus 都有對應的繁中標籤', () => {
    for (const outline of WEEK_OUTLINES) {
      expect(STAGE_LABELS[outline.stage]).toBeTruthy();
      for (const day of outline.days) {
        expect(FOCUS_LABELS[day.focus], `第 ${outline.week} 週第 ${day.dayIndex} 天`).toBeTruthy();
      }
    }
  });
});

describe('標準週的七天節奏（5 學習日 + 1 測驗日 + 1 彈性日）', () => {
  const standardWeeks = WEEK_OUTLINES.filter((w) => w.pattern === 'standard');

  it('標準週共 12 週', () => {
    expect(standardWeeks.map((w) => w.week)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('標準週的焦點順序固定：語彙→文法→讀解→聽解→混合→測驗→彈性', () => {
    for (const outline of standardWeeks) {
      expect(outline.days.map((d) => d.focus), `第 ${outline.week} 週`).toEqual([
        'vocab-kanji',
        'grammar',
        'reading',
        'listening',
        'mixed-review',
        'weekly-quiz',
        'flex',
      ]);
    }
  });

  it('標準週的 Day 7 是彈性日，且不計入完成率', () => {
    for (const outline of standardWeeks) {
      const day7 = outline.days[6]!;
      expect(day7.focus).toBe('flex');
      expect(day7.countsTowardCompletion).toBe(false);
    }
  });

  it('標準週計入完成率的天數為 6', () => {
    for (const outline of standardWeeks) {
      expect(getCountedDayCount(outline.week), `第 ${outline.week} 週`).toBe(6);
    }
  });

  it('標準週每日時間在 15–30 分鐘之間，全週合計約 140 分', () => {
    for (const outline of standardWeeks) {
      for (const day of outline.days.filter((d) => d.countsTowardCompletion)) {
        expect(day.estimatedMinutes, `第 ${outline.week} 週第 ${day.dayIndex} 天`).toBeGreaterThanOrEqual(15);
        expect(day.estimatedMinutes).toBeLessThanOrEqual(30);
      }
      expect(getWeekEstimatedMinutes(outline.week)).toBe(140);
    }
  });
});

describe('例外週', () => {
  it('第 1 週為診斷週，前兩天是診斷測驗', () => {
    const week1 = getWeekOutline(1)!;
    expect(week1.pattern).toBe('diagnostic');
    expect(week1.days[0]!.focus).toBe('diagnostic');
    expect(week1.days[1]!.focus).toBe('diagnostic');
  });

  it('第 14 週為分科模擬，第 5 天聽解 50 分、第 7 天讀解 55 分', () => {
    const week14 = getWeekOutline(14)!;
    expect(week14.pattern).toBe('mock-section');
    expect(week14.days[4]!.estimatedMinutes).toBe(50);
    expect(week14.days[6]!.estimatedMinutes).toBe(55);
  });

  it('第 15、16 週的完整模擬考排在第 7 天，且該日計入完成率', () => {
    for (const week of [15, 16]) {
      const outline = getWeekOutline(week)!;
      expect(outline.pattern).toBe('mock-full');
      const day7 = outline.days[6]!;
      expect(day7.focus).toBe('mock-full');
      expect(day7.countsTowardCompletion).toBe(true);
      expect(day7.timeWarning).toBeTruthy();
    }
  });

  it('模擬考日確實落在星期六', () => {
    expect(getDayOfWeek(getDateForWeekDay(15, 7))).toBe(6);
    expect(getDayOfWeek(getDateForWeekDay(16, 7))).toBe(6);
    expect(getDateForWeekDay(15, 7)).toBe('2026-11-21');
    expect(getDateForWeekDay(16, 7)).toBe('2026-11-28');
  });

  it('第 17 週不含任何模擬考或計時測驗', () => {
    const week17 = getWeekOutline(17)!;
    expect(week17.pattern).toBe('final');
    const focuses = week17.days.map((d) => d.focus);
    expect(focuses).not.toContain('mock-full');
    expect(focuses).not.toContain('mock-section');
    expect(focuses).not.toContain('weekly-quiz');
  });

  it('第 17 週每天不超過 15 分鐘，最後兩天降到 10 分鐘', () => {
    const week17 = getWeekOutline(17)!;
    for (const day of week17.days) {
      expect(day.estimatedMinutes, `第 ${day.dayIndex} 天`).toBeLessThanOrEqual(15);
    }
    expect(week17.days[5]!.estimatedMinutes).toBe(10);
    expect(week17.days[6]!.estimatedMinutes).toBe(10);
  });

  it('凡是超過 30 分鐘的日子都必須有時間提醒', () => {
    for (const outline of WEEK_OUTLINES) {
      for (const day of outline.days) {
        if (day.estimatedMinutes > 30) {
          expect(day.timeWarning, `第 ${outline.week} 週第 ${day.dayIndex} 天`).toBeTruthy();
        }
      }
    }
  });
});

describe('查詢函式', () => {
  it('getWeekOutline 對範圍外週次回傳 undefined', () => {
    expect(getWeekOutline(0)).toBeUndefined();
    expect(getWeekOutline(18)).toBeUndefined();
  });

  it('getDayOutline 可取得任一 (週, 天)', () => {
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      for (let d = 1; d <= 7; d++) {
        expect(getDayOutline(w, d as DayIndex), `第 ${w} 週第 ${d} 天`).toBeDefined();
      }
    }
    expect(getDayOutline(1, 8 as DayIndex)).toBeUndefined();
  });
});
