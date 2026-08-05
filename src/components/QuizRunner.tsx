import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { JaText } from './JaText';
import { SpeakButton } from './SpeakButton';
import { useProgress } from '@/state/ProgressProvider';
import { getPassage } from '@/lib/content/queries';
import { nextAttemptNo } from '@/lib/progress/reducer';
import { SKILL_LABELS } from '@/lib/course/outline';
import {
  buildQuestionMeta,
  formatDuration,
  gradeQuiz,
  meetsPassingBar,
  toQuizAttempt,
  toUserAnswers,
  type QuizResult,
  type Selections,
} from '@/lib/quiz/session';
import type { OptionKey, Quiz, QuizQuestion } from '@/lib/content/schemas';

type Phase = 'intro' | 'answering' | 'result';

/**
 * 測驗作答介面。週複習測驗、診斷測驗與模擬考共用同一個元件，
 * 差別只在 Quiz 資料裡的 timeLimitSec 與 showAnswerMode。
 *
 * 鍵盤操作：作答中按 1–4 選答案，← → 換題。
 */
export function QuizRunner({ quiz, questions }: { quiz: Quiz; questions: QuizQuestion[] }) {
  const { state, dispatch } = useProgress();

  const [phase, setPhase] = useState<Phase>('intro');
  const [selections, setSelections] = useState<Selections>({});
  const [index, setIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const startedAtRef = useRef<number>(0);
  const startedAtIsoRef = useRef<string>('');
  const questionEnteredAtRef = useRef<number>(0);
  const elapsedByQuestionRef = useRef<Record<string, number>>({});
  const submittedRef = useRef(false);

  const current = questions[index];
  const answeredCount = questions.filter((q) => selections[q.id]).length;

  /** 記錄離開目前這一題時累計的作答時間 */
  const recordTimeOnCurrent = useCallback(() => {
    if (!current || questionEnteredAtRef.current === 0) return;
    const spent = Date.now() - questionEnteredAtRef.current;
    elapsedByQuestionRef.current[current.id] =
      (elapsedByQuestionRef.current[current.id] ?? 0) + spent;
    questionEnteredAtRef.current = Date.now();
  }, [current]);

  const submit = useCallback(
    (viaTimeout: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      recordTimeOnCurrent();

      const graded = gradeQuiz(questions, selections);
      const submittedAt = new Date().toISOString();
      const elapsedMs = Date.now() - startedAtRef.current;

      const answers = toUserAnswers(graded, {
        quizId: quiz.id,
        answeredAt: submittedAt,
        elapsedByQuestion: elapsedByQuestionRef.current,
        attemptNoFor: (questionId) => nextAttemptNo(state, questionId),
      });

      dispatch({
        type: 'quiz/submit',
        attempt: toQuizAttempt(graded, quiz, {
          startedAt: startedAtIsoRef.current,
          submittedAt,
          elapsedMs,
          timedOut: viaTimeout,
        }),
        answers,
        questionMeta: buildQuestionMeta(questions),
      });

      setResult(graded);
      setTimedOut(viaTimeout);
      setPhase('result');
    },
    [dispatch, questions, quiz, recordTimeOnCurrent, selections, state],
  );

  // 倒數。每秒更新一次，歸零時自動交卷。
  useEffect(() => {
    if (phase !== 'answering' || !quiz.timeLimitSec) return;
    const deadline = startedAtRef.current + quiz.timeLimitSec * 1000;
    const tick = () => {
      const left = deadline - Date.now();
      setRemainingMs(Math.max(0, left));
      if (left <= 0) submit(true);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [phase, quiz.timeLimitSec, submit]);

  // 鍵盤操作
  useEffect(() => {
    if (phase !== 'answering' || !current) return;
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      const optionIndex = ['1', '2', '3', '4'].indexOf(event.key);
      if (optionIndex >= 0 && current.options[optionIndex]) {
        event.preventDefault();
        choose(current.options[optionIndex]!.key);
        return;
      }
      if (event.key === 'ArrowRight' && index < questions.length - 1) {
        event.preventDefault();
        goTo(index + 1);
      }
      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        goTo(index - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  function start() {
    startedAtRef.current = Date.now();
    startedAtIsoRef.current = new Date().toISOString();
    questionEnteredAtRef.current = Date.now();
    setPhase('answering');
  }

  function choose(key: OptionKey) {
    if (!current) return;
    setSelections((prev) => ({ ...prev, [current.id]: key }));
  }

  function goTo(nextIndex: number) {
    recordTimeOnCurrent();
    setIndex(nextIndex);
  }

  if (phase === 'intro') {
    return <QuizIntro quiz={quiz} questionCount={questions.length} onStart={start} />;
  }

  if (phase === 'result' && result) {
    return (
      <QuizResultView
        quiz={quiz}
        result={result}
        timedOut={timedOut}
        elapsedMs={Date.now() - startedAtRef.current}
      />
    );
  }

  if (!current) return null;

  const showImmediate = quiz.showAnswerMode === 'immediate' && !!selections[current.id];

  return (
    <div className="stack">
      <div className="quizbar">
        <span className="quizbar__count">
          第 {index + 1} / {questions.length} 題
        </span>
        {remainingMs !== null && (
          <span
            className={`quizbar__timer${remainingMs < 60_000 ? ' quizbar__timer--low' : ''}`}
            role="timer"
            aria-live="off"
          >
            剩餘 {formatDuration(remainingMs)}
          </span>
        )}
        <span className="quizbar__answered">已作答 {answeredCount} 題</span>
      </div>

      <div className="progress progress--sm">
        <div
          className="progress__track"
          role="progressbar"
          aria-valuenow={Math.round(((index + 1) / questions.length) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="作答進度"
        >
          <div
            className="progress__fill"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <QuestionCard
        question={current}
        selected={selections[current.id] ?? null}
        onChoose={choose}
        revealAnswer={showImmediate}
      />

      <nav className="quiznav" aria-label="題目切換">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
        >
          ← 上一題
        </button>
        {/* 交卷隨時都能按 —— 正式考試也可以提早交卷。
            未答完時下方會顯示提醒，但不阻擋。 */}
        <div className="quiznav__right">
          <button
            type="button"
            className={`btn ${index === questions.length - 1 ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => submit(false)}
          >
            交卷
          </button>
          {index < questions.length - 1 && (
            <button type="button" className="btn btn--primary" onClick={() => goTo(index + 1)}>
              下一題 →
            </button>
          )}
        </div>
      </nav>

      <div className="quizjump">
        {questions.map((question, i) => (
          <button
            key={question.id}
            type="button"
            className={`quizjump__item${i === index ? ' quizjump__item--current' : ''}${
              selections[question.id] ? ' quizjump__item--answered' : ''
            }`}
            onClick={() => goTo(i)}
            aria-label={`第 ${i + 1} 題${selections[question.id] ? '（已作答）' : '（未作答）'}`}
            aria-current={i === index ? 'true' : undefined}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {answeredCount < questions.length && (
        <p className="notice notice--highlight">
          還有 {questions.length - answeredCount} 題未作答。未作答會算錯，正式考試也一樣，
          不確定的題目建議先猜一個。
        </p>
      )}

      <p className="stat__hint" style={{ textAlign: 'center' }}>
        鍵盤：按 1–4 選答案，← → 換題
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function QuizIntro({
  quiz,
  questionCount,
  onStart,
}: {
  quiz: Quiz;
  questionCount: number;
  onStart: () => void;
}) {
  return (
    <div className="stack">
      <section className="card">
        <h2 className="card__title">開始前</h2>
        <p className="dash__today-title">{quiz.title}</p>
        <p className="muted">
          {questionCount} 題
          {quiz.timeLimitSec
            ? ` · 限時 ${Math.round(quiz.timeLimitSec / 60)} 分鐘`
            : ' · 不限時'}
          {quiz.showAnswerMode === 'after-submit' ? ' · 交卷後才顯示答案' : ' · 作答後立即對答'}
        </p>
        {quiz.description && <p style={{ marginTop: 'var(--space-3)' }}>{quiz.description}</p>}
        {quiz.timeLimitSec && (
          <p className="notice notice--highlight" style={{ marginTop: 'var(--space-4)' }}>
            按下開始後就會計時。時間到會自動交卷，已作答的部分都會保留。
          </p>
        )}
        <p style={{ marginTop: 'var(--space-5)' }}>
          <button type="button" className="btn btn--primary" onClick={onStart}>
            開始作答
          </button>
        </p>
      </section>
      <p className="stat__hint" style={{ textAlign: 'center' }}>
        本測驗為自製題目，非官方 JLPT 真題。
      </p>
    </div>
  );
}

function QuestionCard({
  question,
  selected,
  onChoose,
  revealAnswer,
}: {
  question: QuizQuestion;
  selected: OptionKey | null;
  onChoose: (key: OptionKey) => void;
  revealAnswer: boolean;
}) {
  const passage = question.contextId ? getPassage(question.contextId) : undefined;

  return (
    <>
      {passage && (
        <section className="card">
          <h2 className="card__title">{passage.title}</h2>
          <div className="ja-passage">
            {passage.paragraphs.map((paragraph, i) => (
              <JaText key={i} text={paragraph} as="p" />
            ))}
          </div>
          {passage.vocabHints.length > 0 && (
            <ul className="vocabhints">
              {passage.vocabHints.map((hint) => (
                <li key={hint.term}>
                  <span lang="ja">
                    {hint.term}（{hint.reading}）
                  </span>
                  ：{hint.meaningZh}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="card">
        <h2 className="card__title">
          {SKILL_LABELS[question.skill]}　<span lang="ja">{question.questionType}</span>
        </h2>
        <JaText text={question.stem} as="p" className="quizstem" />

        <ul className="options">
          {question.options.map((option, i) => {
            const isSelected = selected === option.key;
            const isAnswer = option.key === question.answer;
            const classes = [
              'option',
              isSelected ? 'option--selected' : '',
              revealAnswer && isAnswer ? 'option--correct' : '',
              revealAnswer && isSelected && !isAnswer ? 'option--wrong' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <li key={option.key}>
                <button
                  type="button"
                  className={classes}
                  onClick={() => onChoose(option.key)}
                  aria-pressed={isSelected}
                >
                  <span className="option__key" aria-hidden="true">
                    {i + 1}
                  </span>
                  <JaText text={option.text} className="option__text" />
                </button>
              </li>
            );
          })}
        </ul>

        {revealAnswer && (
          <div className="explanation">
            <p>{question.explanationZh}</p>
          </div>
        )}
      </section>
    </>
  );
}

function QuizResultView({
  quiz,
  result,
  timedOut,
  elapsedMs,
}: {
  quiz: Quiz;
  result: QuizResult;
  timedOut: boolean;
  elapsedMs: number;
}) {
  const passed = meetsPassingBar(result, quiz);
  const percent = Math.round(result.accuracy * 100);

  return (
    <div className="stack">
      <section className="card" aria-label="測驗結果">
        <h2 className="card__title">結果</h2>
        {timedOut && (
          <p className="notice notice--highlight" style={{ marginBottom: 'var(--space-4)' }}>
            時間到，已自動交卷。
          </p>
        )}
        <div className="grid grid--3">
          <div>
            <p className="stat__label">正確率</p>
            <p className="stat__value">{percent}%</p>
            <p className="stat__hint">
              {result.correctCount} / {result.totalCount} 題
            </p>
          </div>
          <div>
            <p className="stat__label">作答時間</p>
            <p className="stat__value">{formatDuration(elapsedMs)}</p>
            <p className="stat__hint">
              平均每題 {formatDuration(elapsedMs / Math.max(result.totalCount, 1))}
            </p>
          </div>
          <div>
            <p className="stat__label">未作答</p>
            <p className="stat__value">
              {result.unansweredCount}
              <span className="stat__unit">題</span>
            </p>
          </div>
        </div>

        {quiz.passingAccuracy !== undefined && (
          <p className={`notice ${passed ? 'notice--accent' : ''}`} style={{ marginTop: 'var(--space-4)' }}>
            {passed
              ? `已達本週目標（${Math.round(quiz.passingAccuracy * 100)}%）。`
              : `本週目標是 ${Math.round(quiz.passingAccuracy * 100)}%，還差一點。錯題已經記下來了，之後會排進複習。`}
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">各項能力</h2>
        <div className="stack stack--tight">
          {(Object.entries(result.countsBySkill) as [keyof typeof SKILL_LABELS, { correct: number; total: number }][]).map(
            ([skill, counts]) => (
              <div key={skill} className="skillrow">
                <div className="skillrow__head">
                  <span className="skillrow__name" lang="ja">
                    {SKILL_LABELS[skill]}
                  </span>
                  <span className="skillrow__value">
                    {counts.correct} / {counts.total}
                  </span>
                </div>
                <div className="skillrow__track">
                  <div
                    className="skillrow__fill"
                    style={{
                      width: `${(counts.correct / Math.max(counts.total, 1)) * 100}%`,
                      background: 'var(--accent)',
                    }}
                  />
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      <h2 className="page-header__title" style={{ fontSize: 'var(--text-xl)' }}>
        逐題檢討
      </h2>

      {result.graded.map((entry, i) => (
        <ReviewCard key={entry.question.id} entry={entry} index={i} />
      ))}

      <div className="grid grid--2">
        <Link to="/mistakes" className="btn btn--primary btn--block">
          查看錯題本
        </Link>
        <Link to={`/week/${quiz.week}`} className="btn btn--secondary btn--block">
          回到第 {quiz.week} 週
        </Link>
      </div>
    </div>
  );
}

function ReviewCard({
  entry,
  index,
}: {
  entry: QuizResult['graded'][number];
  index: number;
}) {
  const { question, selected, isCorrect, unanswered } = entry;
  return (
    <section className={`card reviewcard${isCorrect ? ' reviewcard--correct' : ' reviewcard--wrong'}`}>
      <div className="taskcard__head">
        <h3 className="taskcard__title">第 {index + 1} 題</h3>
        <div className="reviewcard__actions">
          {/* 發音只出現在檢討階段。作答中若能唸題幹，
              漢字読み的題目等於直接把答案唸出來。 */}
          <SpeakButton text={question.stem} mode="text" id={`review-${question.id}`} label="題幹" size="sm" />
          <span className={`tag ${isCorrect ? 'tag--success' : 'tag--highlight'}`}>
            {isCorrect ? '答對' : unanswered ? '未作答' : '答錯'}
          </span>
        </div>
      </div>

      <JaText text={question.stem} as="p" className="quizstem" />

      <ul className="options options--review">
        {question.options.map((option, i) => {
          const isSelected = selected === option.key;
          const isAnswer = option.key === question.answer;
          const classes = [
            'option',
            'option--static',
            isAnswer ? 'option--correct' : '',
            isSelected && !isAnswer ? 'option--wrong' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={option.key}>
              <div className={classes}>
                <span className="option__key" aria-hidden="true">
                  {i + 1}
                </span>
                <JaText text={option.text} className="option__text" />
                {isAnswer && <span className="option__badge">正解</span>}
                {isSelected && !isAnswer && <span className="option__badge">你選的</span>}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="explanation">
        <p>{question.explanationZh}</p>
        {question.distractorNotesZh && (
          <ul className="explanation__notes">
            {(Object.entries(question.distractorNotesZh) as [OptionKey, string | undefined][])
              .filter(([, note]) => !!note)
              .map(([key, note]) => (
                <li key={key}>
                  {question.options.findIndex((o) => o.key === key) + 1}：{note}
                </li>
              ))}
          </ul>
        )}
      </div>
    </section>
  );
}
