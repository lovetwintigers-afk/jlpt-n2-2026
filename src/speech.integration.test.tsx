/**
 * 發音按鈕的行為。jsdom 沒有 speechSynthesis，所以這裡自己裝一個假的，
 * 確認「送給語音引擎的是什麼文字」—— 這正是最容易寫錯的地方。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { LocalStorageProgressRepository, MemoryStore } from '@/lib/progress/repository';

interface FakeUtterance {
  text: string;
  lang: string;
  rate: number;
  voice: unknown;
  onend?: () => void;
  onerror?: () => void;
}

let spoken: FakeUtterance[] = [];
let cancelCount = 0;

function installFakeSpeech(voices: { name: string; lang: string; localService: boolean }[]) {
  spoken = [];
  cancelCount = 0;

  class FakeSpeechSynthesisUtterance {
    text: string;
    lang = '';
    rate = 1;
    voice: unknown = null;
    onend?: () => void;
    onerror?: () => void;
    constructor(text: string) {
      this.text = text;
    }
  }

  const synth = {
    getVoices: () => voices,
    speak: (utterance: FakeUtterance) => {
      spoken.push(utterance);
    },
    cancel: () => {
      cancelCount++;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeSpeechSynthesisUtterance);
}

function setup(route: string, store = new MemoryStore()) {
  const repository = new LocalStorageProgressRepository(store, () => '2026-08-16T10:00:00.000Z');
  return {
    store,
    view: render(
      <MemoryRouter initialEntries={[route]}>
        <App today="2026-08-16" repository={repository} />
      </MemoryRouter>,
    ),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('沒有日文語音時', () => {
  beforeEach(() => {
    installFakeSpeech([{ name: 'Samantha', lang: 'en-US', localService: true }]);
  });

  it('不顯示發音按鈕', async () => {
    setup('/week/2/day/1');
    await screen.findAllByRole('checkbox');
    expect(screen.queryByRole('button', { name: /播放/ })).not.toBeInTheDocument();
  });

  it('設定頁說明如何加裝日文語音', async () => {
    setup('/settings');
    expect(await screen.findByText(/這個瀏覽器沒有可用的日文語音/)).toBeInTheDocument();
    expect(screen.getByText(/輔助使用/)).toBeInTheDocument();
  });
});

describe('有日文語音時', () => {
  beforeEach(() => {
    installFakeSpeech([
      { name: 'Kyoko', lang: 'ja-JP', localService: true },
      { name: 'Hattori', lang: 'ja-JP', localService: true },
      { name: 'Samantha', lang: 'en-US', localService: true },
    ]);
  });

  it('語彙頁出現單字與例句的發音按鈕', async () => {
    setup('/week/2/day/1');
    await screen.findAllByRole('checkbox');
    expect(screen.getAllByRole('button', { name: '播放發音' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '播放例句' }).length).toBeGreaterThan(0);
  });

  it('單字唸的是假名讀音，不是漢字（保證讀音正確）', async () => {
    const user = userEvent.setup();
    setup('/week/2/day/1');
    await screen.findAllByRole('checkbox');

    await user.click(screen.getAllByRole('button', { name: '播放發音' })[0]!);

    expect(spoken).toHaveLength(1);
    expect(spoken[0]!.text).toBe('ぼしゅう'); // 募集 的讀音
    expect(spoken[0]!.lang).toBe('ja-JP');
  });

  it('例句唸的是含漢字的原文（斷句與語調比較自然）', async () => {
    const user = userEvent.setup();
    setup('/week/2/day/1');
    await screen.findAllByRole('checkbox');

    await user.click(screen.getAllByRole('button', { name: '播放例句' })[0]!);

    expect(spoken[0]!.text).toBe('来月のイベントのボランティアを募集しています。');
    expect(spoken[0]!.text).not.toContain('{');
  });

  it('再按一次同一顆按鈕會停止，而不是重複播放', async () => {
    const user = userEvent.setup();
    setup('/week/2/day/1');
    await screen.findAllByRole('checkbox');

    const button = screen.getAllByRole('button', { name: '播放發音' })[0]!;
    await user.click(button);
    expect(spoken).toHaveLength(1);
    expect(screen.getByRole('button', { name: '停止播放發音' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '停止播放發音' }));
    expect(spoken).toHaveLength(1); // 沒有再送出第二段
    expect(cancelCount).toBeGreaterThan(0);
  });

  it('按另一顆按鈕會先取消前一段，不會兩段疊在一起', async () => {
    const user = userEvent.setup();
    setup('/week/2/day/1');
    await screen.findAllByRole('checkbox');

    const buttons = screen.getAllByRole('button', { name: '播放發音' });
    await user.click(buttons[0]!);
    const cancelsBefore = cancelCount;
    await user.click(buttons[1]!);

    expect(cancelCount).toBeGreaterThan(cancelsBefore);
    expect(spoken).toHaveLength(2);
    expect(spoken[1]!.text).toBe('じゅよう'); // 需要
  });

  it('套用設定頁選的語速', async () => {
    const user = userEvent.setup();
    const { store, view } = setup('/settings');

    await screen.findByText('日文發音');
    await user.click(screen.getByRole('button', { name: '0.7×' }));
    view.unmount();

    setup('/week/2/day/1', store);
    await screen.findAllByRole('checkbox');
    await user.click(screen.getAllByRole('button', { name: '播放發音' })[0]!);
    expect(spoken[spoken.length - 1]!.rate).toBe(0.7);
  });

  it('套用設定頁選的語音', async () => {
    const user = userEvent.setup();
    const { store, view } = setup('/settings');

    await screen.findByText('日文發音');
    await user.selectOptions(screen.getByRole('combobox'), 'Hattori');
    view.unmount();

    setup('/week/2/day/1', store);
    await screen.findAllByRole('checkbox');
    await user.click(screen.getAllByRole('button', { name: '播放發音' })[0]!);
    expect((spoken[spoken.length - 1]!.voice as { name: string }).name).toBe('Hattori');
  });

  it('設定頁的語音清單只列日文語音', async () => {
    setup('/settings');
    await screen.findByText('日文發音');
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toContain('Kyoko（本機）');
    expect(options).toContain('Hattori（本機）');
    expect(options.some((o) => o?.includes('Samantha'))).toBe(false);
  });

  it('作答中仍然不出現發音按鈕（避免唸出漢字読み的答案）', async () => {
    const user = userEvent.setup();
    setup('/quiz/diag-01');
    await user.click(await screen.findByRole('button', { name: '開始作答' }));
    expect(screen.queryByRole('button', { name: /播放/ })).not.toBeInTheDocument();
  });

  it('交卷後的逐題檢討才出現題幹發音', async () => {
    const user = userEvent.setup();
    setup('/quiz/diag-01');
    await user.click(await screen.findByRole('button', { name: '開始作答' }));
    await user.click(screen.getByRole('button', { name: '交卷' }));
    await screen.findByText('逐題檢討');

    const buttons = screen.getAllByRole('button', { name: '播放題幹' });
    expect(buttons).toHaveLength(12);

    await user.click(buttons[0]!);
    // 挖空與大括號都不會被唸出來
    expect(spoken[0]!.text).not.toContain('＿');
    expect(spoken[0]!.text).not.toContain('{');
  });
});
