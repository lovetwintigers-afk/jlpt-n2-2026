import { NavLink, Link } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';
import { useToday } from '@/state/TodayProvider';
import { getDaysUntilExam } from '@/lib/date/courseCalendar';

export function TopBar() {
  const { today } = useToday();
  const daysLeft = getDaysUntilExam(today);

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link to="/" className="topbar__brand">
          JLPT N2 · 2026
        </Link>

        <nav aria-label="主要導覽">
          <ul className="topbar__nav">
            {NAV_ITEMS.filter((item) => item.desktop).map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === '/'} className="topbar__link">
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <span className="topbar__spacer" />

        <span className="topbar__countdown">
          {daysLeft > 0
            ? `距考試 ${daysLeft} 天`
            : daysLeft === 0
              ? '考試當天'
              : '考試已結束'}
        </span>
      </div>
    </header>
  );
}
