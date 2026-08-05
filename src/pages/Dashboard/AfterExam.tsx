import { Link } from 'react-router-dom';
import {
  EXAM_DATE,
  daysBetween,
  formatDateWithWeekday,
  TOTAL_WEEKS,
  type IsoDate,
} from '@/lib/date/courseCalendar';

/** 2026-12-07 之後的完成摘要頁 */
export function AfterExam({ today }: { today: IsoDate }) {
  const daysSince = daysBetween(EXAM_DATE, today);

  return (
    <>
      <section className="dash__hero" aria-label="目前狀態">
        <p className="dash__date">今天是 {formatDateWithWeekday(today)}</p>
        <div className="dash__countdown">
          <span className="dash__countdown-text" style={{ fontSize: 'var(--text-2xl)' }}>
            備考完成
          </span>
        </div>
        <p className="muted">
          考試於 {formatDateWithWeekday(EXAM_DATE)} 結束，距今 {daysSince} 天。
          十七週的學習紀錄都保留在這裡。
        </p>
      </section>

      <div className="stack">
        <div className="grid grid--3">
          <section className="card">
            <p className="stat__label">完成週數</p>
            <p className="stat__value">
              —<span className="stat__unit">/ {TOTAL_WEEKS} 週</span>
            </p>
          </section>
          <section className="card">
            <p className="stat__label">累積作答</p>
            <p className="stat__value">
              —<span className="stat__unit">題</span>
            </p>
          </section>
          <section className="card">
            <p className="stat__label">模擬考次數</p>
            <p className="stat__value">
              —<span className="stat__unit">次</span>
            </p>
          </section>
        </div>

        <section className="notice">
          進度紀錄仍存在這個瀏覽器中。建議到設定頁匯出一份備份，避免瀏覽器清除資料時遺失。
        </section>

        <div className="grid grid--2">
          <Link to="/progress" className="btn btn--secondary btn--block">
            查看完整學習紀錄
          </Link>
          <Link to="/settings" className="btn btn--secondary btn--block">
            匯出備份
          </Link>
        </div>
      </div>
    </>
  );
}
