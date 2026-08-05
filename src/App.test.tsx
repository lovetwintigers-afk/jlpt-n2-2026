import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import type { IsoDate } from '@/lib/date/courseCalendar';

function renderAt(today: IsoDate, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App today={today} />
    </MemoryRouter>,
  );
}

describe('儀表板依日期切換四種畫面', () => {
  it('開始前（2026-08-08）顯示準備頁，不顯示週次', () => {
    renderAt('2026-08-08');
    expect(screen.getByText(/天後開始十七週複習/)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // 距開始 1 天
    expect(screen.queryByText(/今日建議任務/)).not.toBeInTheDocument();
  });

  it('開始當天（2026-08-09）顯示第 1 週 Day 1', () => {
    renderAt('2026-08-09');
    const status = screen.getByRole('region', { name: '目前狀態' });
    expect(within(status).getByText('第 1 週')).toBeInTheDocument();
    expect(within(status).getByText(/2026年8月9日（日）/)).toBeInTheDocument();
    expect(screen.getByText('今日建議任務')).toBeInTheDocument();
    expect(screen.getByText(/Day 1/)).toBeInTheDocument();
  });

  it('期間中（2026-10-20）顯示正確的週次與主題', () => {
    renderAt('2026-10-20');
    const status = screen.getByRole('region', { name: '目前狀態' });
    expect(within(status).getByText('第 11 週')).toBeInTheDocument();
    expect(within(status).getByText('混合題組 ／限時讀解')).toBeInTheDocument();
    expect(within(status).getByText('題型整合')).toBeInTheDocument();
  });

  it('最後一天（2026-12-05）仍是第 17 週', () => {
    renderAt('2026-12-05');
    const status = screen.getByRole('region', { name: '目前狀態' });
    expect(within(status).getByText('第 17 週')).toBeInTheDocument();
    expect(within(status).getByText('最終整理')).toBeInTheDocument(); // 階段標籤
    expect(within(status).getByText('考前總整理與狀態調整')).toBeInTheDocument(); // 週主題
  });

  it('考試當天（2026-12-06）顯示考試日畫面，且沒有任何測驗入口', () => {
    renderAt('2026-12-06');
    expect(screen.getByText('今天是考試日')).toBeInTheDocument();
    expect(screen.queryByText('今日建議任務')).not.toBeInTheDocument();
    expect(screen.queryByText(/模擬考/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /測驗/ })).not.toBeInTheDocument();
  });

  it('考後（2026-12-07）顯示備考完成摘要', () => {
    renderAt('2026-12-07');
    expect(screen.getByText('備考完成')).toBeInTheDocument();
    expect(screen.getByText(/距今 1 天/)).toBeInTheDocument();
  });
});

