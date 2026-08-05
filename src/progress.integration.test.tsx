/**
 * 端到端確認：在畫面上勾選任務 → 資料真的寫進儲存 → 重新開啟後狀態還在。
 * 這是進度儲存最重要的一條路徑，用真實的元件與 Repository 跑一次。
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import {
  LocalStorageProgressRepository,
  MemoryStore,
  STORAGE_KEY,
} from '@/lib/progress/repository';

function setup(route: string, store = new MemoryStore()) {
  const repository = new LocalStorageProgressRepository(store, () => '2026-08-16T10:00:00.000Z');
  const view = render(
    <MemoryRouter initialEntries={[route]}>
      <App today="2026-08-16" repository={repository} />
    </MemoryRouter>,
  );
  return { store, repository, view };
}

function storedTasks(store: MemoryStore): Record<string, { status: string }> {
  const raw = store.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw).tasks : {};
}

describe('勾選任務並保存', () => {
  it('勾選後寫入儲存，重新開啟仍然是已完成', async () => {
    const user = userEvent.setup();
    const { store, view } = setup('/week/2/day/1');

    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    expect(checkboxes[0]).not.toBeChecked();

    await user.click(checkboxes[0]!);
    expect(checkboxes[0]).toBeChecked();

    // 卸載會強制寫入（等同關閉分頁）
    view.unmount();
    await waitFor(() => {
      expect(Object.values(storedTasks(store)).some((t) => t.status === 'done')).toBe(true);
    });

    // 重新開啟：用同一個 store 再建一次 App
    setup('/week/2/day/1', store);
    const reopened = await screen.findAllByRole('checkbox');
    expect(reopened[0]).toBeChecked();
  });

  it('取消勾選也會被保存', async () => {
    const user = userEvent.setup();
    const { store, view } = setup('/week/2/day/1');

    const checkboxes = await screen.findAllByRole('checkbox');
    await user.click(checkboxes[0]!);
    await user.click(checkboxes[0]!);
    view.unmount();

    await waitFor(() => {
      const tasks = storedTasks(store);
      expect(Object.keys(tasks).length).toBeGreaterThan(0);
      expect(Object.values(tasks).every((t) => t.status !== 'done')).toBe(true);
    });

    setup('/week/2/day/1', store);
    const reopened = await screen.findAllByRole('checkbox');
    expect(reopened[0]).not.toBeChecked();
  });

  it('完成的任務會反映在本日進度上', async () => {
    const user = userEvent.setup();
    setup('/week/2/day/1');

    const checkboxes = await screen.findAllByRole('checkbox');
    const total = checkboxes.length;
    expect(screen.getByText(`0 / ${total} 項`)).toBeInTheDocument();

    await user.click(checkboxes[0]!);
    expect(screen.getByText(`1 / ${total} 項`)).toBeInTheDocument();
  });
});

describe('完成度會傳到儀表板與學習地圖', () => {
  it('完成第 2 週第 1 天後，儀表板的本週完成率上升', async () => {
    const user = userEvent.setup();
    const { store, view } = setup('/week/2/day/1');

    const checkboxes = await screen.findAllByRole('checkbox');
    for (const checkbox of checkboxes) await user.click(checkbox);
    view.unmount();

    setup('/', store);
    const status = await screen.findByText('本週完成率');
    const card = status.closest('section')!;
    // 第 2 週第 1 天有 2 個任務，全週共 6 個
    expect(within(card).getByText(/2 \/ \d+ 項/)).toBeInTheDocument();
  });

  it('第 1 天全部完成後，七天列表中該天顯示勾號', async () => {
    const user = userEvent.setup();
    const { store, view } = setup('/week/2/day/1');
    const checkboxes = await screen.findAllByRole('checkbox');
    for (const checkbox of checkboxes) await user.click(checkbox);
    view.unmount();

    setup('/week/2', store);
    const daySection = (await screen.findByText('本週七天')).closest('section')!;
    expect(within(daySection).getByText('✓')).toBeInTheDocument();
  });
});

describe('設定頁', () => {
  it('切換振假名模式會立刻影響畫面上的日文', async () => {
    const user = userEvent.setup();
    const { container } = setup('/settings').view;

    await screen.findByText('振假名顯示');
    expect(container.querySelectorAll('rt').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('radio', { name: /完全不顯示/ }));
    expect(container.querySelectorAll('rt')).toHaveLength(0);
  });

  it('振假名設定會被保存', async () => {
    const user = userEvent.setup();
    const { store, view } = setup('/settings');

    await screen.findByText('振假名顯示');
    await user.click(screen.getByRole('radio', { name: /隱藏/ }));
    view.unmount();

    await waitFor(() => {
      const raw = store.getItem(STORAGE_KEY);
      expect(raw && JSON.parse(raw).settings.furiganaMode).toBe('hidden');
    });
  });

  it('重置需要二次確認，確認後清空紀錄', async () => {
    const user = userEvent.setup();
    const { store, view } = setup('/week/2/day/1');
    const checkboxes = await screen.findAllByRole('checkbox');
    await user.click(checkboxes[0]!);
    view.unmount();

    setup('/settings', store);
    await user.click(await screen.findByRole('button', { name: '清除所有學習紀錄' }));
    expect(screen.getByText(/這個動作無法復原/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '確定清除' }));
    await waitFor(() => {
      expect(screen.getByText('已清除所有學習紀錄。')).toBeInTheDocument();
    });
  });

  it('重置的確認可以取消', async () => {
    const user = userEvent.setup();
    setup('/settings');
    await user.click(await screen.findByRole('button', { name: '清除所有學習紀錄' }));
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByText(/這個動作無法復原/)).not.toBeInTheDocument();
  });
});

describe('儲存資料損毀時的行為', () => {
  it('壞掉的資料不會讓網站開不起來', async () => {
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, '{{{ 壞掉了');

    setup('/', store);
    expect(await screen.findByText('今日建議任務')).toBeInTheDocument();
    // 原始內容有被保留下來
    expect(store.getItem(`${STORAGE_KEY}:corrupt-backup`)).toBe('{{{ 壞掉了');
  });
});
