/**
 * 任務的識別碼。
 *
 * 刻意不用「第幾個項目」當 key —— 那樣一旦調整 JSON 裡 items 的順序，
 * 已完成的紀錄就會對到別的任務上。改用「週 + 天 + 內容 id」組成，
 * 內容重新排序、插入新項目都不會影響既有紀錄。
 */

import type { TaskItem } from '@/lib/content/schemas';

export function taskKey(week: number, dayIndex: number, item: TaskItem): string {
  const prefix = `w${week}d${dayIndex}`;
  switch (item.kind) {
    case 'vocabulary':
      return `${prefix}:vocabulary:${item.setId}`;
    case 'grammar':
      return `${prefix}:grammar:${item.setId}`;
    case 'comparison':
      return `${prefix}:comparison:${[...item.comparisonIds].sort().join(',')}`;
    case 'kanji':
      return `${prefix}:kanji:${[...item.questionIds].sort().join(',')}`;
    case 'reading':
      return `${prefix}:reading:${[...item.passageIds].sort().join(',')}`;
    case 'listening':
      return `${prefix}:listening:${[...item.exerciseIds].sort().join(',')}`;
    case 'quiz':
      return `${prefix}:quiz:${item.quizId}`;
    case 'mistake-review':
      return `${prefix}:mistake-review`;
    case 'note':
      return `${prefix}:note:${item.title}`;
  }
}

/** 任務在畫面上的顯示名稱 */
export function taskLabel(item: TaskItem): string {
  switch (item.kind) {
    case 'vocabulary':
      return '語彙';
    case 'grammar':
      return '文法';
    case 'comparison':
      return '文法比較';
    case 'kanji':
      return '漢字小測';
    case 'reading':
      return '讀解';
    case 'listening':
      return '聽解';
    case 'quiz':
      return '測驗';
    case 'mistake-review':
      return '錯題複習';
    case 'note':
      return item.title;
  }
}

/** 這個任務屬於哪一項能力（note 與錯題複習不歸屬單一能力） */
export function taskSkill(
  item: TaskItem,
): 'vocabulary' | 'grammar' | 'reading' | 'listening' | null {
  switch (item.kind) {
    case 'vocabulary':
    case 'kanji':
      return 'vocabulary';
    case 'grammar':
    case 'comparison':
      return 'grammar';
    case 'reading':
      return 'reading';
    case 'listening':
      return 'listening';
    case 'quiz':
    case 'mistake-review':
    case 'note':
      return null;
  }
}