describe('倒數顯示', () => {
  it.each([
    ['2026-08-09', '距考試 119 天'],
    ['2026-12-05', '距考試 1 天'],
    ['2026-12-06', '考試當天'],
    ['2026-12-07', '考試已結束'],
  ])('%s → 頂端顯示「%s」', (today, expected) => {
    renderAt(today);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('倒數數字不使用警示紅色（採用主色靛藍）', () => {
    renderAt('2026-08-09');
    const num = screen.getByText('119');
    expect(num).toHaveClass('dash__countdown-num');
  });
});

describe('十七週學習地圖', () => {
  it('顯示 17 張週次卡片，每張都連到對應週次', () => {
    renderAt('2026-08-09', '/map');
    const cards = screen
      .getAllByRole('link')
      .filter((el) => el.className.startsWith('weekcard'));
    expect(cards).toHaveLength(17);
    for (let w = 1; w <= 17; w++) {
      expect(cards[w - 1]).toHaveAttribute('href', expect.stringContaining(`/week/${w}`));
      expect(cards[w - 1]!).toHaveTextContent(`第 ${w} 週`);
    }
  });

  it('六個階段標題都出現', () => {
    renderAt('2026-08-09', '/map');
    for (const stage of ['基準診斷', '基礎補強', '能力強化', '題型整合', '模擬與補強', '最終整理']) {
      expect(screen.getByRole('heading', { name: stage })).toBeInTheDocument();
    }
  });

  it('本週卡片標示為「本週」，且只有一張', () => {
    renderAt('2026-10-20', '/map');
    expect(screen.getAllByText('本週')).toHaveLength(1);
  });

  it('不在複習期間時沒有「本週」標示，並顯示說明', () => {
    renderAt('2026-12-06', '/map');
    expect(screen.queryByText('本週')).not.toBeInTheDocument();
    expect(screen.getByText(/目前不在 2026-08-09 至 12-05 的複習期間內/)).toBeInTheDocument();
  });

  it('每張卡片顯示正確的日期範圍', () => {
    renderAt('2026-08-09', '/map');
    expect(screen.getByText('8/9 – 8/15')).toBeInTheDocument();
    expect(screen.getByText('11/29 – 12/5')).toBeInTheDocument();
  });
});

describe('每週學習頁（17 週共用一個元件）', () => {
  it.each([
    [1, '基準診斷與路線規劃'],
    [5, '短篇讀解 ／基礎聽解題型'],
    [15, '完整模擬考 ①'],
    [17, '考前總整理與狀態調整'],
  ])('第 %i 週顯示標題「%s」', (week, title) => {
    renderAt('2026-08-09', `/week/${week}`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
  });

  it('顯示七天列表與本週目標', () => {
    renderAt('2026-08-09', '/week/2');
    expect(screen.getByText('本週學習目標')).toBeInTheDocument();
    const dayList = screen.getByText('本週七天').closest('section')!;
    expect(within(dayList).getAllByRole('listitem')).toHaveLength(7);
  });

  it('標準週的建議總時間為 140 分鐘', () => {
    renderAt('2026-08-09', '/week/2');
    expect(screen.getByText('140')).toBeInTheDocument();
  });

  it('模擬考週顯示時間提醒', () => {
    renderAt('2026-08-09', '/week/15');
    expect(screen.getByText(/本日需 155 分鐘作答/)).toBeInTheDocument();
  });

  it('超出範圍的週次導回學習地圖', () => {
    renderAt('2026-08-09', '/week/18');
    expect(screen.getByRole('heading', { name: '十七週學習地圖' })).toBeInTheDocument();
  });
});

describe('每日任務頁', () => {
  it('顯示該日日期與焦點', () => {
    renderAt('2026-08-09', '/week/3/day/4');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('聽解');
    expect(screen.getByText(/2026年8月26日（三）/)).toBeInTheDocument();
  });

  it('第 7 天為彈性日', () => {
    renderAt('2026-08-09', '/week/4/day/7');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('補做・重做・休息');
  });

  it('超出範圍的天數導回學習地圖', () => {
    renderAt('2026-08-09', '/week/3/day/8');
    expect(screen.getByRole('heading', { name: '十七週學習地圖' })).toBeInTheDocument();
  });
});

describe('無障礙與導覽', () => {
  it('提供跳至主要內容的連結', () => {
    renderAt('2026-08-09');
    expect(screen.getByRole('link', { name: '跳至主要內容' })).toBeInTheDocument();
  });

  it('主要導覽存在，且首頁為 current', () => {
    renderAt('2026-08-09');
    const nav = screen.getByRole('navigation', { name: '主要導覽' });
    expect(within(nav).getByRole('link', { name: '首頁' })).toHaveAttribute('aria-current', 'page');
  });

  it('進度條有正確的 ARIA 屬性', () => {
    renderAt('2026-08-09');
    const bars = screen.getAllByRole('progressbar');
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) {
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
      expect(bar).toHaveAttribute('aria-label');
    }
  });

  it('未知路徑導回首頁', () => {
    renderAt('2026-08-09', '/nonsense');
    expect(screen.getByText('今日建議任務')).toBeInTheDocument();
  });
});

describe('考試當日頁面的內容原則', () => {
  it('列出應試物品與時間分配，但沒有練習入口', () => {
    renderAt('2026-12-06', '/exam-day');
    expect(screen.getByText('准考證')).toBeInTheDocument();
    expect(screen.getByText('105 分')).toBeInTheDocument();
    expect(screen.getByText('50 分')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /開始/ })).not.toBeInTheDocument();
  });

  it('非考試日進入時標示為預覽', () => {
    renderAt('2026-08-09', '/exam-day');
    expect(screen.getByText(/今天不是考試日/)).toBeInTheDocument();
  });
});
