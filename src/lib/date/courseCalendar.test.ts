import { describe, it, expect } from 'vitest';
import {
  COURSE_START,
  COURSE_END,
  EXAM_DATE,
  TOTAL_WEEKS,
  DAYS_PER_WEEK,
  isValidIsoDate,
  daysBetween,
  addDays,
  getDayOfWeek,
  getTodayInTaipei,
  getPhase,
  getWeekNumber,
  getDayIndexInWeek,
  getWeekRange,
  getDateForWeekDay,
  getDaysUntilExam,
  getElapsedStudyDays,
  getTimeProgressRatio,
  formatDisplayDate,
  formatShortDate,
  formatWeekday,
  formatDateWithWeekday,
  formatWeekRange,
} from './courseCalendar';

describe('課程常數本身的正確性', () => {
  it('開始日是星期日、結束日是星期六、考試日是星期日', () => {
    expect(getDayOfWeek(COURSE_START)).toBe(0); // 週日
    expect(getDayOfWeek(COURSE_END)).toBe(6); // 週六
    expect(getDayOfWeek(EXAM_DATE)).toBe(0); // 週日，JLPT 固定於週日舉行
  });

  it('複習期間恰好是 119 天，剛好 17 週且無餘數', () => {
    const totalDays = daysBetween(COURSE_START, COURSE_END) + 1;
    expect(totalDays).toBe(119);
    expect(totalDays % DAYS_PER_WEEK).toBe(0);
    expect(totalDays / DAYS_PER_WEEK).toBe(TOTAL_WEEKS);
  });

  it('考試日就在複習期間結束的隔天', () => {
    expect(addDays(COURSE_END, 1)).toBe(EXAM_DATE);
  });
});

describe('isValidIsoDate', () => {
  it('接受合法日期', () => {
    expect(isValidIsoDate('2026-08-09')).toBe(true);
    expect(isValidIsoDate('2026-12-06')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true); // 閏年
  });

  it('拒絕格式錯誤或不存在的日期', () => {
    expect(isValidIsoDate('2026-8-9')).toBe(false);
    expect(isValidIsoDate('2026/08/09')).toBe(false);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('2025-02-29')).toBe(false); // 非閏年
    expect(isValidIsoDate('')).toBe(false);
    expect(isValidIsoDate('今天')).toBe(false);
  });
});

describe('日期運算', () => {
  it('daysBetween 跨月與跨季正確', () => {
    expect(daysBetween('2026-08-09', '2026-08-09')).toBe(0);
    expect(daysBetween('2026-08-09', '2026-08-10')).toBe(1);
    expect(daysBetween('2026-08-31', '2026-09-01')).toBe(1);
    expect(daysBetween('2026-08-09', '2026-12-05')).toBe(118);
    expect(daysBetween('2026-08-09', '2026-12-06')).toBe(119);
    expect(daysBetween('2026-12-06', '2026-08-09')).toBe(-119);
  });

  it('addDays 可正可負，且跨年正確', () => {
    expect(addDays('2026-08-09', 6)).toBe('2026-08-15');
    expect(addDays('2026-08-09', 7)).toBe('2026-08-16');
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-08-09', -1)).toBe('2026-08-08');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('非法輸入會丟出明確錯誤，不會靜默算錯', () => {
    expect(() => daysBetween('2026-02-30', '2026-08-09')).toThrow(RangeError);
    expect(() => addDays('not-a-date', 1)).toThrow(RangeError);
  });
});

describe('getTodayInTaipei — 時區與跨日邊界', () => {
  it('台北時間仍在 8/9 當天（UTC 已是 8/9 深夜）', () => {
    // 2026-08-09T15:30:00Z = 台北 2026-08-09 23:30
    expect(getTodayInTaipei(new Date('2026-08-09T15:30:00Z'))).toBe('2026-08-09');
  });

  it('台北時間已跨到 8/10（UTC 仍是 8/9）', () => {
    // 2026-08-09T16:30:00Z = 台北 2026-08-10 00:30 ← 最容易出錯的邊界
    expect(getTodayInTaipei(new Date('2026-08-09T16:30:00Z'))).toBe('2026-08-10');
  });

  it('恰好台北午夜 00:00 算新的一天', () => {
    // 2026-08-09T16:00:00Z = 台北 2026-08-10 00:00
    expect(getTodayInTaipei(new Date('2026-08-09T16:00:00Z'))).toBe('2026-08-10');
    // 前一毫秒仍是 8/9
    expect(getTodayInTaipei(new Date('2026-08-09T15:59:59.999Z'))).toBe('2026-08-09');
  });

  it('考試當日的午夜邊界', () => {
    expect(getTodayInTaipei(new Date('2026-12-05T16:00:00Z'))).toBe('2026-12-06');
    expect(getTodayInTaipei(new Date('2026-12-06T15:59:59Z'))).toBe('2026-12-06');
    expect(getTodayInTaipei(new Date('2026-12-06T16:00:00Z'))).toBe('2026-12-07');
  });

  it('輸出永遠是合法的 YYYY-MM-DD', () => {
    expect(isValidIsoDate(getTodayInTaipei())).toBe(true);
    expect(isValidIsoDate(getTodayInTaipei(new Date('2026-01-01T00:00:00Z')))).toBe(true);
  });
});

