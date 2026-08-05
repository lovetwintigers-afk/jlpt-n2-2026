/**
 * 端到端確認測驗流程：作答 → 交卷 → 成績 → 錯題自動進錯題本 → 重做後消化。
 * 用第 2 週的真實測驗內容跑，不是假資料。
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
import { getQuestions, getQuiz } from '@/lib/content/queries';

function setup(route: string, store = new MemoryStore()) {
  const repository = new LocalStorageProgressRepository(store, () => '2026-08-21T10:00:00.000Z');
  const view = render(
    <MemoryRouter initialEntries={[route]}>
      <App today="2026-08-21" repository={repository} />
    </MemoryRouter>,
  );
  return { store, view };
}

function stored(store: MemoryStore) {
  const raw = store.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

const quiz = getQuiz('w02-review')!;
const questions = getQuestions(quiz.questionIds);

/** 作答目前這一題：correct = 選正解，否則選一個錯的 */
async function answerCurrent(
  user: ReturnType<typeof userEvent.setup>,
  index: number,
  correct: boolean,
) {
  const question = questions[index]!;
  const key = correct
    ? question.answer
    : question.options.find((o) => o.key !== question.answer)!.key;
  const optionIndex = question.options.findIndex((o) => o.key === key);
  const options = screen.getAllByRole('button').filter((b) => b.className.startsWith('option'));
  await user.click(options[optionIndex]!);
}

/**
 * 走完整份測驗並交卷。
 * 未作答的題目交卷時一律算錯，所以想精準控制錯題數就得每一題都作答。
 */
async function takeQuiz(
  user: ReturnType<typeof userEvent.setup>,
  isCorrect: (index: number) => boolean,
) {
  await user.click(await screen.findByRole('button', { name: '開始作答' }));
  for (let i = 0; i < questions.length; i++) {
    await answerCurrent(user, i, isCorrect(i));
    if (i < questions.length - 1) {
      await user.click(screen.getByRole('button', { name: '下一題 →' }));
    }
  }
  await user.click(screen.getByRole('button', { name: '交卷' }));
  await screen.findByText('逐題檢討');
}

describe('測驗作答流程', () => {
  it('開始前顯示題數與限時，按下開始才計時', async () => {
    const user = userEvent.setup();
    setup('/quiz/w02-review');

    expect(await screen.findByText(/^12 題 · 限時 12 分鐘/)).toBeInTheDocument();
    expect(screen.getByText(/本測驗為自製題目，非官方 JLPT 真題/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '開始作答' }));
    expect(screen.getByText('第 1 / 12 題')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
  });

  it('選擇答案後可以前後換題，選擇會保留', async () => {
    const user = userEvent.setup();
    setup('/quiz/w02-review');
    await user.click(await screen.findByRole('button', { name: '開始作答' }));

    await answerCurrent(user, 0, true);
    expect(screen.getByText('已作答 1 題')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '下一題 →' }));
    expect(screen.getByText('第 2 / 12 題')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '← 上一題' }));
    expect(screen.getByText('第 1 / 12 題')).toBeInTheDocument();
    const selected = screen.getAllByRole('button').filter((b) => b.className.includes('option--selected'));
    expect(selected).toHaveLength(1);
  });

  it('可以用題號直接跳題', async () => {
    const user = userEvent.setup();
    setup('/quiz/w02-review');
    await user.click(await screen.findByRole('button', { name: '開始作答' }));

    await user.click(screen.getByRole('button', { name: '第 5 題（未作答）' }));
    expect(screen.getByText('第 5 / 12 題')).toBeInTheDocument();
  });

  it('鍵盤按 1–4 可以選答案', async () => {
    const user = userEvent.setup();
    setup('/quiz/w02-review');
    await user.click(await screen.findByRole('button', { name: '開始作答' }));

    await user.keyboard('2');
    expect(screen.getByText('已作答 1 題')).toBeInTheDocument();
    const selected = screen.getAllByRole('button').filter((b) => b.className.includes('option--selected'));
    expect(selected).toHaveLength(1);
  });

  it('最後一題若有未作答會提醒，但不阻擋交卷', async () => {
    const user = userEvent.setup();
    setup('/quiz/w02-review');
    await user.click(await screen.findByRole('button', { name: '開始作答' }));

    await user.click(screen.getByRole('button', { name: '第 12 題（未作答）' }));
    expect(screen.getByText(/還有 12 題未作答/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '交卷' })).toBeEnabled();
  });
});

