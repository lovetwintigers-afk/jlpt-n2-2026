import { Link, useParams, Navigate } from 'react-router-dom';
import { useToday } from '@/state/TodayProvider';
import {
  formatWeekRange,
  formatDateWithWeekday,
  getWeekRange,
  getDateForWeekDay,
  getWeekNumber,
  getDayIndexInWeek,
  TOTAL_WEEKS,
} from '@/lib/date/courseCalendar';
import {
  getWeekOutline,
  getWeekEstimatedMinutes,
  getCountedDayCount,
  STAGE_LABELS,
  FOCUS_LABELS,
} from '@/lib/course/outline';
import { ProgressBar } from '@/components/ProgressBar';
import { useProgress } from '@/state/ProgressProvider';
import { getDayProgress, getWeekProgress } from '@/lib/progress/selectors';

/**
 * 每週學習頁。17 週共用這一個元件 —— 內容全部來自 outline / content 資料，
 * 不會為每一週寫一個獨立頁面。
 */
export function WeekDetail() {
  const { week: weekParam } = useParams();
  const { today } = useToday();
  const { state } = useProgress();

  const week = Number(weekParam);
  if (!Number.isInteger(week) || week < 1 || week > TOTAL_WEEKS) {
    return <Navigate to="/map" replace />;
  }

  const outline = getWeekOutline(week);
  const weekProgress = getWeekProgress(state, week);
  const { start, end } = getWeekRange(week);
  const isCurrentWeek = getWeekNumber(today) === week;
  const currentDay = isCurrentWeek ? getDayIndexInWeek(today) : null;

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">
          <Link to="/map">十七週學習地圖</Link> ／ {formatWeekRange(week)}
        </p>
        <h1 className="page-header__title">
          第 {week} 週　{outline?.title ?? '（尚未建立）'}
        </h1>
        <p className="page-header__desc">
          {outline && <span className="tag tag--accent">{STAGE_LABELS[outline.stage]}</span>}{' '}
          {formatDateWithWeekday(start)} 至 {formatDateWithWeekday(end)}
        </p>
      </div>

      {!outline ? (
        <p className="notice">這一週的課表尚未建立。</p>
      ) : (
        <div className="stack">
          <section className="card">
            <h2 className="card__title">本週學習目標</h2>
            <ul className="stack stack--tight" style={{ paddingLeft: '1.25rem' }}>
              {outline.goals.map((goal, i) => (
                <li key={i}>{goal}</li>
              ))}
            </ul>
          </section>

          <div className="grid grid--2">
            <section className="card">
              <h2 className="card__title">本週完成率</h2>
              <ProgressBar
                value={weekProgress.rate}
                variant="success"
                valueText={
                  weekProgress.total === 0
                    ? '尚無任務'
                    : `${weekProgress.done} / ${weekProgress.total} 項`
                }
              />
              <p className="stat__hint" style={{ marginTop: 'var(--space-3)' }}>
                完成條件：{getCountedDayCount(week)} 個任務日全部完成
                {weekProgress.complete && ' · 本週已完成'}
              </p>
            </section>

            <section className="card">
              <p className="stat__label">本週建議總時間</p>
              <p className="stat__value">
                {getWeekEstimatedMinutes(week)}
                <span className="stat__unit">分鐘</span>
              </p>
              <p className="stat__hint">不含彈性日</p>
            </section>
          </div>

          <section className="card">
            <h2 className="card__title">本週七天</h2>
            <ul className="daylist">
              {outline.days.map((day) => {
                const date = getDateForWeekDay(week, day.dayIndex);
                const isToday = currentDay === day.dayIndex;
                const progress = getDayProgress(state, week, day.dayIndex);
                return (
                  <li key={day.dayIndex}>
                    <Link
                      to={`/week/${week}/day/${day.dayIndex}`}
                      className={`dayrow${isToday ? ' dayrow--today' : ''}`}
                      aria-current={isToday ? 'date' : undefined}
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
                          {formatDateWithWeekday(date)} ·{' '}
                          {FOCUS_LABELS[day.focus]}
                          {day.estimatedMinutes > 0 && ` · 約 ${day.estimatedMinutes} 分`}
                          {progress.total > 0 && ` · ${progress.done} / ${progress.total} 項`}
                          {!day.countsTowardCompletion && ' · 不計入完成率'}
                        </span>
                        {day.timeWarning && (
                          <span className="dayrow__warning">{day.timeWarning}</span>
                        )}
                      </span>
                      {isToday && <span className="tag tag--accent">今天</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <nav className="grid grid--2" aria-label="週次切換">
            {week > 1 ? (
              <Link to={`/week/${week - 1}`} className="btn btn--secondary btn--block">
                ← 第 {week - 1} 週
              </Link>
            ) : (
              <span />
            )}
            {week < TOTAL_WEEKS ? (
              <Link to={`/week/${week + 1}`} className="btn btn--secondary btn--block">
                第 {week + 1} 週 →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>
      )}
    </>
  );
}
