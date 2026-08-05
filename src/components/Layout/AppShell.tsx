import { Outlet, Link } from 'react-router-dom';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { useToday } from '@/state/TodayProvider';
import { formatDateWithWeekday } from '@/lib/date/courseCalendar';

export function AppShell() {
  const { isPreview, today } = useToday();

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        跳至主要內容
      </a>

      {isPreview && (
        <div className="datebar">
          預覽模式：目前以 {formatDateWithWeekday(today)} 顯示畫面
          <Link to="/">回到今天</Link>
        </div>
      )}

      <TopBar />

      <main id="main" className="shell__main" tabIndex={-1}>
        <Outlet />
      </main>

      <MobileNav />
    </div>
  );
}
