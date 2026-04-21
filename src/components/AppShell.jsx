import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NotifBell from './NotifBell';

function AppShell({
  roleLabel,
  title,
  subtitle,
  navItems,
  activeNavIndex: controlledActiveNavIndex,
  onNavChange,
  summary,
  topbarMeta = [],
  actionSlot = null,
  showNotificationButton = true,
  children
}) {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);
  const [internalActiveNavIndex, setInternalActiveNavIndex] = useState(0);
  const activeNavIndex = Number.isInteger(controlledActiveNavIndex)
    ? controlledActiveNavIndex
    : internalActiveNavIndex;

  const closeSidebar = () => setSidebarOpen(false);
  const normalizedNavItems = navItems.map((item) => (typeof item === 'string' ? { label: item } : item));
  const hasSummary = summary?.title || summary?.body || summary?.highlights?.length;

  useEffect(() => {
    const onResize = () => {
      const shouldCollapse = window.innerWidth < 768;
      setCollapsed(shouldCollapse);
      if (!shouldCollapse) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className={`role-page role-${roleLabel.toLowerCase()}`}>
      <div
        className={`shell-backdrop ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden={!sidebarOpen}
      />

      <aside className={`role-sidebar ${sidebarOpen ? 'open' : ''} ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="sidebar-scroll">
          <div className="sidebar-head">
            <div className="brand">
              <span className="brand-mark">KT</span>
              <div>
                <h1>KidTrack</h1>
                <p>{roleLabel}</p>
              </div>
            </div>
            <button
              type="button"
              className="sidebar-close"
              onClick={closeSidebar}
              aria-label="Close navigation"
            >
              Close
            </button>
            <button
              type="button"
              className="sidebar-collapse-toggle"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              {collapsed ? '>' : '<'}
            </button>
          </div>

          <nav className="side-nav" aria-label={`${roleLabel} sections`}>
            {normalizedNavItems.map((item, index) => (
              <button
                key={item.label}
                type="button"
                className={`side-nav-item ${index === activeNavIndex ? 'active' : ''}`}
                aria-current={index === activeNavIndex ? 'page' : undefined}
                onClick={() => {
                  if (onNavChange) {
                    onNavChange(index);
                  } else {
                    setInternalActiveNavIndex(index);
                  }
                  closeSidebar();
                }}
              >
                <span className="side-nav-index">0{index + 1}</span>
                <span className="side-nav-copy">
                  <strong>{item.label}</strong>
                  {item.meta ? <small>{item.meta}</small> : null}
                </span>
                {item.comingSoon ? <span className="coming-soon-badge nav-badge">Soon</span> : null}
              </button>
            ))}
          </nav>

          {hasSummary ? (
            <div className="sidebar-summary">
              <p className="eyebrow">At a glance</p>
              {summary?.title ? <h3>{summary.title}</h3> : null}
              {summary?.body ? <p>{summary.body}</p> : null}
              {summary?.highlights?.length ? (
                <div className="sidebar-summary-list">
                  {summary.highlights.map((highlight) => (
                    <span key={highlight}>{highlight}</span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>

      <main className="role-main">
        <header className="topbar">
          <div className="topbar-title">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              Menu
            </button>
            <p className="eyebrow">{roleLabel}</p>
            <h2>{title}</h2>
            {subtitle ? <p className="topbar-copy">{subtitle}</p> : null}
          </div>

          <div className="topbar-actions">
            {actionSlot}
            {showNotificationButton ? <NotifBell /> : null}
            <button type="button" className="ghost-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        {topbarMeta.length ? (
          <section className="topbar-meta" aria-label={`${roleLabel} highlights`}>
            {topbarMeta.map((item) => (
              <article key={item.label} className="topbar-meta-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                {item.helper ? <small>{item.helper}</small> : null}
              </article>
            ))}
          </section>
        ) : null}

        {children}

        <footer className="app-footer" aria-label="Coming soon feature notice">
          <div className="coming-soon-banner">
            <strong>Coming Soon:</strong> Live Video Calling &amp; Screen Monitoring
          </div>
        </footer>
      </main>
    </div>
  );
}

export default AppShell;
