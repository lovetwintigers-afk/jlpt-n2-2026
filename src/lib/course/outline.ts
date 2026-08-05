/**
 * 十七週課綱骨架（結構性資料，非學習內容）。
 *
 * 這裡只放「每週是什麼階段、主題是什麼、七天怎麼排」。
 * 實際的語彙、文法、題目在 P2 之後放進 content/*.json，由 setId 對應。
 *
 * 修改這個檔案不需要改任何頁面元件 —— 17 週共用同一個 WeekDetail 頁面。
 */

import type { DayIndex, WeekNumber } from '@/lib/date/courseCalendar';

export type Skill = 'vocabulary' | 'grammar' | 'reading' | 'listening';

export type Stage =
  | 'diagnostic'
  | 'foundation'
  | 'strengthen'
  | 'integration'
  | 'mock'
  | 'final';

/** 每日焦點。一天一個焦點，不混雜。 */
export type DayFocus =
  | 'vocab-kanji'
  | 'grammar'
  | 'reading'
  | 'listening'
  | 'mixed-review'
  | 'weekly-quiz'
  | 'flex'
  | 'diagnostic'
  | 'mock-section'
  | 'mock-full'
  | 'light-review';

/** 週的排法。標準週套用固定 7 天節奏，其餘為例外週。 */
export type DayPattern = 'standard' | 'diagnostic' | 'mock-section' | 'mock-full' | 'final';

export interface DayOutline {
  dayIndex: DayIndex;
  focus: DayFocus;
  title: string;
  estimatedMinutes: number;
  /** Day 7 彈性日不計入本週完成率的分母 */
  countsTowardCompletion: boolean;
  /** 需要較長時段時的提醒文字（例如模擬考日） */
  timeWarning?: string;
}

export interface WeekOutline {
  week: WeekNumber;
  stage: Stage;
  pattern: DayPattern;
  title: string;
  goals: string[];
  focusSkills: Skill[];
  days: DayOutline[];
}

export const STAGE_LABELS: Record<Stage, string> = {
  diagnostic: '基準診斷',
  foundation: '基礎補強',
  strengthen: '能力強化',
  integration: '題型整合',
  mock: '模擬與補強',
  final: '最終整理',
};

export const SKILL_LABELS: Record<Skill, string> = {
  vocabulary: '文字・語彙',
  grammar: '文法',
  reading: '讀解',
  listening: '聽解',
};

export const FOCUS_LABELS: Record<DayFocus, string> = {
  'vocab-kanji': '語彙・漢字',
  grammar: '文法・辨析',
  reading: '讀解',
  listening: '聽解',
  'mixed-review': '混合複習',
  'weekly-quiz': '本週測驗',
  flex: '彈性補做',
  diagnostic: '診斷測驗',
  'mock-section': '分科模擬',
  'mock-full': '完整模擬考',
  'light-review': '輕量複習',
};

/** 標準週的七天節奏：5 學習日 + 1 測驗日 + 1 彈性日 */
function standardDays(): DayOutline[] {
  return [
    { dayIndex: 1, focus: 'vocab-kanji', title: '語彙與漢字', estimatedMinutes: 25, countsTowardCompletion: true },
    { dayIndex: 2, focus: 'grammar', title: '文法與辨析', estimatedMinutes: 25, countsTowardCompletion: true },
    { dayIndex: 3, focus: 'reading', title: '讀解', estimatedMinutes: 25, countsTowardCompletion: true },
    { dayIndex: 4, focus: 'listening', title: '聽解', estimatedMinutes: 20, countsTowardCompletion: true },
    { dayIndex: 5, focus: 'mixed-review', title: '混合複習與錯題', estimatedMinutes: 20, countsTowardCompletion: true },
    { dayIndex: 6, focus: 'weekly-quiz', title: '本週複習測驗', estimatedMinutes: 25, countsTowardCompletion: true },
    { dayIndex: 7, focus: 'flex', title: '補做・重做・休息', estimatedMinutes: 0, countsTowardCompletion: false },
  ];
}