describe('交卷與成績', () => {
  it('交卷後顯示正確率與逐題檢討，並標出正解', async () => {
    const user = userEvent.setup();
    setup('/quiz/w02-review');
    await user.click(await screen.findByRole('button', { name: '開始作答' }));

    // 前 8 題答對、後 4 題答錯
    for (let i = 0; i < questions.length; i++) {
      await answerCurrent(user, i, i < 8);
      if (i < questions.length - 1) {
        await user.click(screen.getByRole('button', { name: '下一題 →' }));
      }
    }
    await user.click(screen.getByRole('button', { name: '交卷' }));

    const resultCard = await screen.findByRole('region', { name: '測驗結果' });
    expect(within(resultCard).getByText('67%')).toBeInTheDocument(); // 8/12
    expect(within(resultCard).getByText('8 / 12 題')).toBeInTheDocument();

    expect(screen.getByText('逐題檢討')).toBeInTheDocument();
    expect(screen.getAllByText('正解')).toHaveLength(questions.length);
    expect(screen.getAllByText('答對')).toHaveLength(8);
    expect(screen.getAllByText('答錯')).toHaveLength(4);
  });

  it('未達本週目標時給的是說明，不是責備', async () => {
    const user = userEvent.setup();
    setup('/quiz/w02-review');
    await user.click(await screen.findByRole('button', { name: '開始作答' }));

    for (let i = 0; i < questions.length; i++) {
      await answerCurrent(user, i, false);
      if (i < questions.length - 1) await user.click(screen.getByRole('button', { name: '下一題 →' }));
    }
    await user.click(screen.getByRole('button', { name: '交卷' }));

    expect(await screen.findByText(/本週目標是 70%，還差一點/)).toBeInTheDocument();
    expect(screen.getByText(/錯題已經記下來了/)).toBeInTheDocument();
  });

  it('作答時交卷前不會洩漏答案（after-submit 模式）', async () => {
    const user = userEvent.setup();
    setup('/quiz/w02-review');
    await user.click(await screen.findByRole('button', { name: '開始作答' }));
    await answerCurrent(user, 0, false);

    expect(screen.queryByText('正解')).not.toBeInTheDocument();
    expect(screen.queryByText(questions[0]!.explanationZh)).not.toBeInTheDocument();
  });
});

