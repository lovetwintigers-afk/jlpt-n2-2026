import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

export function MobileNav() {
  return (
    <nav className="mobilenav" aria-label="主要導覽（手機）">
      {NAV_ITEMS.filter((item) => item.mobile).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className="mobilenav__link"
        >
          <span className="mobilenav__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span>{item.shortLabel ?? item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
