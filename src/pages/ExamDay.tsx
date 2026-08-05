import { Link } from 'react-router-dom';
import { useToday } from '@/state/TodayProvider';
import { getPhase, EXAM_DATE, formatDateWithWeekday } from '@/lib/date/courseCalendar';

const CHECKLIST = [
  '准考證',
  '身分證件',
  'HB 或 2B 鉛筆、橡皮擦',
  '手錶（無聲、非智慧型）',
  '外套（試場冷氣）',
  '飲水與少量點心',
];

const TIME_PLAN = [
  { section: '言語知識（文字・語彙・文法）・讀解', minutes: 105 },
  { section: '聽解', minutes: 50 },
];

/**
 * 考試當日頁面。
 * 原則：文字短、不加壓、無測驗入口、不推薦新內容。
 */
export function ExamDay() {
  const { today } = useToday();
  const isExamDay = getPhase(today) === 'exam-day';

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">{formatDateWithWeekday(EXAM_DATE)}</p>
        <h1 className="page-header__title">考試當日</h1>
      </div>

      {!isExamDay && (
        <p className="notice" style={{ marginBottom: 'var(--space-5)' }}>
          今天不是考試日。這是考試當日頁面的預覽。
        </p>
      )}

      <div className="stack">
        <section className="notice notice--accent">
          十七週已經走完了。今天不需要再讀新東西，照平常的節奏就好。
        </section>

        <section className="card">
          <h2 className="card__title">帶齊了嗎</h2>
          <ul className="stack stack--tight" style={{ paddingLeft: '1.25rem' }}>
            {CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="card__title">時間分配</h2>
          <ul className="stack stack--tight" style={{ listStyle: 'none' }}>
            {TIME_PLAN.map((row) => (
              <li
                key={row.section}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}
              >
                <span>{row.section}</span>
                <span className="muted" style={{ whiteSpace: 'nowrap' }}>
                  {row.minutes} 分
                </span>
              </li>
            ))}
          </ul>
          <p className="stat__hint" style={{ marginTop: 'var(--space-3)' }}>
            讀解遇到卡住的題目先跳過，最後再回來。聽解只播一次，先看選項再聽。
          </p>
        </section>

        <section className="card">
          <h2 className="card__title">出門前</h2>
          <p>提早出門，預留找試場的時間。到了以後先確認座位與洗手間位置。</p>
        </section>

        <p className="muted" style={{ textAlign: 'center' }}>
          <Link to="/">回到首頁</Link>
        </p>
      </div>
    </>
  );
}