describe('getPhase — 四個階段與邊界日', () => {
  it.each([
    ['2026-01-01', 'before'],
    ['2026-08-07', 'before'],
    ['2026-08-08', 'before'], // 開始前一天
    ['2026-08-09', 'during'], // 開始當天
    ['2026-08-10', 'during'],
    ['2026-10-01', 'during'],
    ['2026-12-04', 'during'],
    ['2026-12-05', 'during'], // 複習最後一天
    ['2026-12-06', 'exam-day'], // 考試當天
    ['2026-12-07', 'after'], // 考後第一天
    ['2027-01-01', 'after'],
  ])('%s → %s', (date, expected) => {
    expect(getPhase(date)).toBe(expected);
  });
});

describe('getWeekNumber', () => {
  it.each([
    ['2026-08-09', 1],
    ['2026-08-15', 1], // 第 1 週最後一天
    ['2026-08-16', 2], // 第 2 週第一天
    ['2026-08-22', 2],
    ['2026-09-06', 5],
    ['2026-11-01', 13],
    ['2026-11-29', 17], // 第 17 週第一天
    ['2026-12-05', 17], // 第 17 週最後一天
  ])('%s → 第 %i 週', (date, expected) => {
    expect(getWeekNumber(date)).toBe(expected);
  });

  it.each(['2026-08-08', '2026-06-01', '2026-12-06', '2026-12-07', '2027-03-01'])(
    '%s 不在複習期間 → null',
    (date) => {
      expect(getWeekNumber(date)).toBeNull();
    },
  );

  it('119 天全部涵蓋，週次遞增、無跳號、無重複', () => {
    const counts = new Map<number, number>();
    for (let i = 0; i < 119; i++) {
      const date = addDays(COURSE_START, i);
      const week = getWeekNumber(date);
      expect(week).not.toBeNull();
      counts.set(week!, (counts.get(week!) ?? 0) + 1);
    }
    expect(counts.size).toBe(TOTAL_WEEKS);
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      expect(counts.get(w)).toBe(7); // 每週恰好 7 天
    }
  });
});

describe('getDayIndexInWeek', () => {
  it.each([
    ['2026-08-09', 1], // 日
    ['2026-08-10', 2], // 一
    ['2026-08-11', 3], // 二
    ['2026-08-12', 4], // 三
    ['2026-08-13', 5], // 四
    ['2026-08-14', 6], // 五
    ['2026-08-15', 7], // 六
    ['2026-08-16', 1], // 下一週的日
    ['2026-12-05', 7], // 最後一天是第 7 天
  ])('%s → 第 %i 天', (date, expected) => {
    expect(getDayIndexInWeek(date)).toBe(expected);
  });

  it('dayIndex 與實際星期完全對應（1=週日 ... 7=週六）', () => {
    for (let i = 0; i < 119; i++) {
      const date = addDays(COURSE_START, i);
      expect(getDayIndexInWeek(date)).toBe(getDayOfWeek(date) + 1);
    }
  });

  it('不在複習期間回傳 null', () => {
    expect(getDayIndexInWeek('2026-08-08')).toBeNull();
    expect(getDayIndexInWeek('2026-12-06')).toBeNull();
  });
});

