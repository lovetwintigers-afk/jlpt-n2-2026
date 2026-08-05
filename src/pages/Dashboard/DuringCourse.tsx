import { Link } from 'react-router-dom';
import {
  formatDateWithWeekday,
  formatWeekRange,
  getDaysUntilExam,
  getWeekNumber,
  getDayIndexInWeek,
  getTimeProgressRatio,
  getElapsedStudyDays,
  TOTAL_WEEKS,
  DAYS_PER_WEEK,
  type IsoDate,
} from '@/lib/date/courseCalendar';
import {
  getWeekOutline,
  getDayOutline,
  getWeekEstimatedMinutes,
  STAGE_LABELS,
  FOCUS_LABELS,
  type Skill,
} from '@/lib/course/outline';
import { ProgressBar } from '@/components/ProgressBar';
import { SkillProgressRow } from '@/components/SkillProgressRow';
import { useProgress } from '@/state/ProgressProvider';
import { getDayProgress } from '@/lib/progress/selectors';
import {
  getLatestQuizAttempt,
  getSkillProgressForWeek,
  getUnresolvedMistakeCount,
  getWeakestSkill,
  getWeeksBehind,
  getWeekProgress,
} from '@/lib/progress/selectors';
import { SKILL_LABELS } from '@/lib/course/outline';

const ALL_SKILLS: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening'];

