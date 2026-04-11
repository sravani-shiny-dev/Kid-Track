import React from 'react';
import '../styles/dashboard.css';

/**
 * Dashboard Page
 * KidTrack dashboard starter UI
 */
function Dashboard() {
  const navItems = ['Overview', 'Activities', 'Screen Time', 'Homework', 'Events'];
  const metrics = [
    { label: 'Active Minutes', value: '248', delta: '+12%' },
    { label: 'Tasks Completed', value: '18', delta: '+8%' },
    { label: 'Alerts', value: '3', delta: '-2' },
    { label: 'Weekly Score', value: '91%', delta: '+4%' }
  ];

  const timeline = [
    { time: '08:10 AM', title: 'Math Homework Submitted', detail: 'Aarav uploaded 2 worksheets' },
    { time: '11:30 AM', title: 'Screen Break Triggered', detail: 'Maya reached 45 min limit' },
    { time: '02:00 PM', title: 'Reading Session', detail: 'Kabir completed chapter 7 quiz' },
    { time: '04:20 PM', title: 'New Event Added', detail: 'Science fair on April 3' }
  ];

  const children = [
    { name: 'Aarav', className: 'Grade 4', focus: 87, homework: '2 Pending' },
    { name: 'Maya', className: 'Grade 2', focus: 72, homework: '1 Pending' },
    { name: 'Kabir', className: 'Grade 5', focus: 93, homework: 'All Done' }
  ];

  const weeklyBars = [48, 74, 62, 80, 67, 90, 58];

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="brand">
          <span className="brand-mark">KT</span>
          <div>
            <h1>KidTrack</h1>
            <p>Parent Dashboard</p>
          </div>
        </div>

        <nav className="side-nav">
          {navItems.map((item, idx) => (
            <button
              key={item}
              type="button"
              className={`side-nav-item ${idx === 0 ? 'active' : ''}`}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="kicker">Welcome back</p>
            <h2>Family Progress Overview</h2>
          </div>
          <button type="button" className="primary-btn">
            Add Activity
          </button>
        </header>

        <section className="metric-grid">
          {metrics.map((metric) => (
            <article key={metric.label} className="metric-card">
              <p>{metric.label}</p>
              <h3>{metric.value}</h3>
              <span>{metric.delta} vs last week</span>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <article className="panel chart-panel">
            <div className="panel-head">
              <h3>Weekly Activity</h3>
              <p>Minutes engaged per day</p>
            </div>
            <div className="bar-chart">
              {weeklyBars.map((value, idx) => (
                <div key={idx} className="bar-col">
                  <div className="bar-fill" style={{ height: `${value}%` }} />
                </div>
              ))}
            </div>
          </article>

          <article className="panel timeline-panel">
            <div className="panel-head">
              <h3>Live Timeline</h3>
              <p>Today&apos;s updates</p>
            </div>
            <ul className="timeline-list">
              {timeline.map((entry) => (
                <li key={entry.title}>
                  <p className="time">{entry.time}</p>
                  <div>
                    <h4>{entry.title}</h4>
                    <p>{entry.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel children-panel">
            <div className="panel-head">
              <h3>Children Snapshot</h3>
              <p>Focus and homework status</p>
            </div>
            <div className="child-list">
              {children.map((child) => (
                <div key={child.name} className="child-card">
                  <div className="avatar">{child.name[0]}</div>
                  <div>
                    <h4>{child.name}</h4>
                    <p>{child.className}</p>
                  </div>
                  <div className="chip">{child.focus}% Focus</div>
                  <div className="chip chip-muted">{child.homework}</div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