/** 只覆寫指定天數，其餘沿用標準週 */
function daysWithOverrides(overrides: Partial<Record<DayIndex, Partial<DayOutline>>>): DayOutline[] {
  return standardDays().map((day) => {
    const patch = overrides[day.dayIndex];
    return patch ? { ...day, ...patch } : day;
  });
}

export const WEEK_OUTLINES: readonly WeekOutline[] = [
  {
    week: 1,
    stage: 'diagnostic',
    pattern: 'diagnostic',
    title: '基準診斷與路線規劃',
    goals: [
      '完成初始程度測驗，取得四項能力的基準分數',
      '建立個人弱點紀錄，知道自己最該補哪一塊',
      '理解十七週的整體路線與每週節奏',
    ],
    focusSkills: ['vocabulary', 'grammar', 'reading', 'listening'],
    days: daysWithOverrides({
      1: { focus: 'diagnostic', title: '診斷測驗（上）語彙・文法', estimatedMinutes: 25 },
      2: { focus: 'diagnostic', title: '診斷測驗（下）讀解', estimatedMinutes: 25 },
      3: { focus: 'light-review', title: '診斷結果與路線說明', estimatedMinutes: 20 },
      // 第 4–6 天不排週測驗 —— 剛做完診斷再測一次沒有意義，
      // 改成正式開始語彙與文法，最後一天回顧並自評。
      6: { focus: 'mixed-review', title: '第一週回顧與自我評估', estimatedMinutes: 20 },
    }),
  },
  {
    week: 2,
    stage: 'foundation',
    pattern: 'standard',
    title: 'N2 高頻語彙 I ／核心文法 I',
    goals: ['掌握 N2 最高頻的名詞與動詞', '熟練最基本的 N2 文法句型', '建立每日固定的學習節奏'],
    focusSkills: ['vocabulary', 'grammar'],
    days: standardDays(),
  },
  {
    week: 3,
    stage: 'foundation',
    pattern: 'standard',
    title: '常考漢字讀音 ／核心文法 II',
    goals: ['分辨音讀與訓讀的常見陷阱', '掌握表示原因、目的的文法', '習慣短篇讀解的節奏'],
    focusSkills: ['vocabulary', 'grammar'],
    days: standardDays(),
  },
  {
    week: 4,
    stage: 'foundation',
    pattern: 'standard',
    title: '高頻語彙 II ／易混文法比較 I',
    goals: ['擴充形容詞與副詞語彙', '釐清第一組易混淆文法的差異', '開始累積錯題紀錄'],
    focusSkills: ['vocabulary', 'grammar'],
    days: standardDays(),
  },
  {
    week: 5,
    stage: 'foundation',
    pattern: 'standard',
    title: '短篇讀解 ／基礎聽解題型',
    goals: ['能在 5 分鐘內讀完並理解一篇短文', '認識課題理解與即時應答的題型結構', '完成基礎補強階段的總複習'],
    focusSkills: ['reading', 'listening'],
    days: standardDays(),
  },
  {
    week: 6,
    stage: 'strengthen',
    pattern: 'standard',
    title: '語境中的語彙 ／文法語氣 I',
    goals: ['從例句判斷語彙的正確用法，而非死背中文', '掌握文法的語氣與使用場合限制', '提升讀解速度'],
    focusSkills: ['vocabulary', 'grammar'],
    days: standardDays(),
  },
  {
    week: 7,
    stage: 'strengthen',
    pattern: 'standard',
    title: '近義詞辨析 ／中篇讀解',
    goals: ['分辨 N2 常考的近義詞組', '能處理 500 字左右的中篇文章', '掌握指示詞與接續詞的指涉'],
    focusSkills: ['vocabulary', 'reading'],
    days: standardDays(),
  },
  {
    week: 8,
    stage: 'strengthen',
    pattern: 'standard',
    title: '副詞・接續詞 ／課題理解聽解',
    goals: ['熟悉高頻副詞與接續詞的搭配', '聽解能抓住「接下來要做什麼」', '文法辨析正確率提升'],
    focusSkills: ['vocabulary', 'listening'],
    days: standardDays(),
  },
  {
    week: 9,
    stage: 'strengthen',
    pattern: 'standard',
    title: '敬語與文體 ／主旨判斷',
    goals: ['掌握尊敬語、謙讓語在題目中的判別', '能快速抓出文章主旨與作者立場', '習慣書面語與口語的文體差異'],
    focusSkills: ['grammar', 'reading'],
    days: standardDays(),
  },
  {
    week: 10,
    stage: 'strengthen',
    pattern: 'standard',
    title: '資訊搜尋 ／即時應答（首次限時）',
    goals: ['能從廣告、公告中快速找到指定條件', '即時應答的反應速度提升', '開始適應限時作答的壓力'],
    focusSkills: ['reading', 'listening'],
    days: daysWithOverrides({
      3: { title: '讀解（開始限時）', estimatedMinutes: 25 },
    }),
  },
  {
    week: 11,
    stage: 'integration',
    pattern: 'standard',
    title: '混合題組 ／限時讀解',
    goals: ['在同一組題目中切換不同能力', '限時讀解能穩定完成', '錯題重做的正確率提升'],
    focusSkills: ['reading', 'vocabulary', 'grammar'],
    days: standardDays(),
  },
  {
    week: 12,
    stage: 'integration',
    pattern: 'standard',
    title: '跨能力練習 ／限時聽解',
    goals: ['聽解在限時下維持正確率', '語彙與文法能直接支援讀解理解', '找出目前最不穩定的題型'],
    focusSkills: ['listening', 'reading'],
    days: standardDays(),
  },
  {
    week: 13,
    stage: 'integration',
    pattern: 'standard',
    title: '小型模擬 ／錯題自動推薦',
    goals: ['完成第一次小型綜合測驗', '依錯題推薦的內容補強弱點', '確認題型整合階段的成果'],
    focusSkills: ['vocabulary', 'grammar', 'reading', 'listening'],
    days: standardDays(),
  },
  {
    week: 14,
    stage: 'mock',
    pattern: 'mock-section',
    title: '分科模擬（聽解・讀解）',
    goals: ['以正式時間完成單科模擬', '掌握各科的時間分配', '記錄作答時間與正確率'],
    focusSkills: ['listening', 'reading'],
    days: daysWithOverrides({
      5: {
        focus: 'mock-section',
        title: '聽解分科模擬（50 分）',
        estimatedMinutes: 50,
        timeWarning: '本日需 50 分鐘不中斷，請預留完整時段。',
      },
      6: { focus: 'mixed-review', title: '聽解檢討與錯題', estimatedMinutes: 25 },
      7: {
        focus: 'mock-section',
        title: '讀解分科模擬（55 分）',
        estimatedMinutes: 55,
        countsTowardCompletion: true,
        timeWarning: '本日需 55 分鐘不中斷，請預留完整時段。',
      },
    }),
  },
  {
    week: 15,
    stage: 'mock',
    pattern: 'mock-full',
    title: '完整模擬考 ①',
    goals: ['以正式時間完成 155 分鐘的完整模擬', '確認總分是否達到合格線', '找出時間分配的問題'],
    focusSkills: ['vocabulary', 'grammar', 'reading', 'listening'],
    days: daysWithOverrides({
      1: { focus: 'light-review', title: '語彙輕量複習', estimatedMinutes: 15 },
      2: { focus: 'light-review', title: '文法輕量複習', estimatedMinutes: 15 },
      3: { focus: 'light-review', title: '讀解手感維持', estimatedMinutes: 15 },
      4: { focus: 'light-review', title: '聽解手感維持', estimatedMinutes: 15 },
      5: { focus: 'mixed-review', title: '錯題重做', estimatedMinutes: 15 },
      6: { focus: 'light-review', title: '考前調整（不計時）', estimatedMinutes: 10 },
      7: {
        focus: 'mock-full',
        title: '完整模擬考 ①（155 分）',
        estimatedMinutes: 185,
        countsTowardCompletion: true,
        timeWarning: '本日需 155 分鐘作答 + 30 分鐘檢討。建議安排在上午，模擬正式考試狀態。',
      },
    }),
  },
  {
    week: 16,
    stage: 'mock',
    pattern: 'mock-full',
    title: '完整模擬考 ② 與集中補強',
    goals: ['第二次完整模擬，驗證補強成效', '集中補強最低分的科目', '確認成績變化趨勢'],
    focusSkills: ['vocabulary', 'grammar', 'reading', 'listening'],
    days: daysWithOverrides({
      1: { focus: 'mixed-review', title: '模擬考 ① 錯題補強（上）', estimatedMinutes: 20 },
      2: { focus: 'mixed-review', title: '模擬考 ① 錯題補強（下）', estimatedMinutes: 20 },
      3: { focus: 'light-review', title: '最弱科目集中練習', estimatedMinutes: 20 },
      4: { focus: 'light-review', title: '最弱科目集中練習', estimatedMinutes: 20 },
      5: { focus: 'light-review', title: '語彙文法快速複習', estimatedMinutes: 15 },
      6: { focus: 'light-review', title: '考前調整（不計時）', estimatedMinutes: 10 },
      7: {
        focus: 'mock-full',
        title: '完整模擬考 ②（155 分）',
        estimatedMinutes: 185,
        countsTowardCompletion: true,
        timeWarning: '本日需 155 分鐘作答 + 30 分鐘檢討。這是考前最後一次完整模擬。',
      },
    }),
  },
  {
    week: 17,
    stage: 'final',
    pattern: 'final',
    title: '考前總整理與狀態調整',
    goals: ['回顧高頻錯題與個人弱點清單', '確認考試當天的時間分配策略', '調整作息，維持手感但不過度消耗'],
    focusSkills: ['vocabulary', 'grammar'],
    days: [
      { dayIndex: 1, focus: 'mixed-review', title: '高頻錯題回顧', estimatedMinutes: 15, countsTowardCompletion: true },
      { dayIndex: 2, focus: 'light-review', title: '高頻語彙速覽', estimatedMinutes: 15, countsTowardCompletion: true },
      { dayIndex: 3, focus: 'light-review', title: '高頻文法速覽', estimatedMinutes: 15, countsTowardCompletion: true },
      { dayIndex: 4, focus: 'light-review', title: '考試時間分配策略', estimatedMinutes: 15, countsTowardCompletion: true },
      { dayIndex: 5, focus: 'light-review', title: '個人弱點清單確認', estimatedMinutes: 15, countsTowardCompletion: true },
      {
        dayIndex: 6,
        focus: 'light-review',
        title: '輕量確認（停止計時練習）',
        estimatedMinutes: 10,
        countsTowardCompletion: true,
        timeWarning: '今天之後不再做計時模擬考，把狀態留給考試當天。',
      },
      {
        dayIndex: 7,
        focus: 'light-review',
        title: '行前準備與物品確認',
        estimatedMinutes: 10,
        countsTowardCompletion: true,
        timeWarning: '今天只做 10 分鐘確認，早點休息。',
      },
    ],
  },
];

const OUTLINE_BY_WEEK = new Map<WeekNumber, WeekOutline>(
  WEEK_OUTLINES.map((outline) => [outline.week, outline]),
);

export function getWeekOutline(week: WeekNumber): WeekOutline | undefined {
  return OUTLINE_BY_WEEK.get(week);
}

export function getDayOutline(week: WeekNumber, dayIndex: DayIndex): DayOutline | undefined {
  return getWeekOutline(week)?.days.find((day) => day.dayIndex === dayIndex);
}

/** 本週計入完成率的任務天數（標準週為 6） */
export function getCountedDayCount(week: WeekNumber): number {
  return getWeekOutline(week)?.days.filter((d) => d.countsTowardCompletion).length ?? 0;
}

/** 本週建議總時間（不含彈性日） */
export function getWeekEstimatedMinutes(week: WeekNumber): number {
  const outline = getWeekOutline(week);
  if (!outline) return 0;
  return outline.days
    .filter((d) => d.countsTowardCompletion)
    .reduce((sum, d) => sum + d.estimatedMinutes, 0);
}
