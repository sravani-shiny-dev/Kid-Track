import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { useChild } from '../../context/ChildContext';
import { useAuth } from '../../context/AuthContext';
import dashboardService from '../../services/dashboard';
import notificationsService from '../../services/notifications';
import meetingsService from '../../services/meetings';
import connectionsService, { getConnectionErrorMessage, isIncomingRequestForUser } from '../../services/connections';
import usersService, { normalizeUserProfile } from '../../services/users';
import { getTasks } from '../../services/tasks';
import eventsService from '../../services/events';

const REFRESH_INTERVAL_MS = 5000;

const isCompletedStatus = (status) => String(status).toLowerCase() === 'completed';

const getMeetingStatus = (meeting) => String(meeting?.status || 'PENDING').toUpperCase();

const getMeetingTime = (meeting) => {
  const rawDate = meeting?.confirmedDatetime || meeting?.scheduledAt || meeting?.requestedAt;
  if (!rawDate) {
    return 'Time not set';
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return rawDate;
  }

  return date.toLocaleString();
};

const formatEventTimeRange = (event) => {
  const start = event?.scheduledAt || event?.time;
  const end = event?.endAt;
  if (!start) {
    return 'Upcoming event';
  }
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return start;
  }
  const datePart = startDate.toLocaleDateString();
  const startPart = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (!end) {
    return `${datePart}, ${startPart}`;
  }
  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) {
    return `${datePart}, ${startPart}`;
  }
  return `${datePart}, ${startPart} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

function TaskTimeline({ task }) {
  const completed = isCompletedStatus(task.status);
  const checkpoints = [
    { label: 'Assigned', date: task.assignedAt || 'Assigned', complete: true },
    { label: 'Due', date: task.dueDate || 'Not set', complete: true },
    { label: 'Completed', date: task.completedAt || 'Waiting', complete: completed }
  ];

  return (
    <div className={`task-timeline ${completed ? 'complete' : ''}`}>
      {checkpoints.map((checkpoint) => (
        <div key={checkpoint.label} className={`task-timeline-step ${checkpoint.complete ? 'active' : ''}`}>
          <span className="task-timeline-dot" />
          <strong>{checkpoint.label}</strong>
          <small>{checkpoint.date}</small>
        </div>
      ))}
    </div>
  );
}

function ParentDashboard() {
  const { user } = useAuth();
  const { activeChild, setActiveChild, childrenList } = useChild();
  const [summary, setSummary] = useState(null);
  const [performanceDays, setPerformanceDays] = useState([]);
  const [parentTasks, setParentTasks] = useState([]);
  const [parentActivity, setParentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [appointmentMeetings, setAppointmentMeetings] = useState([]);
  const [parentEvents, setParentEvents] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [meetingForm, setMeetingForm] = useState({ title: '', requestedAt: '', detail: '' });
  const [connectionForm, setConnectionForm] = useState({ username: '', message: '' });
  const [connectionSearchResults, setConnectionSearchResults] = useState([]);
  const [connectionSearchLoading, setConnectionSearchLoading] = useState(false);
  const [selectedConnectionUser, setSelectedConnectionUser] = useState(null);
  const [showConnectionRolePicker, setShowConnectionRolePicker] = useState(false);
  const [selectedConnectionRole, setSelectedConnectionRole] = useState('TEACHER');
  const [meetingFormError, setMeetingFormError] = useState('');
  const [connectionFormError, setConnectionFormError] = useState('');
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [connectionSubmitting, setConnectionSubmitting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'PARENT') {
      return undefined;
    }

    let ignore = false;

    const loadDashboard = async (profileData = null) => {
      const normalizedProfile = normalizeUserProfile(profileData || profile, user);
      const childId = activeChild?.id || normalizedProfile.linkedChildId;
      if (!childId) {
        return;
      }

      try {
        const [summaryData, performanceData, tasksData, activityData, eventsData] = await Promise.all([
          dashboardService.getParentSummary(childId),
          dashboardService.getParentPerformance(childId),
          getTasks(childId),
          dashboardService.getParentActivity(childId),
          eventsService.getEvents(normalizedProfile.linkedTeacherId).catch(() => [])
        ]);

        if (!ignore) {
          setSummary(summaryData);
          setPerformanceDays(performanceData);
          setParentTasks(tasksData);
          setParentActivity(activityData);
          setParentEvents(Array.isArray(eventsData) ? eventsData : []);
        }
      } catch (error) {
        console.error('Error loading parent dashboard:', error);
        if (!ignore) {
          setSummary(null);
          setPerformanceDays([]);
          setParentTasks([]);
          setParentActivity([]);
          setParentEvents([]);
        }
      }
    };

    loadDashboard();
    const intervalId = setInterval(loadDashboard, REFRESH_INTERVAL_MS);

    return () => {
      ignore = true;
      clearInterval(intervalId);
    };
  }, [activeChild, profile, user]);

  // Subscribe to notifications
  useEffect(() => {
    if (!user || user.role !== 'PARENT') {
      return undefined;
    }

    const unsubscribe = notificationsService.subscribe((notifs) => {
      setNotifications(notifs);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'PARENT') {
      return undefined;
    }

    let ignore = false;
    const loadAppointments = async () => {
      try {
        const accepted = await meetingsService.getMeetingsAsParent();
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
    const appointmentIntervalId = setInterval(loadAppointments, REFRESH_INTERVAL_MS);
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
      clearInterval(appointmentIntervalId);
    };
  }, [user]);

  const currentChild = summary || activeChild;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const completedTasks = parentTasks.filter((t) => isCompletedStatus(t.status)).length;
  const pendingMeetingCount = appointmentMeetings.filter((meeting) => getMeetingStatus(meeting) === 'PENDING').length;
  const acceptedMeetingCount = appointmentMeetings.filter((meeting) => getMeetingStatus(meeting) === 'ACCEPTED').length;
  const parentProfile = {
    ...normalizeUserProfile(profile, user),
    linkedChildId: profile?.linkedChildId || user?.linkedChildId || activeChild?.id || '',
    linkedChildName: profile?.linkedChildName || activeChild?.name || ''
  };
  const currentUserId = parentProfile.id || user?.id;
  const incomingFriendRequests = friendRequests.filter((request) => isIncomingRequestForUser(request, currentUserId));

  const handleMeetingRequest = async (event) => {
    event.preventDefault();
    setMeetingFormError('');
    const linkedChildId = parentProfile.linkedChildId || activeChild?.childId || activeChild?.id;
    if (!linkedChildId) {
      setMeetingFormError('Please select a child first.');
      return;
    }
    if (!meetingForm.title.trim() || !meetingForm.requestedAt) {
      setMeetingFormError('Title and date/time are required.');
      return;
    }

    setMeetingSubmitting(true);
    try {
      await meetingsService.requestMeeting({
        childId: linkedChildId,
        title: meetingForm.title.trim(),
        preferredDatetime: meetingForm.requestedAt,
        reason: meetingForm.detail.trim()
      });
      setMeetingForm({ title: '', requestedAt: '', detail: '' });
      setShowMeetingForm(false);
      const latestMeetings = await meetingsService.getMeetingsAsParent().catch(() => []);
      setAppointmentMeetings(Array.isArray(latestMeetings) ? latestMeetings : []);
    } catch (error) {
      setMeetingFormError(error.response?.data?.message || 'Unable to send meeting request.');
    } finally {
      setMeetingSubmitting(false);
    }
  };

  const handleSendConnectionRequest = async (event) => {
    event.preventDefault();
    setConnectionFormError('');
    if (!selectedConnectionUser?.id) {
      setConnectionFormError('Select a user from search results first.');
      return;
    }

    setConnectionSubmitting(true);
    try {
      await connectionsService.sendFriendRequest({
        receiverId: selectedConnectionUser.id,
        receiverUsername: selectedConnectionUser.username,
        receiverRoleType: selectedConnectionRole,
        message: connectionForm.message.trim(),
        senderRoleType: user?.role || 'PARENT'
      });
      setConnectionForm({ username: '', message: '' });
      setConnectionSearchResults([]);
      setSelectedConnectionUser(null);
      setSelectedConnectionRole('TEACHER');
      setShowConnectionRolePicker(false);
      setShowConnectionForm(false);
      const latestRequests = await connectionsService.getFriendRequests();
      setFriendRequests(Array.isArray(latestRequests) ? latestRequests : []);
    } catch (error) {
      setConnectionFormError(getConnectionErrorMessage(error, 'Unable to send connection request.'));
    } finally {
      setConnectionSubmitting(false);
    }
  };

  const handleConnectionSearch = async () => {
    if (!connectionForm.username.trim()) {
      setConnectionSearchResults([]);
      setConnectionFormError('Enter a username or email to search.');
      return;
    }

    setConnectionSearchLoading(true);
    setConnectionFormError('');
    try {
      const results = await connectionsService.searchUsers(connectionForm.username.trim());
      const filtered = (Array.isArray(results) ? results : []).filter((candidate) => ['TEACHER', 'CHILD'].includes(candidate.role));
      setConnectionSearchResults(filtered);
      if (!filtered.length) {
        setConnectionFormError('No matching teacher or child account found.');
      }
    } catch (error) {
      setConnectionSearchResults([]);
      setConnectionFormError(getConnectionErrorMessage(error, 'Unable to search users.'));
    } finally {
      setConnectionSearchLoading(false);
    }
  };

  const openConnectionRolePicker = (selectedUser) => {
    setSelectedConnectionUser(selectedUser);
    setSelectedConnectionRole(['TEACHER', 'CHILD'].includes(selectedUser.role) ? selectedUser.role : 'TEACHER');
    setShowConnectionRolePicker(true);
    setConnectionFormError('');
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
      setConnectionFormError(getConnectionErrorMessage(error, 'Unable to update friend request.'));
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
        { label: 'Meetings', meta: `${pendingMeetingCount} pending, ${acceptedMeetingCount} scheduled` },
        { label: 'Events', meta: `${parentEvents.length} coming` },
        { label: 'Notifications', meta: `${unreadCount} new` }
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
            {showMeetingForm ? 'Close Request Form' : 'Request Meeting with Teacher'}
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
            <h3>Connect user</h3>
            <p>Search for a teacher or child, choose the role, then send a connection request.</p>
          </div>
          <form className="inline-form-grid" onSubmit={handleSendConnectionRequest}>
            <label>
              <span>Search user by username/name *</span>
              <div className="row-between action-row">
                <input
                  value={connectionForm.username}
                  onChange={(event) => setConnectionForm((f) => ({ ...f, username: event.target.value }))}
                  placeholder="Type username or email"
                />
                <button type="button" className="ghost-btn" onClick={handleConnectionSearch} disabled={connectionSearchLoading}>
                  {connectionSearchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
              {connectionSearchResults.length > 0 ? (
                <div className="stack-list" style={{ marginTop: '0.6rem' }}>
                  {connectionSearchResults.map((candidate) => (
                    <button key={candidate.id} type="button" className="info-card search-result-btn" onClick={() => openConnectionRolePicker(candidate)}>
                      <strong>{candidate.name}</strong>
                      <span>{candidate.username}</span>
                      <small>{candidate.role}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </label>
            <label className="inline-form-span-two">
              <span>Message</span>
              <textarea value={connectionForm.message} onChange={(event) => setConnectionForm((f) => ({ ...f, message: event.target.value }))} rows={3} />
            </label>
            {selectedConnectionUser ? (
              <p className="inline-form-span-two" style={{ margin: 0, color: '#355' }}>
                Selected: <strong>{selectedConnectionUser.name}</strong> ({selectedConnectionUser.username}) as <strong>{selectedConnectionRole}</strong>
              </p>
            ) : null}
            {connectionFormError ? <p className="form-error inline-form-error">{connectionFormError}</p> : null}
            <button type="submit" className="primary-btn" disabled={connectionSubmitting}>
              {connectionSubmitting ? 'Sending...' : 'Send Connection Request'}
            </button>
          </form>
        </section>
      ) : null}

      {showConnectionRolePicker && selectedConnectionUser ? (
        <section className="panel inline-form-panel">
          <div className="panel-head">
            <h3>Select relationship role</h3>
            <p>How should you connect with {selectedConnectionUser.name}?</p>
          </div>
          <div className="switcher-row">
            {['TEACHER', 'CHILD'].map((role) => (
              <button
                key={role}
                type="button"
                className={`switcher-chip ${selectedConnectionRole === role ? 'active' : ''}`}
                onClick={() => setSelectedConnectionRole(role)}
              >
                {role}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {showMeetingForm ? (
        <section className="panel inline-form-panel">
          <div className="panel-head">
            <h3>Request a meeting</h3>
            <p>Send a preferred time to the teacher. The teacher reviews the request and confirms the scheduled meeting.</p>
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
              {meetingSubmitting ? 'Sending...' : 'Send Meeting Request'}
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
            <h3>Task timeline</h3>
          </div>
          <div className="stack-list">
            {parentTasks.map((task) => (
              <div key={task.id} className="info-card task-timeline-card">
                <div className="row-between">
                  <strong>{task.title}</strong>
                  <span className={`status-tag ${String(task.status).toLowerCase().replace(/\s+/g, '-')}`}>
                    {task.status}
                  </span>
                </div>
                <span>{task.teacher}</span>
                <small>{task.detail}</small>
                <TaskTimeline task={task} />
                {task.driveLink ? <a href={task.driveLink} target="_blank" rel="noopener noreferrer">Open note</a> : null}
              </div>
            ))}
            {parentTasks.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No tasks assigned yet</p>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Meeting requests</h3>
          </div>
          <div className="stack-list">
            {appointmentMeetings.map((meeting) => (
              <div key={meeting.id} className="info-card">
                <div className="row-between">
                  <strong>{meeting.title || 'Meeting request'}</strong>
                  <span className={`status-tag ${getMeetingStatus(meeting).toLowerCase()}`}>
                    {getMeetingStatus(meeting)}
                  </span>
                </div>
                <span>{getMeetingStatus(meeting) === 'ACCEPTED' ? 'Scheduled time' : 'Requested time'}: {getMeetingTime(meeting)}</span>
                <small>{meeting.detail || (getMeetingStatus(meeting) === 'ACCEPTED' ? 'Teacher accepted this meeting request.' : 'Waiting for teacher confirmation.')}</small>
              </div>
            ))}
            {appointmentMeetings.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No meeting requests yet</p>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Upcoming events</h3>
          </div>
          <div className="stack-list">
            {parentEvents.map((item) => (
              <div key={item.id} className="info-card">
                <strong>{item.title}</strong>
                <span>{formatEventTimeRange(item)}</span>
                <small>{item.detail || 'School event update'}</small>
              </div>
            ))}
            {parentEvents.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No events yet</p>}
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
