import { Link } from 'react-router-dom';
import {
  COURSE_START,
  EXAM_DATE,
  daysBetween,
  formatDateWithWeekday,
  getDaysUntilExam,
  type IsoDate,
} from '@/lib/date/courseCalendar';
import { WEEK_OUTLINES, STAGE_LABELS } from '@/lib/course/outline';

/** 2026-08-09 之前顯示的準備頁 */
export function BeforeStart({ today }: { today: IsoDate }) {
  const daysToStart = daysBetween(today, COURSE_START);
  const daysToExam = getDaysUntilExam(today);

  const stages = Array.from(new Set(WEEK_OUTLINES.map((w) => w.stage)));

  return (
    <>
      <section className="dash__hero" aria-label="目前狀態">
        <p className="dash__date">今天是 {formatDateWithWeekday(today)}</p>
        <div className="dash__countdown">
          <span className="dash__countdown-num">{daysToStart}</span>
          <span className="dash__countdown-text">天後開始十七週複習</span>
        </div>
        <p className="muted">
          複習開始於 {formatDateWithWeekday(COURSE_START)}，考試日為{' '}
          {formatDateWithWeekday(EXAM_DATE)}，距今 {daysToExam} 天。
        </p>

        <div className="dash__week">
          <p className="muted">
            現在還不需要做任何練習。開始前可以先看一次學習地圖，了解十七週會走過哪些階段。
          </p>
        </div>
      </section>

      <div className="stack">
        <section className="card">
          <h2 className="card__title">十七週路線</h2>
          <ul className="stack stack--tight" style={{ listStyle: 'none' }}>
            {stages.map((stage) => {
              const weeks = WEEK_OUTLINES.filter((w) => w.stage === stage);
              const first = weeks[0]!;
              const last = weeks[weeks.length - 1]!;
              const range =
                weeks.length === 1 ? `第 ${first.week} 週` : `第 ${first.week}–${last.week} 週`;
              return (
                <li key={stage} style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <span className="tag tag--accent" style={{ flexShrink: 0 }}>
                    {range}
                  </span>
                  <span>{STAGE_LABELS[stage]}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card">
          <h2 className="card__title">開始前的準備</h2>
          <ul className="stack stack--tight" style={{ paddingLeft: '1.25rem' }}>
            <li>把這個網站加入瀏覽器書籤，固定用同一個瀏覽器（進度存在該瀏覽器本機）。</li>
            <li>想好每天固定的 20 分鐘時段，開始日當天就照表操課。</li>
            <li>第一週是診斷測驗，不需要事先複習，照實作答才測得準。</li>
          </ul>
        </section>

        <Link to="/map" className="btn btn--primary btn--block">
          查看十七週學習地圖
        </Link>
      </div>
    </>
  );
}