describe('getWeekRange', () => {
  it('第 1 週與第 17 週的起訖正確', () => {
    expect(getWeekRange(1)).toEqual({ start: '2026-08-09', end: '2026-08-15' });
    expect(getWeekRange(17)).toEqual({ start: '2026-11-29', end: '2026-12-05' });
  });

  it('17 週首尾相接、無空隙、無重疊', () => {
    for (let w = 1; w < TOTAL_WEEKS; w++) {
      const current = getWeekRange(w);
      const next = getWeekRange(w + 1);
      expect(daysBetween(current.start, current.end)).toBe(6);
      expect(addDays(current.end, 1)).toBe(next.start);
    }
    expect(getWeekRange(1).start).toBe(COURSE_START);
    expect(getWeekRange(TOTAL_WEEKS).end).toBe(COURSE_END);
  });

  it('每一週的起始都是週日、結束都是週六', () => {
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      const { start, end } = getWeekRange(w);
      expect(getDayOfWeek(start)).toBe(0);
      expect(getDayOfWeek(end)).toBe(6);
    }
  });

  it('週次超出範圍會丟出錯誤', () => {
    expect(() => getWeekRange(0)).toThrow(RangeError);
    expect(() => getWeekRange(18)).toThrow(RangeError);
    expect(() => getWeekRange(1.5)).toThrow(RangeError);
  });
});

describe('getDateForWeekDay 與 getWeekNumber/getDayIndexInWeek 互為反函式', () => {
  it('任一 (週, 天) 轉成日期後可還原', () => {
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      for (let d = 1; d <= 7; d++) {
        const date = getDateForWeekDay(w, d as 1);
        expect(getWeekNumber(date)).toBe(w);
        expect(getDayIndexInWeek(date)).toBe(d);
      }
    }
  });

  it('模擬考週的實際日期符合規劃（W15/W16 的第 7 天是週六）', () => {
    expect(getDateForWeekDay(15, 7)).toBe('2026-11-21');
    expect(getDateForWeekDay(16, 7)).toBe('2026-11-28');
    expect(getDayOfWeek('2026-11-21')).toBe(6);
    expect(getDayOfWeek('2026-11-28')).toBe(6);
  });
});

describe('getDaysUntilExam', () => {
  it.each([
    ['2026-08-09', 119],
    ['2026-08-10', 118],
    ['2026-12-04', 2],
    ['2026-12-05', 1],
    ['2026-12-06', 0], // 考試當天
    ['2026-12-07', -1], // 考後
  ])('%s → 剩 %i 天', (date, expected) => {
    expect(getDaysUntilExam(date)).toBe(expected);
  });
});

describe('getElapsedStudyDays 與 getTimeProgressRatio', () => {
  it('開始前為 0，第一天為 1，最後一天為 119', () => {
    expect(getElapsedStudyDays('2026-08-08')).toBe(0);
    expect(getElapsedStudyDays('2026-08-09')).toBe(1);
    expect(getElapsedStudyDays('2026-08-15')).toBe(7);
    expect(getElapsedStudyDays('2026-12-05')).toBe(119);
  });

  it('結束後不會超過 119', () => {
    expect(getElapsedStudyDays('2026-12-06')).toBe(119);
    expect(getElapsedStudyDays('2027-05-01')).toBe(119);
  });

  it('時間進度介於 0 與 1 之間', () => {
    expect(getTimeProgressRatio('2026-08-08')).toBe(0);
    expect(getTimeProgressRatio('2026-08-09')).toBeCloseTo(1 / 119, 6);
    expect(getTimeProgressRatio('2026-12-05')).toBe(1);
    expect(getTimeProgressRatio('2027-01-01')).toBe(1);
  });
});

describe('顯示格式化', () => {
  it('formatDisplayDate 不受執行環境時區影響（不會差一天）', () => {
    expect(formatDisplayDate('2026-08-09')).toBe('2026年8月9日');
    expect(formatDisplayDate('2026-12-06')).toBe('2026年12月6日');
    expect(formatDisplayDate('2026-01-01')).toBe('2026年1月1日');
  });

  it('formatShortDate', () => {
    expect(formatShortDate('2026-08-09')).toBe('8/9');
    expect(formatShortDate('2026-12-05')).toBe('12/5');
  });

  it('formatWeekday', () => {
    expect(formatWeekday('2026-08-09')).toBe('星期日');
    expect(formatWeekday('2026-08-14')).toBe('星期五');
    expect(formatWeekday('2026-12-06')).toBe('星期日');
  });

  it('formatDateWithWeekday', () => {
    expect(formatDateWithWeekday('2026-08-09')).toBe('2026年8月9日（日）');
  });

  it('formatWeekRange', () => {
    expect(formatWeekRange(1)).toBe('8/9 – 8/15');
    expect(formatWeekRange(17)).toBe('11/29 – 12/5');
  });
});
