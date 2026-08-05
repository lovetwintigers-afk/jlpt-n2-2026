import { Link } from 'react-router-dom';
import { JaText } from './JaText';
import { SpeakButton } from './SpeakButton';
import { useProgress } from '@/state/ProgressProvider';
import { useToday } from '@/state/TodayProvider';
import { taskKey, taskLabel } from '@/lib/progress/taskKey';
import {
  getComparison,
  getGrammarSet,
  getListeningExercise,
  getPassage,
  getQuestions,
  getQuiz,
  getVocabularySet,
} from '@/lib/content/queries';
import type {
  GrammarComparison,
  GrammarItem,
  TaskItem,
  VocabularyItem,
} from '@/lib/content/schemas';

/**
 * 一個任務項目：卡片外框 + 完成勾選 + 內容本體。
 *
 * 每一種 kind 對應一個小元件。找不到內容時顯示說明而不是留白或拋錯 ——
 * 十七週的內容是逐週補上的，缺內容是正常狀態。
 */
export function TaskItemView({
  item,
  week,
  dayIndex,
}: {
  item: TaskItem;
  week: number;
  dayIndex: number;
}) {
  const { state, dispatch } = useProgress();
  const { today } = useToday();

  const key = taskKey(week, dayIndex, item);
  const done = state.tasks[key]?.status === 'done';
  const checkboxId = `task-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;

  return (
    <section className={`card taskcard${done ? ' taskcard--done' : ''}`}>
      <div className="taskcard__head">
        <h2 className="taskcard__title">{taskLabel(item)}</h2>
        <label className="taskcheck" htmlFor={checkboxId}>
          <input
            id={checkboxId}
            type="checkbox"
            checked={done}
            onChange={() => dispatch({ type: 'task/toggle', key, today })}
          />
          <span>{done ? '已完成' : '標記完成'}</span>
        </label>
      </div>
      <TaskItemBody item={item} />
    </section>
  );
}

function TaskItemBody({ item }: { item: TaskItem }) {
  switch (item.kind) {
    case 'note':
      return <NoteBody body={item.body} />;

    case 'vocabulary': {
      const set = getVocabularySet(item.setId);
      if (!set) return <MissingContent label={`語彙集 ${item.setId}`} />;
      const items = item.count ? set.items.slice(0, item.count) : set.items;
      return <VocabularyBody title={set.title} items={items} />;
    }

    case 'grammar': {
      const set = getGrammarSet(item.setId);
      if (!set) return <MissingContent label={`文法集 ${item.setId}`} />;
      return <GrammarBody title={set.title} items={set.items} />;
    }

    case 'comparison': {
      const comparisons = item.comparisonIds
        .map((id) => getComparison(id))
        .filter((c): c is GrammarComparison => !!c);
      if (comparisons.length === 0) return <MissingContent label="文法比較表" />;
      return (
        <>
          {comparisons.map((c) => (
            <ComparisonBody key={c.id} comparison={c} />
          ))}
        </>
      );
    }

    case 'kanji': {
      const questions = getQuestions(item.questionIds);
      if (questions.length === 0) return <MissingContent label="漢字小測" />;
      return (
        <p className="muted">
          {questions.length} 題。作答介面完成後可以在這裡直接練習。
        </p>
      );
    }

    case 'quiz': {
      const quiz = getQuiz(item.quizId);
      if (!quiz) return <MissingContent label={`測驗 ${item.quizId}`} />;
      return (
        <>
          <p className="dash__today-title">{quiz.title}</p>
          <p className="muted">
            {quiz.questionIds.length} 題
            {quiz.timeLimitSec
              ? ` · 限時 ${Math.round(quiz.timeLimitSec / 60)} 分鐘`
              : ' · 不限時'}
          </p>
          {quiz.description && <p style={{ marginTop: 'var(--space-3)' }}>{quiz.description}</p>}
          <p style={{ marginTop: 'var(--space-4)' }}>
            <Link to={`/quiz/${quiz.id}`} className="btn btn--primary">
              開始測驗
            </Link>
          </p>
        </>
      );
    }

    case 'reading': {
      const passages = item.passageIds.map((id) => getPassage(id)).filter(Boolean);
      if (passages.length === 0) return <MissingContent label="讀解文章" />;
      return (
        <ul className="stack stack--tight" style={{ listStyle: 'none' }}>
          {passages.map((p) => (
            <li key={p!.id}>
              <JaText text={p!.title} />{' '}
              <span className="muted">約 {Math.round(p!.suggestedTimeSec / 60)} 分</span>
            </li>
          ))}
        </ul>
      );
    }

    case 'listening': {
      const exercises = item.exerciseIds.map((id) => getListeningExercise(id)).filter(Boolean);
      if (exercises.length === 0) return <MissingContent label="聽解題組" />;
      return <p className="muted">{exercises.length} 個題組</p>;
    }

    case 'mistake-review':
      return (
        <p>
          從前 {item.lookbackWeeks} 週答錯、且尚未連續答對兩次的題目中，抽出{' '}
          {item.count} 題重做。
        </p>
      );
  }
}

// ---------------------------------------------------------------------------

function MissingContent({ label }: { label: string }) {
  return (
    <p className="empty-state">
      {label} 的內容尚未加入。可以到 content/ 資料夾補上這一份 JSON（見 CONTENT_GUIDE.md）。
    </p>
  );
}

function NoteBody({ body }: { body: string }) {
  return (
    <div className="stack stack--tight">
      {body.split('\n\n').map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}

function VocabularyBody({ title, items }: { title: string; items: VocabularyItem[] }) {
  return (
    <>
      <p className="muted">
        {title}　{items.length} 詞
      </p>
      <ul className="vocablist">
        {items.map((item) => (
          <li key={item.id} className="vocabitem">
            <div className="vocabitem__head">
              <JaText text={item.word} className="ja-headword" />
              <span className="tag">{item.partOfSpeech}</span>
              {/* 單字唸假名：像「行った」這種有多種讀法的詞，
                  唸假名才能保證聽到的是這裡要教的讀音 */}
              <SpeakButton text={item.word} mode="reading" id={`voc-${item.id}`} />
            </div>
            <p className="vocabitem__meaning">{item.meaningZh}</p>
            <ul className="vocabitem__examples">
              {item.examples.map((example, i) => (
                <li key={i}>
                  <div className="example__row">
                    <JaText text={example.jp} className="ja-example" as="div" />
                    <SpeakButton
                      text={example.jp}
                      mode="text"
                      id={`voc-${item.id}-ex-${i}`}
                      label="例句"
                      size="sm"
                    />
                  </div>
                  <p className="vocabitem__zh">{example.zh}</p>
                </li>
              ))}
            </ul>
            {item.note && <p className="vocabitem__note">{item.note}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}

function GrammarBody({ title, items }: { title: string; items: GrammarItem[] }) {
  return (
    <>
      <p className="muted">
        {title}　{items.length} 條
      </p>
      <ul className="vocablist">
        {items.map((item) => (
          <li key={item.id} className="vocabitem">
            <div className="vocabitem__head">
              <JaText text={item.pattern} className="grammaritem__pattern" />
            </div>
            <p className="grammaritem__connection">
              接續：<JaText text={item.connection} />
            </p>
            <p className="vocabitem__meaning">{item.meaningZh}</p>
            <p className="grammaritem__nuance">{item.nuanceZh}</p>
            <ul className="vocabitem__examples">
              {item.examples.map((example, i) => (
                <li key={i}>
                  <div className="example__row">
                    <JaText text={example.jp} className="ja-example" as="div" />
                    <SpeakButton
                      text={example.jp}
                      mode="text"
                      id={`gra-${item.id}-ex-${i}`}
                      label="例句"
                      size="sm"
                    />
                  </div>
                  <p className="vocabitem__zh">{example.zh}</p>
                </li>
              ))}
            </ul>
            {item.cautionZh && <p className="grammaritem__caution">注意：{item.cautionZh}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}

function ComparisonBody({ comparison }: { comparison: GrammarComparison }) {
  return (
    <>
      <p className="comparison__title">
        <JaText text={comparison.title} />
      </p>

      <div className="table-scroll">
        <table className="comparison">
          <thead>
            <tr>
              <th scope="col">比較維度</th>
              {comparison.patterns.map((p) => (
                <th key={p.pattern} scope="col">
                  <JaText text={p.pattern} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.axes.map((axis) => (
              <tr key={axis.label}>
                <th scope="row">{axis.label}</th>
                {axis.cells.map((cell, i) => (
                  <td key={i}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="comparison__summary">{comparison.summaryZh}</p>

      {comparison.examples.length > 0 && (
        <ul className="vocabitem__examples">
          {comparison.examples.map((example, i) => (
            <li key={i}>
              <div className="example__row">
                <JaText text={example.jp} className="ja-example" as="div" />
                <SpeakButton
                  text={example.jp}
                  mode="text"
                  id={`cmp-${comparison.id}-ex-${i}`}
                  label="例句"
                  size="sm"
                />
              </div>
              <p className="vocabitem__zh">{example.zh}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
