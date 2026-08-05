/** 導覽項目。桌面版顯示 desktop 為 true 者，手機底部列顯示 mobile 為 true 者。 */
export interface NavItem {
  to: string;
  label: string;
  /** 手機底部列的簡短標籤與圖示 */
  shortLabel?: string;
  icon?: string;
  desktop: boolean;
  mobile: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: '首頁', shortLabel: '首頁', icon: '◎', desktop: true, mobile: true },
  { to: '/map', label: '學習地圖', shortLabel: '地圖', icon: '▤', desktop: true, mobile: true },
  { to: '/vocabulary', label: '語彙', desktop: true, mobile: false },
  { to: '/grammar', label: '文法', desktop: true, mobile: false },
  { to: '/reading', label: '讀解', desktop: true, mobile: false },
  { to: '/listening', label: '聽解', desktop: true, mobile: false },
  { to: '/mistakes', label: '錯題本', shortLabel: '錯題', icon: '✎', desktop: true, mobile: true },
  { to: '/weakness', label: '弱點分析', desktop: true, mobile: false },
  { to: '/progress', label: '進度成績', shortLabel: '進度', icon: '◔', desktop: true, mobile: true },
  { to: '/settings', label: '設定', shortLabel: '設定', icon: '⚙', desktop: true, mobile: true },
];