/** 2026-08-09 至 12-05 的主畫面 */
export function DuringCourse({ today }: { today: IsoDate }) {
  const { state } = useProgress();
  const week = getWeekNumber(today)!;
  const dayIndex = getDayIndexInWeek(today)!;
  const outline = getWeekOutline(week);
  const dayOutline = getDayOutline(week, dayIndex);
  const daysLeft = getDaysUntilExam(today);

  const weekProgress = getWeekProgress(state, week);
  const skillProgress = getSkillProgressForWeek(state, week);
  const weeksBehind = getWeeksBehind(state, week);
  const mistakeCount = getUnresolvedMistakeCount(state);
  const latestAttempt = getLatestQuizAttempt(state);
  const weakestSkill = getWeakestSkill(state);

  return (
    <>
      {/* ---- 主要狀態 ---- */}
      <section className="dash__hero" aria-label="目前狀態">
        <p className="dash__date">今天是 {formatDateWithWeekday(today)}</p>

        <div className="dash__countdown">
          <span className="dash__countdown-num">{daysLeft}</span>
          <span className="dash__countdown-text">天後考試</span>
        </div>

        <ProgressBar
          value={getTimeProgressRatio(today)}
          label="備考時間進度"
          valueText={`第 ${getElapsedStudyDays(today)} / ${TOTAL_WEEKS * DAYS_PER_WEEK} 天`}
        />

        <div className="dash__week">
          <span className="dash__week-num">第 {week} 週</span>
          {outline && <span className="tag tag--accent">{STAGE_LABELS[outline.stage]}</span>}
          <span className="dash__week-range">{formatWeekRange(week)}</span>
        </div>
        {outline && <p className="dash__week-title">{outline.title}</p>}
      </section>

      <div className="stack">
        {/* ---- 今日建議任務 ---- */}
        <section className="card">
          <h2 className="card__title">今日建議任務</h2>
          {dayOutline ? (
            <div className="dash__today">
              <div className="dash__today-info">
                <p className="dash__today-title">
                  Day {dayIndex}　{dayOutline.title}
                </p>
                <p className="muted">
                  {FOCUS_LABELS[dayOutline.focus]}
                  {dayOutline.estimatedMinutes > 0 && ` · 約 ${dayOutline.estimatedMinutes} 分鐘`}
                </p>
                {dayOutline.timeWarning && (
                  <p className="dayrow__warning">{dayOutline.timeWarning}</p>
                )}
              </div>
              <Link to={`/week/${week}/day/${dayIndex}`} className="btn btn--primary">
                繼續學習
              </Link>
            </div>
          ) : (
            <p className="empty-state">本週課表尚未建立。</p>
          )}
        </section>

        {/* ---- 落後提示。措辭中性，不指責。 ---- */}
        {weeksBehind.length > 0 && (
          <section className="notice notice--highlight">
            {weeksBehind.map((entry) => (
              <span key={entry.week}>
                第 {entry.week} 週還有 {entry.remaining} 項可以補做（
                <Link to={`/week/${entry.week}`}>前往</Link>）。{' '}
              </span>
            ))}
          </section>
        )}

        {/* ---- 本週完成率 ---- */}
        <div className="grid grid--2">
          <section className="card">
            <h2 className="card__title">本週完成率</h2>
            <ProgressBar
              value={weekProgress.rate}
              variant="success"
              label={`第 ${week} 週`}
              valueText={
                weekProgress.total === 0
                  ? '尚無任務'
                  : `${weekProgress.done} / ${weekProgress.total} 項`
              }
            />
            <p className="stat__hint" style={{ marginTop: 'var(--space-3)' }}>
              本週建議總時間 {getWeekEstimatedMinutes(week)} 分鐘（不含彈性日）
              {weekProgress.daysWithoutContent > 0 &&
                `／有 ${weekProgress.daysWithoutContent} 天尚未加入內容`}
            </p>
          </section>

          <section className="card">
            <h2 className="card__title">四項能力完成狀況</h2>
            <div className="stack stack--tight">
              {ALL_SKILLS.map((skill) => (
                <SkillProgressRow
                  key={skill}
                  skill={skill}
                  value={skillProgress[skill].rate}
                  valueText={
                    skillProgress[skill].total === 0
                      ? '本週無'
                      : `${skillProgress[skill].done} / ${skillProgress[skill].total}`
                  }
                />
              ))}
            </div>
          </section>
        </div>

        {/* ---- 統計 ---- */}
        <div className="grid grid--3">
          <section className="card">
            <p className="stat__label">未消化錯題</p>
            <p className="stat__value">
              {mistakeCount}
              <span className="stat__unit">題</span>
            </p>
            <p className="stat__hint">
              {mistakeCount === 0 ? '尚未開始記錄' : <Link to="/mistakes">查看錯題本</Link>}
            </p>
          </section>

          <section className="card">
            <p className="stat__label">最近一次測驗</p>
            <p className="stat__value">
              {latestAttempt
                ? `${Math.round((latestAttempt.correctCount / Math.max(latestAttempt.totalCount, 1)) * 100)}%`
                : '—'}
            </p>
            <p className="stat__hint">
              {latestAttempt
                ? `${latestAttempt.correctCount} / ${latestAttempt.totalCount} 題`
                : '尚未有測驗紀錄'}
            </p>
          </section>

          <section className="card">
            <p className="stat__label">最弱能力</p>
            <p className="stat__value" lang={weakestSkill ? 'ja' : undefined}>
              {weakestSkill ? SKILL_LABELS[weakestSkill] : '—'}
            </p>
            <p className="stat__hint">
              {weakestSkill ? '依累積作答正確率' : '作答滿 5 題後顯示'}
            </p>
          </section>
        </div>

        {/* ---- 本週七天 ---- */}
        {outline && (
          <section className="card">
            <h2 className="card__title">本週七天</h2>
            <ul className="daylist">
              {outline.days.map((day) => {
                const progress = getDayProgress(state, week, day.dayIndex);
                return (
                  <li key={day.dayIndex}>
                    <Link
                      to={`/week/${week}/day/${day.dayIndex}`}
                      className={`dayrow${day.dayIndex === dayIndex ? ' dayrow--today' : ''}`}
                      aria-current={day.dayIndex === dayIndex ? 'date' : undefined}
                    >
                      <span
                        className={`dayrow__marker${progress.complete ? ' dayrow__marker--done' : ''}`}
                      >
                        {progress.complete ? '✓' : day.dayIndex}
                      </span>
                      <span className="dayrow__body">
                        <span className="dayrow__title">{day.title}</span>
                        <span className="dayrow__meta">
                          {' '}
                          {day.estimatedMinutes > 0 ? `約 ${day.estimatedMinutes} 分` : '彈性'}
                          {progress.total > 0 && ` · ${progress.done} / ${progress.total} 項`}
                        </span>
                      </span>
                      {day.dayIndex === dayIndex && <span className="tag tag--accent">今天</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <Link to={`/week/${week}`} className="btn btn--secondary btn--block">
          查看第 {week} 週完整內容
        </Link>
      </div>
    </>
  );
}
