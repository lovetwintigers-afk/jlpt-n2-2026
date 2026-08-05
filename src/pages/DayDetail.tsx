import { Link, useParams, Navigate } from 'react-router-dom';
import { useToday } from '@/state/TodayProvider';
import {
  formatDateWithWeekday,
  getDateForWeekDay,
  getWeekNumber,
  getDayIndexInWeek,
  TOTAL_WEEKS,
  type DayIndex,
} from '@/lib/date/courseCalendar';
import { getWeekOutline, getDayOutline, FOCUS_LABELS } from '@/lib/course/outline';
import { getDayItems } from '@/lib/content/queries';
import { TaskItemView } from '@/components/TaskItemView';
import { ProgressBar } from '@/components/ProgressBar';
import { useProgress } from '@/state/ProgressProvider';
import { getDayProgress } from '@/lib/progress/selectors';

/** 每日任務頁。同樣是一個元件服務 17 週 × 7 天。 */
export function DayDetail() {
  const { week: weekParam, day: dayParam } = useParams();
  const { today } = useToday();
  const { state } = useProgress();

  const week = Number(weekParam);
  const dayIndex = Number(dayParam) as DayIndex;

  const validWeek = Number.isInteger(week) && week >= 1 && week <= TOTAL_WEEKS;
  const validDay = Number.isInteger(dayIndex) && dayIndex >= 1 && dayIndex <= 7;
  if (!validWeek || !validDay) {
    return <Navigate to="/map" replace />;
  }

  const outline = getWeekOutline(week);
  const day = getDayOutline(week, dayIndex);
  const items = getDayItems(week, dayIndex);
  const dayProgress = getDayProgress(state, week, dayIndex);
  const date = getDateForWeekDay(week, dayIndex);
  const isToday = getWeekNumber(today) === week && getDayIndexInWeek(today) === dayIndex;

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">
          <Link to="/map">學習地圖</Link> ／{' '}
          <Link to={`/week/${week}`}>第 {week} 週</Link> ／ Day {dayIndex}
        </p>
        <h1 className="page-header__title">{day?.title ?? `Day ${dayIndex}`}</h1>
        <p className="page-header__desc">
          {formatDateWithWeekday(date)}
          {day && ` · ${FOCUS_LABELS[day.focus]}`}
          {day && day.estimatedMinutes > 0 && ` · 約 ${day.estimatedMinutes} 分鐘`}
          {isToday && <span className="tag tag--accent" style={{ marginLeft: 'var(--space-2)' }}>今天</span>}
        </p>
      </div>

      {!outline || !day ? (
        <p className="notice">這一天的課表尚未建立。</p>
      ) : (
        <div className="stack">
          {day.timeWarning && <p className="notice notice--highlight">{day.timeWarning}</p>}

          {items.length > 0 && (
            <ProgressBar
              value={dayProgress.total === 0 ? 0 : dayProgress.done / dayProgress.total}
              variant="success"
              label="本日進度"
              valueText={`${dayProgress.done} / ${dayProgress.total} 項`}
            />
          )}

          {items.length === 0 ? (
            <section className="card">
              <h2 className="card__title">本日任務</h2>
              <p className="empty-state">
                {day.focus === 'flex'
                  ? '今天是彈性日，沒有固定任務。可以補做前幾天未完成的項目，或重做錯題；不需要補做時就休息。'
                  : `這一天的學習內容尚未加入。在 content/weeks/week-${String(week).padStart(2, '0')}.json 補上第 ${dayIndex} 天的 items 即可顯示。`}
              </p>
            </section>
          ) : (
            items.map((item, i) => (
              <TaskItemView key={i} item={item} week={week} dayIndex={dayIndex} />
            ))
          )}

          <nav className="grid grid--2" aria-label="日期切換">
            {dayIndex > 1 ? (
              <Link to={`/week/${week}/day/${dayIndex - 1}`} className="btn btn--secondary btn--block">
                ← Day {dayIndex - 1}
              </Link>
            ) : week > 1 ? (
              <Link to={`/week/${week - 1}/day/7`} className="btn btn--secondary btn--block">
                ← 第 {week - 1} 週 Day 7
              </Link>
            ) : (
              <span />
            )}
            {dayIndex < 7 ? (
              <Link to={`/week/${week}/day/${dayIndex + 1}`} className="btn btn--secondary btn--block">
                Day {dayIndex + 1} →
              </Link>
            ) : week < TOTAL_WEEKS ? (
              <Link to={`/week/${week + 1}/day/1`} className="btn btn--secondary btn--block">
                第 {week + 1} 週 Day 1 →
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