describe('錯題自動進錯題本', () => {
  it('答錯的題目全部出現在錯題本，答對的不會', async () => {
    const user = userEvent.setup();
    const { store, view } = setup('/quiz/w02-review');
    await takeQuiz(user, (i) => i < 8);
    view.unmount();

    await waitFor(() => {
      const data = stored(store);
      expect(Object.keys(data.mistakes)).toHaveLength(4);
      expect(data.quizAttempts).toHaveLength(1);
      expect(data.answers).toHaveLength(12);
    });

    const wrongIds = questions.slice(8).map((q) => q.id);
    expect(Object.keys(stored(store).mistakes).sort()).toEqual([...wrongIds].sort());

    setup('/mistakes', store);
    expect(await screen.findByRole('heading', { name: '錯題本' })).toBeInTheDocument();
    const unresolvedCard = screen.getByText('未消化', { selector: '.stat__label' }).closest('section')!;
    expect(within(unresolvedCard).getByText('4')).toBeInTheDocument();
  });

  it('未作答的題目交卷後也會算錯並進錯題本', async () => {
    const user = userEvent.setup();
    const { store, view } = setup('/quiz/w02-review');
    await user.click(await screen.findByRole('button', { name: '開始作答' }));
    await answerCurrent(user, 0, true); // 只答第一題
    await user.click(screen.getByRole('button', { name: '交卷' }));
    await screen.findByText('逐題檢討');
    view.unmount();

    await waitFor(() => {
      const data = stored(store);
      expect(Object.keys(data.mistakes)).toHaveLength(11); // 12 題扣掉答對的那一題
      expect(data.quizAttempts[0].unansweredCount).toBe(11);
    });
  });

  it('錯題可以標記錯誤原因，並被保存', async () => {
    const user = userEvent.setup();
    const { store, view } = setup('/quiz/w02-review');
    await takeQuiz(user, (i) => i !== 0); // 只有第 1 題答錯
    view.unmount();

    const second = setup('/mistakes', store);
    const select = await screen.findByRole('combobox');
    await user.selectOptions(select, '文法混淆');
    second.view.unmount();

    await waitFor(() => {
      const data = stored(store);
      expect(Object.values(data.mistakes)[0]).toMatchObject({ reason: '文法混淆' });
    });
  });

  it('錯題本可以依狀態篩選', async () => {
    const user = userEvent.setup();
    const { store, view } = setup('/quiz/w02-review');
    await takeQuiz(user, (i) => i !== 0);
    view.unmount();

    setup('/mistakes', store);
    await screen.findByRole('heading', { name: '錯題本' });
    expect(screen.getAllByText(/錯 1 次/)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: '已消化' }));
    expect(screen.getByText('這個篩選條件下沒有錯題。')).toBeInTheDocument();
  });
});

describe('重做後消化錯題', () => {
  it('同一題連續答對兩次後標為已消化', async () => {
    const user = userEvent.setup();
    const store = new MemoryStore();

    // 第一輪第 1 題答錯，之後兩輪全對
    for (let round = 0; round < 3; round++) {
      const { view } = setup('/quiz/w02-review', store);
      await takeQuiz(user, (i) => (round === 0 ? i !== 0 : true));
      view.unmount();
    }

    await waitFor(() => {
      const record = Object.values(stored(store).mistakes)[0] as {
        resolved: boolean;
        consecutiveCorrect: number;
        wrongCount: number;
      };
      expect(record.consecutiveCorrect).toBe(2);
      expect(record.resolved).toBe(true);
      expect(record.wrongCount).toBe(1);
    });
  });
});

describe('發音按鈕不能洩漏答案', () => {
  it('作答中沒有任何發音按鈕（漢字読み題唸出題幹等於報答案）', async () => {
    const user = userEvent.setup();
    setup('/quiz/diag-01');
    await user.click(await screen.findByRole('button', { name: '開始作答' }));

    expect(screen.queryByRole('button', { name: /播放/ })).not.toBeInTheDocument();
  });

  it('jsdom 沒有語音時按鈕整顆不顯示，不留一個按了沒反應的按鈕', async () => {
    const user = userEvent.setup();
    setup('/quiz/diag-01');
    await user.click(await screen.findByRole('button', { name: '開始作答' }));
    await user.click(screen.getByRole('button', { name: '交卷' }));
    await screen.findByText('逐題檢討');

    // jsdom 沒有 speechSynthesis，檢討階段也不會出現發音按鈕
    expect(screen.queryByRole('button', { name: /播放/ })).not.toBeInTheDocument();
  });
});

describe('找不到測驗時的處理', () => {
  it('不存在的測驗 id 顯示說明而不是空白畫面', async () => {
    setup('/quiz/does-not-exist');
    expect(await screen.findByText('找不到這份測驗')).toBeInTheDocument();
    expect(screen.getByText(/尚未建立/)).toBeInTheDocument();
  });
});
