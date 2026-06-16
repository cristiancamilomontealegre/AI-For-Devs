import { NavLink, Outlet } from 'react-router-dom';
import './app-layout.css';

export function AppLayout() {
  return (
    <div className="app-layout">
      <header className="app-layout__header">
        <div className="app-layout__brand">
          <span className="app-layout__logo">📦</span>
          <span className="app-layout__title">Inventory</span>
        </div>
        <nav className="app-layout__nav" aria-label="Main navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `app-layout__link${isActive ? ' app-layout__link--active' : ''}`
            }
          >
            Products
          </NavLink>
          <NavLink
            to="/products/new"
            className={({ isActive }) =>
              `app-layout__link${isActive ? ' app-layout__link--active' : ''}`
            }
          >
            New Product
          </NavLink>
          <NavLink
            to="/movements"
            end
            className={({ isActive }) =>
              `app-layout__link${isActive ? ' app-layout__link--active' : ''}`
            }
          >
            Movements
          </NavLink>          <NavLink
            to="/movements/new"
            className={({ isActive }) =>
              `app-layout__link${isActive ? ' app-layout__link--active' : ''}`
            }
          >
            New Movement
          </NavLink>
        </nav>
      </header>
      <main className="app-layout__main">
        <Outlet />
      </main>
    </div>
  );
}
