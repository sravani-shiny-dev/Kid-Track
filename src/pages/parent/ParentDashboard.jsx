import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { useChild } from '../../context/ChildContext';
import { useAuth } from '../../context/AuthContext';
import dashboardService from '../../services/dashboard';
import notificationsService from '../../services/notifications';
import meetingsService from '../../services/meetings';
import connectionsService from '../../services/connections';
import usersService, { normalizeUserProfile } from '../../services/users';

function ParentDashboard() {
  const { user } = useAuth();
  const { activeChild, setActiveChild, childrenList } = useChild();
  const [summary, setSummary] = useState(null);
  const [performanceDays, setPerformanceDays] = useState([]);
  const [parentTasks, setParentTasks] = useState([]);
  const [parentActivity, setParentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [appointmentMeetings, setAppointmentMeetings] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [meetingForm, setMeetingForm] = useState({ title: '', requestedAt: '', detail: '' });
  const [connectionForm, setConnectionForm] = useState({ username: '', message: '' });
  const [meetingFormError, setMeetingFormError] = useState('');
  const [connectionFormError, setConnectionFormError] = useState('');
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [connectionSubmitting, setConnectionSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadDashboard = async () => {
      if (!activeChild?.id) {
        return;
      }

      try {
        const [summaryData, performanceData, tasksData, activityData] = await Promise.all([
          dashboardService.getParentSummary(activeChild.id),
          dashboardService.getParentPerformance(activeChild.id),
          dashboardService.getParentTasks(activeChild.id),
          dashboardService.getParentActivity(activeChild.id)
        ]);

        if (!ignore) {
          setSummary(summaryData);
          setPerformanceDays(performanceData);
          setParentTasks(tasksData);
          setParentActivity(activityData);
        }
      } catch (error) {
        console.error('Error loading parent dashboard:', error);
        if (!ignore) {
          setSummary(null);
          setPerformanceDays([]);
          setParentTasks([]);
          setParentActivity([]);
        }
      }
    };

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [activeChild]);

  // Subscribe to notifications
  useEffect(() => {
    const unsubscribe = notificationsService.subscribe((notifs) => {
      setNotifications(notifs);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const loadAppointments = async () => {
      try {
        const accepted = await meetingsService.getMeetingRequests('ACCEPTED');
        if (!ignore) {
          setAppointmentMeetings(Array.isArray(accepted) ? accepted : []);
        }
      } catch (error) {
        if (!ignore) {
          setAppointmentMeetings([]);
        }
      }
    };

    loadAppointments();
    connectionsService.getFriendRequests().then((data) => {
      if (!ignore) {
        setFriendRequests(Array.isArray(data) ? data : []);
      }
    }).catch(() => {
      if (!ignore) {
        setFriendRequests([]);
      }
    });
    connectionsService.getConnections().then((data) => {
      if (!ignore) {
        setConnections(Array.isArray(data) ? data : []);
      }
    }).catch(() => {
      if (!ignore) {
        setConnections([]);
      }
    });
    usersService.getProfile().then((data) => {
      if (!ignore) {
        setProfile(data || null);
      }
    }).catch(() => {
      if (!ignore) {
        setProfile(null);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  const currentChild = summary || activeChild;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const completedTasks = parentTasks.filter((t) => t.status === 'Completed').length;
  const incomingFriendRequests = friendRequests.filter((request) => !request.status || request.status === 'PENDING');
  const parentProfile = {
    ...normalizeUserProfile(profile, user),
    linkedChildId: profile?.linkedChildId || user?.linkedChildId || activeChild?.id || '',
    linkedChildName: profile?.linkedChildName || activeChild?.name || ''
  };

  const handleMeetingRequest = async (event) => {
    event.preventDefault();
    setMeetingFormError('');
    if (!activeChild?.id) {
      setMeetingFormError('Please select a child first.');
      return;
    }
    if (!meetingForm.title.trim() || !meetingForm.requestedAt) {
      setMeetingFormError('Title and date/time are required.');
      return;
    }

    setMeetingSubmitting(true);
    try {
      await meetingsService.createMeetingRequest({
        childId: activeChild.id,
        title: meetingForm.title.trim(),
        requestedAt: meetingForm.requestedAt,
        detail: meetingForm.detail.trim()
      });
      setMeetingForm({ title: '', requestedAt: '', detail: '' });
      setShowMeetingForm(false);
    } catch (error) {
      setMeetingFormError(error.response?.data?.message || 'Unable to send meeting request.');
    } finally {
      setMeetingSubmitting(false);
    }
  };

  const handleSendConnectionRequest = async (event) => {
    event.preventDefault();
    setConnectionFormError('');
    if (!connectionForm.username.trim()) {
      setConnectionFormError('Username is required.');
      return;
    }

    setConnectionSubmitting(true);
    try {
      await connectionsService.sendFriendRequest({
        receiverUsername: connectionForm.username.trim(),
        message: connectionForm.message.trim(),
        relationshipRole: 'PARENT',
        senderRoleType: user?.role || 'PARENT'
      });
      setConnectionForm({ username: '', message: '' });
      setShowConnectionForm(false);
      const latestRequests = await connectionsService.getFriendRequests();
      setFriendRequests(Array.isArray(latestRequests) ? latestRequests : []);
    } catch (error) {
      setConnectionFormError(error.response?.data?.message || 'Unable to send connection request.');
    } finally {
      setConnectionSubmitting(false);
    }
  };

  const handleFriendRequestAction = async (requestId, action) => {
    try {
      if (action === 'accept') {
        await connectionsService.acceptFriendRequest(requestId);
      } else {
        await connectionsService.declineFriendRequest(requestId);
      }
      setFriendRequests((current) => current.filter((request) => request.id !== requestId));
      const linked = await connectionsService.getConnections();
      setConnections(Array.isArray(linked) ? linked : []);
    } catch (error) {
      console.error('Unable to update friend request', error);
    }
  };

  return (
    <AppShell
      roleLabel="Parent"
      title="Parent Dashboard"
      subtitle="Stay aligned with each child's progress, spot blockers early, and keep school updates easy to understand."
      navItems={[
        { label: 'Overview', meta: 'Family snapshot' },
        { label: 'Child Detail', meta: currentChild?.name || 'Choose child' },
        { label: 'Meetings', meta: `${appointmentMeetings.length} appointments` },
        { label: 'Notifications', meta: `${unreadCount} new` },
        { label: 'Calling', meta: 'Locked', comingSoon: true }
      ]}
      summary={{
        title: currentChild ? `${currentChild.name} is the current focus` : 'Family overview',
        body: currentChild
          ? `${completedTasks}/${currentChild.assigned || 0} tasks completed. ${currentChild.submitted || 0} submission(s) awaiting review.`
          : 'Select a child to see progress and teacher updates.',
        highlights: currentChild ? ['Weekly progress trend', `${currentChild.completed} tasks done`, 'Latest teacher feedback'] : ['Select a child', 'View progress', 'Check updates']
      }}
      topbarMeta={[
        { label: 'Selected child', value: currentChild?.name || '--', helper: currentChild?.className || 'No child selected' },
        { label: 'Completion', value: `${currentChild?.completion || 0}%`, helper: 'Last 7 days' },
        { label: 'Needs review', value: `${currentChild?.submitted || 0}`, helper: 'Waiting for teacher approval' }
      ]}
      actionSlot={(
        <>
          <button type="button" className="ghost-btn" onClick={() => setShowProfile((open) => !open)}>
            {showProfile ? 'Close Profile' : 'Profile'}
          </button>
          <button type="button" className="ghost-btn" onClick={() => setShowConnectionForm((open) => !open)}>
            {showConnectionForm ? 'Close Connect Form' : 'Connect User'}
          </button>
          <button type="button" className="primary-btn" onClick={() => setShowMeetingForm((open) => !open)}>
            {showMeetingForm ? 'Close Request Form' : 'Schedule Meeting'}
          </button>
        </>
      )}
    >
      {showProfile ? (
        <section className="panel inline-form-panel">
          <div className="panel-head">
            <h3>Profile</h3>
          </div>
          <div className="stack-list">
            <div className="info-card">
              <strong>{parentProfile.name || 'N/A'}</strong>
              <span>User ID: {parentProfile.id || 'N/A'}</span>
              <small>Username: {parentProfile.username || 'N/A'}</small>
              <small>Role: {parentProfile.role || 'N/A'}</small>
              <span>{parentProfile.email || 'N/A'}</span>
              <small>Your Child Name: {parentProfile.linkedChildName || 'N/A'}</small>
              <small>Your Child ID: {parentProfile.linkedChildId || 'N/A'}</small>
              <small>Teacher Name: {parentProfile.teacherName || 'N/A'}</small>
            </div>
          </div>
        </section>
      ) : null}

      {showConnectionForm ? (
        <section className="panel inline-form-panel">
          <div className="panel-head">
            <h3>Connect by username</h3>
            <p>Enter exact username (email) to send connection request.</p>
          </div>
          <form className="inline-form-grid" onSubmit={handleSendConnectionRequest}>
            <label>
              <span>Username *</span>
              <input value={connectionForm.username} onChange={(event) => setConnectionForm((f) => ({ ...f, username: event.target.value }))} />
            </label>
            <label className="inline-form-span-two">
              <span>Message</span>
              <textarea value={connectionForm.message} onChange={(event) => setConnectionForm((f) => ({ ...f, message: event.target.value }))} rows={3} />
            </label>
            {connectionFormError ? <p className="form-error inline-form-error">{connectionFormError}</p> : null}
            <button type="submit" className="primary-btn" disabled={connectionSubmitting}>
              {connectionSubmitting ? 'Sending...' : 'Send Connection Request'}
            </button>
          </form>
        </section>
      ) : null}

      {showMeetingForm ? (
        <section className="panel inline-form-panel">
          <div className="panel-head">
            <h3>Request a meeting</h3>
          </div>
          <form className="inline-form-grid" onSubmit={handleMeetingRequest}>
            <label>
              <span>Title *</span>
              <input value={meetingForm.title} onChange={(event) => setMeetingForm((f) => ({ ...f, title: event.target.value }))} />
            </label>
            <label>
              <span>Date & time *</span>
              <input type="datetime-local" value={meetingForm.requestedAt} onChange={(event) => setMeetingForm((f) => ({ ...f, requestedAt: event.target.value }))} />
            </label>
            <label className="inline-form-span-two">
              <span>Details</span>
              <textarea value={meetingForm.detail} onChange={(event) => setMeetingForm((f) => ({ ...f, detail: event.target.value }))} rows={3} />
            </label>
            {meetingFormError ? <p className="form-error inline-form-error">{meetingFormError}</p> : null}
            <button type="submit" className="primary-btn" disabled={meetingSubmitting}>
              {meetingSubmitting ? 'Sending...' : 'Send Request to API'}
            </button>
          </form>
        </section>
      ) : null}

      <section className="page-hero page-hero-parent">
        <div className="page-hero-main">
          <p className="eyebrow">Family dashboard</p>
          <h3>
            {activeChild
              ? `${currentChild?.name || activeChild.name} is ${currentChild?.completion >= 80 ? 'making strong' : 'making'} progress.`
              : 'Choose a child to see progress highlights.'}
          </h3>
          <p>
            This dashboard shows real-time data for your child's assignments, performance, and teacher updates.
            Progress is updated as your child completes tasks and teachers provide feedback.
          </p>
          <div className="hero-badges">
            <span>{currentChild?.completed || 0} tasks done</span>
            <span>{currentChild?.assigned || 0} assigned this week</span>
            <span>{currentChild?.submitted || 0} waiting review</span>
          </div>
        </div>
        <div className="hero-aside">
          <p className="hero-card-label">Suggested next step</p>
          <strong>{currentChild ? `Check ${currentChild.name}'s latest updates below.` : 'Pick a child to continue.'}</strong>
          <p className="hero-aside-copy">
            Start with the activity feed to see the most recent changes without scanning every card.
          </p>
        </div>
      </section>

      <section className="parent-top-row">
        <article className="panel child-switcher-panel">
          <div className="panel-head">
            <h3>Select child</h3>
          </div>
          <div className="switcher-row">
            {childrenList.map((child) => (
              <button
                key={child.id}
                type="button"
                className={`switcher-chip ${activeChild?.id === child.id ? 'active' : ''}`}
                onClick={() => setActiveChild(child)}
              >
                {child.name}
              </button>
            ))}
          </div>
        </article>

        <article className="panel coming-soon-panel">
          <span className="coming-soon-badge">Coming Soon</span>
          <h3>Screen time monitoring</h3>
        </article>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <p>Selected child</p>
          <h3>{currentChild?.name || '--'}</h3>
          <span>{currentChild?.className || '--'}</span>
        </article>
        <article className="metric-card">
          <p>Completion rate</p>
          <h3>{currentChild?.completion || 0}%</h3>
          <span>Last 7 days</span>
        </article>
        <article className="metric-card">
          <p>Tasks completed</p>
          <h3>{currentChild?.completed || 0}</h3>
          <span>Out of {currentChild?.assigned || 0} assigned</span>
        </article>
        <article className="metric-card">
          <p>Waiting approval</p>
          <h3>{currentChild?.submitted || 0}</h3>
          <span>Teacher review in progress</span>
        </article>
      </section>

      <section className="content-grid parent-grid">
        <article className="panel chart-panel">
          <div className="panel-head">
            <h3>Performance snapshot</h3>
          </div>
          <div className="chart-scroll">
            <div className="bar-chart">
              {performanceDays.map((item) => (
                <div key={item.day} className="bar-wrap">
                  <div className="bar-col">
                    <div className="bar-fill" style={{ height: `${item.value * 12}%` }} />
                  </div>
                  <small>{item.day}</small>
                </div>
              ))}
              {performanceDays.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No performance data</p>}
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Task status</h3>
          </div>
          <div className="stack-list">
            {parentTasks.map((task) => (
              <div key={task.id} className="info-card">
                <div className="row-between">
                  <strong>{task.title}</strong>
                  <span className={`status-tag ${task.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {task.status}
                  </span>
                </div>
                <span>{task.teacher}</span>
                <small>{task.detail}</small>
                <small>Due: {task.dueDate}</small>
                {task.completedAt ? <small>Completed: {task.completedAt}</small> : null}
                {task.driveLink ? <a href={task.driveLink} target="_blank" rel="noopener noreferrer">Open note</a> : null}
              </div>
            ))}
            {parentTasks.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No tasks assigned yet</p>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Appointment notifications</h3>
          </div>
          <div className="stack-list">
            {appointmentMeetings.map((meeting) => (
              <div key={meeting.id} className="info-card">
                <strong>{meeting.title || 'Meeting appointment'}</strong>
                <span>{new Date(meeting.requestedAt).toLocaleString()}</span>
                <small>{meeting.detail || 'Your requested slot was accepted by teacher.'}</small>
              </div>
            ))}
            {appointmentMeetings.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No accepted appointments yet</p>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Connection requests</h3>
          </div>
          <div className="stack-list">
            {incomingFriendRequests.map((request) => (
              <div key={request.id} className="info-card">
                <strong>{request.senderName || request.senderUsername || request.senderId}</strong>
                <span>{request.message || 'Sent you a connection request'}</span>
                <small>{request.senderUsername || ''}</small>
                <div className="row-between action-row">
                  <button type="button" className="ghost-btn" onClick={() => handleFriendRequestAction(request.id, 'decline')}>Decline</button>
                  <button type="button" className="primary-btn" onClick={() => handleFriendRequestAction(request.id, 'accept')}>Accept</button>
                </div>
              </div>
            ))}
            {incomingFriendRequests.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No pending requests</p>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Activity feed</h3>
          </div>
          <ul className="timeline-list">
            {parentActivity.map((entry, index) => (
              <li key={index}>
                <p className="time">{entry.time}</p>
                <div>
                  <h4>{entry.title}</h4>
                  <p>{entry.detail}</p>
                </div>
              </li>
            ))}
            {parentActivity.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No activity yet</p>}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Connected users</h3>
          </div>
          <div className="stack-list">
            {connections.map((connection) => (
              <div key={connection.id} className="info-card">
                <strong>{connection.name}</strong>
                <span>{connection.username}</span>
                <small>{connection.role}</small>
              </div>
            ))}
            {connections.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No connected users</p>}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

export default ParentDashboard;
