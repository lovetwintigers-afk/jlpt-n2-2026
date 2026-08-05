import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { JaText } from '@/components/JaText';
import { SpeakButton } from '@/components/SpeakButton';
import { useProgress } from '@/state/ProgressProvider';
import { getQuestion } from '@/lib/content/queries';
import { SKILL_LABELS, type Skill } from '@/lib/course/outline';
import { mistakeReasonSchema, type MistakeReason, type MistakeRecord } from '@/lib/progress/schema';
import type { OptionKey } from '@/lib/content/schemas';

const REASONS = mistakeReasonSchema.options;
const ALL_SKILLS: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening'];

type SkillFilter = Skill | 'all';
type StatusFilter = 'unresolved' | 'resolved' | 'all';

export function Mistakes() {
  const { state, dispatch } = useProgress();
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('unresolved');

  const all = useMemo(
    () =>
      Object.values(state.mistakes).sort((a, b) => {
        if (a.week !== b.week) return a.week - b.week;
        return a.questionId.localeCompare(b.questionId);
      }),
    [state.mistakes],
  );

  const filtered = all.filter((mistake) => {
    if (skillFilter !== 'all' && mistake.skill !== skillFilter) return false;
    if (statusFilter === 'unresolved' && mistake.resolved) return false;
    if (statusFilter === 'resolved' && !mistake.resolved) return false;
    return true;
  });

  const unresolvedCount = all.filter((m) => !m.resolved).length;

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">錯題本</h1>
        <p className="page-header__desc">
          答錯的題目會自動收在這裡。連續答對兩次之後才會標為已消化。
        </p>
      </div>

      {all.length === 0 ? (
        <p className="notice">
          還沒有錯題。完成第一次測驗之後，答錯的題目會自動出現在這裡。
        </p>
      ) : (
        <div className="stack">
          <div className="grid grid--2">
            <section className="card">
              <p className="stat__label">未消化</p>
              <p className="stat__value">
                {unresolvedCount}
                <span className="stat__unit">題</span>
              </p>
            </section>
            <section className="card">
              <p className="stat__label">累積錯題</p>
              <p className="stat__value">
                {all.length}
                <span className="stat__unit">題</span>
              </p>
            </section>
          </div>

          <section className="card">
            <h2 className="card__title">篩選</h2>
            <div className="filterbar">
              <FilterGroup
                label="能力"
                options={[
                  { value: 'all', label: '全部' },
                  ...ALL_SKILLS.map((skill) => ({ value: skill, label: SKILL_LABELS[skill] })),
                ]}
                value={skillFilter}
                onChange={(value) => setSkillFilter(value as SkillFilter)}
              />
              <FilterGroup
                label="狀態"
                options={[
                  { value: 'unresolved', label: '未消化' },
                  { value: 'resolved', label: '已消化' },
                  { value: 'all', label: '全部' },
                ]}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as StatusFilter)}
              />
            </div>
          </section>

          {filtered.length === 0 ? (
            <p className="empty-state">這個篩選條件下沒有錯題。</p>
          ) : (
            filtered.map((mistake) => (
              <MistakeCard
                key={mistake.questionId}
                mistake={mistake}
                onSetReason={(reason) =>
                  dispatch({ type: 'mistake/setReason', questionId: mistake.questionId, reason })
                }
                onSetNote={(note) =>
                  dispatch({ type: 'mistake/setNote', questionId: mistake.questionId, note })
                }
                onReset={() => dispatch({ type: 'mistake/reset', questionId: mistake.questionId })}
              />
            ))
          )}
        </div>
      )}
    </>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="filtergroup">
      <legend className="filtergroup__legend">{label}</legend>
      <div className="filtergroup__options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`chip${value === option.value ? ' chip--active' : ''}`}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function MistakeCard({
  mistake,
  onSetReason,
  onSetNote,
  onReset,
}: {
  mistake: MistakeRecord;
  onSetReason: (reason: MistakeReason | undefined) => void;
  onSetNote: (note: string) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const question = getQuestion(mistake.questionId);

  return (
    <section className="card">
      <div className="taskcard__head">
        <h2 className="taskcard__title">
          第 {mistake.week} 週　<span lang="ja">{SKILL_LABELS[mistake.skill]}</span>
        </h2>
        <div className="reviewcard__actions">
          {question && (
            <SpeakButton
              text={question.stem}
              mode="text"
              id={`mistake-${mistake.questionId}`}
              label="題幹"
              size="sm"
            />
          )}
          <span className={`tag ${mistake.resolved ? 'tag--success' : 'tag--highlight'}`}>
            {mistake.resolved ? '已消化' : `錯 ${mistake.wrongCount} 次`}
          </span>
        </div>
      </div>

      {question ? (
        <>
          <JaText text={question.stem} as="p" className="quizstem" />

          <button
            type="button"
            className="linkbutton"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            {open ? '收合答案與解說' : '顯示答案與解說'}
          </button>

          {open && (
            <>
              <ul className="options options--review">
                {question.options.map((option, i) => {
                  const isAnswer = option.key === question.answer;
                  return (
                    <li key={option.key}>
                      <div className={`option option--static${isAnswer ? ' option--correct' : ''}`}>
                        <span className="option__key" aria-hidden="true">
                          {i + 1}
                        </span>
                        <JaText text={option.text} className="option__text" />
                        {isAnswer && <span className="option__badge">正解</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="explanation">
                <p>{question.explanationZh}</p>
                {question.distractorNotesZh && (
                  <ul className="explanation__notes">
                    {(
                      Object.entries(question.distractorNotesZh) as [OptionKey, string | undefined][]
                    )
                      .filter(([, note]) => !!note)
                      .map(([key, note]) => (
                        <li key={key}>
                          {question.options.findIndex((o) => o.key === key) + 1}：{note}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <p className="empty-state">
          這一題的內容已經不在了（可能是內容檔被改過）。紀錄仍保留：錯 {mistake.wrongCount} 次。
        </p>
      )}

      <div className="mistake__meta">
        <label className="mistake__field">
          <span className="mistake__label">錯誤原因</span>
          <select
            value={mistake.reason ?? ''}
            onChange={(event) =>
              onSetReason(event.target.value === '' ? undefined : (event.target.value as MistakeReason))
            }
          >
            <option value="">未標記</option>
            {REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </label>

        <label className="mistake__field mistake__field--wide">
          <span className="mistake__label">筆記</span>
          <input
            type="text"
            value={mistake.noteZh ?? ''}
            placeholder="給自己的提醒"
            onChange={(event) => onSetNote(event.target.value)}
          />
        </label>
      </div>

      <div className="mistake__actions">
        {question && (
          <Link to={`/week/${mistake.week}`} className="linkbutton">
            回到第 {mistake.week} 週
          </Link>
        )}
        {mistake.resolved && (
          <button type="button" className="linkbutton" onClick={onReset}>
            重新放回複習清單
          </button>
        )}
      </div>
    </section>
  );
}
