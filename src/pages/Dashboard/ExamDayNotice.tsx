import { Link } from 'react-router-dom';

/**
 * 2026-12-06 當天的首頁。
 * 刻意極簡：不顯示測驗入口、不推薦新內容、不顯示落後提示。
 */
export function ExamDayNotice() {
  return (
    <>
      <section className="dash__hero" aria-label="目前狀態">
        <p className="dash__date">2026年12月6日（日）</p>
        <div className="dash__countdown">
          <span className="dash__countdown-text" style={{ fontSize: 'var(--text-2xl)' }}>
            今天是考試日
          </span>
        </div>
        <p className="muted">十七週的準備到此為止。照平常的節奏就好。</p>
      </section>

      <div className="stack">
        <section className="notice notice--accent">
          出門前確認：准考證、身分證件、HB 鉛筆、橡皮擦、手錶（無聲、非智慧型）。
        </section>

        <Link to="/exam-day" className="btn btn--primary btn--block">
          開啟考試當日頁面
        </Link>
      </div>
    </>
  );
}
