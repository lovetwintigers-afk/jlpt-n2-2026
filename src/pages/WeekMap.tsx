import { Link } from 'react-router-dom';
import { useToday } from '@/state/TodayProvider';
import {
  formatWeekRange,
  getWeekNumber,
  getDayIndexInWeek,
  getWeekRange,
  daysBetween,
  type WeekNumber,
} from '@/lib/date/courseCalendar';
import { WEEK_OUTLINES, STAGE_LABELS, type Stage } from '@/lib/course/outline';
import { getWeekReadiness, type ContentReadiness } from '@/lib/content/queries';
import { useProgress } from '@/state/ProgressProvider';
import { getWeekProgress } from '@/lib/progress/selectors';
import { ProgressBar } from '@/components/ProgressBar';

const READINESS_LABEL: Record<ContentReadiness, string> = {
  ready: '內容已備妥',
  partial: '內容部分備妥',
  empty: '內容尚未建立',
};

type WeekStatus = 'past' | 'current' | 'future';

function getWeekStatus(week: WeekNumber, today: string): WeekStatus {
  const { start, end } = getWeekRange(week);
  if (daysBetween(today, start) > 0) return 'future';
  if (daysBetween(end, today) > 0) return 'past';
  return 'current';
}

export function WeekMap() {
  const { today } = useToday();
  const { state } = useProgress();
  const currentWeek = getWeekNumber(today);
  const currentDay = getDayIndexInWeek(today);

  const stages = Array.from(new Set(WEEK_OUTLINES.map((w) => w.stage))) as Stage[];

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">2026-08-09 → 2026-12-05</p>
        <h1 className="page-header__title">十七週學習地圖</h1>
        <p className="page-header__desc">
          每一週都可以隨時進入。落後時直接點進先前的週次補做，內容不會被鎖住。
        </p>
      </div>

      <div className="weekmap">
        {stages.map((stage) => {
          const weeks = WEEK_OUTLINES.filter((w) => w.stage === stage);
          const first = weeks[0]!;
          const last = weeks[weeks.length - 1]!;
          return (
            <section key={stage}>
              <div className="weekmap__stage-title">
                <h2 className="weekmap__stage-name">{STAGE_LABELS[stage]}</h2>
                <span className="weekmap__stage-range">
                  {weeks.length === 1
                    ? `第 ${first.week} 週`
                    : `第 ${first.week}–${last.week} 週`}
                </span>
              </div>

              <div className="weekmap__grid">
                {weeks.map((outline) => {
                  const status = getWeekStatus(outline.week, today);
                  return (
                    <Link
                      key={outline.week}
                      to={`/week/${outline.week}`}
                      className={`weekcard weekcard--${status}`}
                      aria-current={status === 'current' ? 'true' : undefined}
                    >
                      <div className="weekcard__head">
                        <span className="weekcard__num">第 {outline.week} 週</span>
                        {status === 'current' && <span className="tag tag--accent">本週</span>}
                        {status === 'past' && <span className="tag">已過</span>}
                      </div>

                      <p className="weekcard__title">{outline.title}</p>
                      <p className="weekcard__range">{formatWeekRange(outline.week)}</p>

                      {(() => {
                        const readiness = getWeekReadiness(outline.week);
                        const progress = getWeekProgress(state, outline.week);
                        if (progress.total === 0) {
                          return (
                            <p className={`readiness readiness--${readiness}`}>
                              <span className="readiness__dot" aria-hidden="true" />
                              {READINESS_LABEL[readiness]}
                            </p>
                          );
                        }
                        return (
                          <div style={{ marginTop: 'var(--space-2)' }}>
                            <ProgressBar
                              value={progress.rate}
                              variant="success"
                              size="sm"
                              label={progress.complete ? '已完成' : '完成率'}
                              valueText={`${progress.done} / ${progress.total}`}
                            />
                          </div>
                        );
                      })()}

                      <div
                        className="weekcard__days"
                        aria-label={`本週七天，${outline.days.filter((d) => d.countsTowardCompletion).length} 天計入完成率`}
                      >
                        {outline.days.map((day) => {
                          const isToday =
                            status === 'current' && currentDay === day.dayIndex;
                          const classes = [
                            'weekcard__day',
                            !day.countsTowardCompletion ? 'weekcard__day--flex' : '',
                            isToday ? 'weekcard__day--today' : '',
                          ]
                            .filter(Boolean)
                            .join(' ');
                          return <span key={day.dayIndex} className={classes} />;
                        })}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {currentWeek === null && (
        <p className="notice" style={{ marginTop: 'var(--space-6)' }}>
          目前不在 2026-08-09 至 12-05 的複習期間內，因此沒有標示「本週」。
        </p>
      )}
    </>
  );
}
