import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import connectionsService, { getConnectionErrorMessage, isIncomingRequestForUser } from '../../services/connections';
import meetingsService from '../../services/meetings';
import usersService, { normalizeUserProfile } from '../../services/users';
import { getTasks, updateStatus } from '../../services/tasks';
import { getNotes } from '../../services/notes';
import eventsService from '../../services/events';

const formatEventTimeRange = (event) => {
  const start = event?.scheduledAt || event?.when;
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

const toExternalHref = (url) => {
  const value = String(url || '').trim();
  if (!value) {
    return '';
  }
  if (/^(https?:)?\/\//i.test(value)) {
    return value.startsWith('//') ? `https:${value}` : value;
  }
  return `https://${value}`;
};

const openExternalLink = (url) => {
  const href = toExternalHref(url);
  if (href) {
    window.open(href, '_blank', 'noopener,noreferrer');
  }
};

function ChildDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [childTasks, setChildTasks] = useState([]);
  const [subjectFolders, setSubjectFolders] = useState([]);
  const [subjectNotes, setSubjectNotes] = useState([]);
  const [childEvents, setChildEvents] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [appointmentMeetings, setAppointmentMeetings] = useState([]);
  const [showFriendForm, setShowFriendForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [friendForm, setFriendForm] = useState({ receiverId: '', message: '' });
  const [friendSearch, setFriendSearch] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState([]);
  const [friendSearchLoading, setFriendSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRolePopup, setShowRolePopup] = useState(false);
  const [selectedRelationshipRole, setSelectedRelationshipRole] = useState('PARENT');
  const [friendFormError, setFriendFormError] = useState('');
  const [friendSubmitting, setFriendSubmitting] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState('');
  const REFRESH_INTERVAL_MS = 30000;
  const isTodoStatus = (status) => status === 'Pending' || status === 'In Progress';
  const isDoneStatus = (status) => status === 'Completed';

  useEffect(() => {
    if (!user || user.role !== 'CHILD') {
      return undefined;
    }

    let ignore = false;

    const loadDashboard = async (profileData = null) => {
      try {
        const resolvedProfile = profileData || await usersService.getProfile().catch(() => null);
        const normalizedProfile = normalizeUserProfile(resolvedProfile, user);
        const childId = normalizedProfile.childId || normalizedProfile.linkedChildId || normalizedProfile.id;
        const teacherId = normalizedProfile.linkedTeacherId || '';
        const [tasksData, notesListData, eventsData] = await Promise.all([
          getTasks(childId).catch(() => []),
          getNotes(childId).catch(() => []),
          eventsService.getEvents(teacherId).catch(() => [])
        ]);

        if (!ignore) {
          setProfile(resolvedProfile || null);
          setSummary({
            message: tasksData.length === 0 ? 'No tasks assigned right now' : `${tasksData.length} task(s) ready`
          });
          setChildTasks(Array.isArray(tasksData) ? tasksData : []);
          setSubjectFolders(Array.isArray(notesListData) ? notesListData : []);
          setSubjectNotes(Array.isArray(notesListData) ? notesListData : []);
          setChildEvents(Array.isArray(eventsData) ? eventsData : []);
        }
      } catch (error) {
        console.error('Error loading child dashboard:', error);
        if (!ignore) {
          setSummary(null);
          setChildTasks([]);
          setSubjectFolders([]);
          setSubjectNotes([]);
          setChildEvents([]);
        }
      }
    };

    loadDashboard();
    connectionsService.getFriendRequests().then((data) => {
      setFriendRequests(Array.isArray(data) ? data : []);
    }).catch(() => {
      setFriendRequests([]);
    });
    connectionsService.getConnections().then((data) => {
      setConnections(Array.isArray(data) ? data : []);
    }).catch(() => {
      setConnections([]);
    });
    const loadProfileAndMeetings = async () => {
      try {
        const [meetingData, profileData] = await Promise.all([
          meetingsService.getMeetingRequests('ACCEPTED').catch(() => []),
          usersService.getProfile().catch(() => null)
        ]);

        if (!ignore) {
          setAppointmentMeetings(Array.isArray(meetingData) ? meetingData : []);
          setProfile(profileData || null);
        }
        await loadDashboard(profileData);
      } catch (error) {
        if (!ignore) {
          setAppointmentMeetings([]);
          setProfile(null);
        }
      }
    };

    loadProfileAndMeetings();
    const intervalId = setInterval(loadProfileAndMeetings, REFRESH_INTERVAL_MS);

    return () => {
      ignore = true;
      clearInterval(intervalId);
    };
  }, [user]);

  const pendingTasks = childTasks.filter((task) => isTodoStatus(task.status)).length;
  const completedTasks = childTasks.filter((task) => isDoneStatus(task.status)).length;
  const childProfile = normalizeUserProfile(profile, user);
  const currentUserId = childProfile.id || user?.id;
  const incomingFriendRequests = friendRequests.filter((request) => isIncomingRequestForUser(request, currentUserId));
  const toDoTasks = childTasks.filter((task) => isTodoStatus(task.status));
  const doneTasks = childTasks.filter((task) => isDoneStatus(task.status));

  const handleSendFriendRequest = async (event) => {
    event.preventDefault();
    setFriendFormError('');
    if (!selectedUser?.id) {
      setFriendFormError('Select a user from search results first.');
      return;
    }

    setFriendSubmitting(true);
    try {
      await connectionsService.sendFriendRequest({
        receiverId: selectedUser.id,
        receiverUsername: selectedUser.username,
        message: friendForm.message.trim(),
        relationshipRole: selectedRelationshipRole,
        senderRoleType: user?.role || 'CHILD',
        receiverRoleType: selectedUser.role || selectedRelationshipRole
      });
      setFriendForm({ receiverId: '', message: '' });
      setSelectedUser(null);
      setFriendSearch('');
      setFriendSearchResults([]);
      setSelectedRelationshipRole('PARENT');
      setShowRolePopup(false);
      setShowFriendForm(false);
    } catch (error) {
      setFriendFormError(getConnectionErrorMessage(error, 'Unable to send friend request.'));
    } finally {
      setFriendSubmitting(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!friendSearch.trim()) {
      setFriendSearchResults([]);
      return;
    }

    setFriendSearchLoading(true);
    try {
      const users = await connectionsService.searchUsers(friendSearch.trim());
      setFriendSearchResults(Array.isArray(users) ? users : []);
    } catch (error) {
      setFriendSearchResults([]);
      setFriendFormError(getConnectionErrorMessage(error, 'Unable to search users.'));
    } finally {
      setFriendSearchLoading(false);
    }
  };

  const openRolePopupForUser = (user) => {
    setSelectedUser(user);
    setFriendForm((current) => ({ ...current, receiverId: user.id }));
    if (['PARENT', 'TEACHER'].includes(user.role)) {
      setSelectedRelationshipRole(user.role);
    }
    setShowRolePopup(true);
    setFriendFormError('');
  };

  const handleFriendRequestAction = async (requestId, action) => {
    try {
      if (action === 'accept') {
        await connectionsService.acceptFriendRequest(requestId);
        const linked = await connectionsService.getConnections();
        setConnections(Array.isArray(linked) ? linked : []);
      } else {
        await connectionsService.declineFriendRequest(requestId);
      }
      setFriendRequests((current) => current.filter((request) => request.id !== requestId));
    } catch (error) {
      setFriendFormError(getConnectionErrorMessage(error, 'Unable to update friend request.'));
    }
  };

  const handleTaskStatusChange = async (taskId, status) => {
    try {
      setSavingTaskId(taskId);
      const updated = await updateStatus(taskId, status);
      setChildTasks((current) => current.map((task) => (task.id === taskId ? updated : task)));
    } catch (error) {
      console.error('Unable to update task status', error);
    } finally {
      setSavingTaskId('');
    }
  };

  return (
    <AppShell
      roleLabel="Child"
      title="Child Dashboard"
      subtitle="A simpler, friendlier space to see what to do next, what is already done, and what fun is coming up."
      navItems={[
        { label: 'Today', meta: `${pendingTasks} to do` },
        { label: 'Tasks', meta: `${childTasks.length} total` },
        { label: 'Notes', meta: `${subjectFolders.length} subjects` },
        { label: 'Events', meta: `${childEvents.length} coming` },
        { label: 'Requests', meta: `${incomingFriendRequests.length} pending` }
      ]}
      summary={{
        title: summary?.message || 'Small steps, clear wins',
        body: pendingTasks > 0 
          ? `You have ${pendingTasks} task(s) to finish. Keep going one by one.`
          : `Great job! You've completed ${completedTasks} tasks. Keep it up!`,
        highlights: [
          `${pendingTasks} tasks due`,
          `${completedTasks} completed`,
          `${childEvents.length} events this week`
        ]
      }}
      topbarMeta={[
        { label: 'To do', value: `${pendingTasks}`, helper: 'Do these first' },
        { label: 'Done', value: `${completedTasks}`, helper: 'Great job!' }
      ]}
      showNotificationButton={false}
      actionSlot={(
        <>
          <button type="button" className="ghost-btn" onClick={() => setShowProfile((open) => !open)}>
            {showProfile ? 'Close Profile' : 'Profile'}
          </button>
          <button type="button" className="primary-btn" onClick={() => setShowFriendForm((open) => !open)}>
            {showFriendForm ? 'Close Request Form' : 'Friend Request'}
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
              <strong>{childProfile.name || 'N/A'}</strong>
              <span>User ID: {childProfile.id || 'N/A'}</span>
              <small>Username: {childProfile.username || 'N/A'}</small>
              <small>Role: {childProfile.role || 'N/A'}</small>
              <span>Child ID: {childProfile.childId || 'N/A'}</span>
              <small>Email: {childProfile.email || 'N/A'}</small>
              <small>Parent Name: {childProfile.parentName || 'Not linked yet'}</small>
              <small>Teacher Name: {childProfile.teacherName || 'Not linked yet'}</small>
            </div>
          </div>
        </section>
      ) : null}

      {showFriendForm ? (
        <section className="panel inline-form-panel">
          <div className="panel-head">
            <h3>Send friend request</h3>
          </div>
          <form className="inline-form-grid" onSubmit={handleSendFriendRequest}>
            <label>
              <span>Search user by username/name *</span>
              <div className="row-between action-row">
                <input
                  value={friendSearch}
                  onChange={(event) => setFriendSearch(event.target.value)}
                  placeholder="Type username or name"
                />
                <button type="button" className="ghost-btn" onClick={handleSearchUsers} disabled={friendSearchLoading}>
                  {friendSearchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
              {friendSearchResults.length > 0 ? (
                <div className="stack-list" style={{ marginTop: '0.6rem' }}>
                  {friendSearchResults.map((user) => (
                    <button key={user.id} type="button" className="info-card search-result-btn" onClick={() => openRolePopupForUser(user)}>
                      <strong>{user.name}</strong>
                      <span>{user.username}</span>
                      <small>{user.role}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </label>
            <label className="inline-form-span-two">
              <span>Message</span>
              <textarea value={friendForm.message} onChange={(event) => setFriendForm((f) => ({ ...f, message: event.target.value }))} rows={3} />
            </label>
            {selectedUser ? (
              <p className="inline-form-span-two" style={{ margin: 0, color: '#355' }}>
                Selected: <strong>{selectedUser.name}</strong> ({selectedUser.username}) as <strong>{selectedRelationshipRole}</strong>
              </p>
            ) : null}
            {friendFormError ? <p className="form-error inline-form-error">{friendFormError}</p> : null}
            <button type="submit" className="primary-btn" disabled={friendSubmitting}>
              {friendSubmitting ? 'Sending...' : 'Send Connection Request'}
            </button>
          </form>
        </section>
      ) : null}

      {showRolePopup && selectedUser ? (
        <section className="panel inline-form-panel">
          <div className="panel-head">
            <h3>Select relationship role</h3>
            <p>How should you connect with {selectedUser.name}?</p>
          </div>
          <div className="switcher-row">
            {['PARENT', 'TEACHER'].map((role) => (
              <button
                key={role}
                type="button"
                className={`switcher-chip ${selectedRelationshipRole === role ? 'active' : ''}`}
                onClick={() => setSelectedRelationshipRole(role)}
              >
                {role}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="child-hero-card">
        <div className="child-hero-layout">
          <div>
            <p className="eyebrow">Today</p>
            <h3>
              {pendingTasks === 0 && completedTasks > 0 
                ? "Awesome job! You're all done for today." 
                : `You have ${pendingTasks} thing${pendingTasks !== 1 ? 's' : ''} to finish.`}
            </h3>
            <p>
              {pendingTasks > 0
                ? 'Start with the pending tasks, then mark them complete when you finish. Take it one at a time!'
                : 'Check back later for new assignments and upcoming events.'}
            </p>
            <div className="hero-badges child-badges">
              <span>{pendingTasks} to complete</span>
              <span>{completedTasks} completed</span>
              <span>{childEvents.length} events coming</span>
            </div>
          </div>

          <div className="hero-aside child-hero-progress">
            <p className="hero-card-label">Daily plan</p>
            <strong>
              {pendingTasks === 0 
                ? "You're all caught up!" 
                : `Finish ${Math.min(pendingTasks, 2)} and take a break.`}
            </strong>
            <p className="hero-aside-copy">
              Checking things off one at a time keeps everything manageable.
            </p>
          </div>
        </div>
      </section>

      <section className="child-stack">
        <article className="panel">
          <div className="panel-head">
            <h3>Friend requests</h3>
          </div>
          <div className="stack-list">
            {incomingFriendRequests.map((request) => (
              <div key={request.id} className="info-card">
                <strong>{request.senderName || request.senderId || 'Student'}</strong>
                <span>{request.message || 'Sent you a friend request'}</span>
                {request.relationshipRole ? <small>Requested as: {request.relationshipRole}</small> : null}
                <div className="row-between action-row">
                  <button type="button" className="ghost-btn" onClick={() => handleFriendRequestAction(request.id, 'decline')}>Decline</button>
                  <button type="button" className="primary-btn" onClick={() => handleFriendRequestAction(request.id, 'accept')}>Accept</button>
                </div>
              </div>
            ))}
            {incomingFriendRequests.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No pending friend requests</p>}
          </div>
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
                <small>{connection.role} {connection.relationshipRole ? `| ${connection.relationshipRole}` : ''}</small>
              </div>
            ))}
            {connections.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No connections yet</p>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Task board</h3>
          </div>
          <div className="task-card-grid">
            {[
              { title: 'To Do', items: toDoTasks },
              { title: 'Done', items: doneTasks }
            ].map((column) => (
              <div key={column.title} className="stack-list">
                <div className="panel-head">
                  <h3>{column.title}</h3>
                </div>
                {column.items.map((task) => (
                  <div key={task.id} className="task-card">
                    <div className="row-between">
                      <span className="subject-pill">{task.subject}</span>
                      <span className={`status-tag ${String(task.status).toLowerCase().replace(/\s+/g, '-')}`}>
                        {task.status}
                      </span>
                    </div>
                    <h4>{task.title}</h4>
                    <p>Due {task.dueDate}</p>
                    {task.driveLink ? (
                      <a href={task.driveLink} target="_blank" rel="noopener noreferrer">Open task note</a>
                    ) : null}
                    {task.feedback ? <div className="feedback-box">{task.feedback}</div> : null}
                    {column.title !== 'Done' ? (
                      <div className="row-between action-row">
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={() => handleTaskStatusChange(task.id, 'COMPLETED')}
                          disabled={savingTaskId === task.id}
                        >
                          {savingTaskId === task.id ? 'Saving...' : 'Mark Complete'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
                {column.items.length === 0 ? <p style={{ padding: '1rem', color: '#666' }}>Nothing here yet</p> : null}
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Subject notes</h3>
          </div>
          <div className="stack-list">
            {subjectNotes.map((note) => (
              <div key={note.id} className="info-card">
                <strong>{note.title || 'Subject note'}</strong>
                <span>{note.subject || 'General'}</span>
                {note.driveLink ? (
                  <button type="button" className="ghost-btn note-view-btn" onClick={() => openExternalLink(note.driveLink)}>
                    View Note
                  </button>
                ) : null}
              </div>
            ))}
            {subjectNotes.length === 0 && subjectFolders.map((folder) => (
              <div key={folder.subject} className="folder-card playful">
                <div className="folder-icon">{folder.subject.slice(0, 1)}</div>
                <h4>{folder.subject}</h4>
                <p>{folder.files} notes ready</p>
              </div>
            ))}
            {subjectNotes.length === 0 && subjectFolders.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No subject notes yet</p>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Meeting notifications</h3>
          </div>
          <div className="stack-list">
            {appointmentMeetings.map((meeting) => (
              <div key={meeting.id} className="info-card">
                <strong>{meeting.title || 'Appointment confirmed'}</strong>
                <small>{new Date(meeting.requestedAt).toLocaleString()}</small>
                <span>{meeting.detail || 'Teacher approved this meeting request.'}</span>
              </div>
            ))}
            {appointmentMeetings.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No meeting notifications yet</p>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Upcoming events</h3>
          </div>
          <div className="stack-list">
            {childEvents.map((event) => (
              <div key={event.id} className="info-card">
                <strong>{event.title}</strong>
                <small>{formatEventTimeRange(event)}</small>
                {event.detail ? <span>{event.detail}</span> : null}
              </div>
            ))}
            {childEvents.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No events scheduled</p>}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

export default ChildDashboard;
