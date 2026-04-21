import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import dashboardService from '../../services/dashboard';
import notificationsService from '../../services/notifications';
import meetingsService from '../../services/meetings';
import eventsService from '../../services/events';
import connectionsService, { getConnectionErrorMessage, isIncomingRequestForUser } from '../../services/connections';
import usersService, { normalizeUserProfile } from '../../services/users';
import NotifBell from '../../components/NotifBell';

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

function TeacherDashboard() {
  const { user } = useAuth();
  const REFRESH_INTERVAL_MS = 5000;
  const [summary, setSummary] = useState(null);
  const [teacherStudents, setTeacherStudents] = useState([]);
  const [teacherTasks, setTeacherTasks] = useState([]);
  const [teacherMeetings, setTeacherMeetings] = useState([]);
  const [subjectFolders, setSubjectFolders] = useState([]);
  const [teacherNotes, setTeacherNotes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showAddChildForm, setShowAddChildForm] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showScheduleMeetingForm, setShowScheduleMeetingForm] = useState(false);
  const [activeSidebarIndex, setActiveSidebarIndex] = useState(0);
  const [taskForm, setTaskForm] = useState({
    title: '',
    subject: '',
    audience: '',
    dueDate: '',
    priority: 'HIGH',
    detail: ''
  });
  const [taskFormError, setTaskFormError] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    audience: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    location: '',
    detail: ''
  });
  const [eventFormError, setEventFormError] = useState('');
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [noteForm, setNoteForm] = useState({
    title: '',
    subject: '',
    driveLink: ''
  });
  const [noteFormError, setNoteFormError] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [teacherEvents, setTeacherEvents] = useState([]);
  const [addChildForm, setAddChildForm] = useState({
    childId: '',
    childName: '',
    className: '',
    parentUsername: ''
  });
  const [addChildFormError, setAddChildFormError] = useState('');
  const [linkedChildren, setLinkedChildren] = useState([]);
  const [meetingScheduleForm, setMeetingScheduleForm] = useState({
    childId: '',
    parentUsername: '',
    title: '',
    scheduledAt: '',
    detail: ''
  });
  const [meetingScheduleError, setMeetingScheduleError] = useState('');
  const [meetingScheduling, setMeetingScheduling] = useState(false);
  const [connectionForm, setConnectionForm] = useState({ username: '', message: '' });
  const [connectionSearchResults, setConnectionSearchResults] = useState([]);
  const [connectionSearchLoading, setConnectionSearchLoading] = useState(false);
  const [selectedConnectionUser, setSelectedConnectionUser] = useState(null);
  const [showConnectionRolePicker, setShowConnectionRolePicker] = useState(false);
  const [selectedConnectionRole, setSelectedConnectionRole] = useState('PARENT');
  const [connectionFormError, setConnectionFormError] = useState('');
  const [connectionSubmitting, setConnectionSubmitting] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'TEACHER') {
      return undefined;
    }

    let ignore = false;

    const loadDashboard = async () => {
      try {
        const [summaryData, studentsData, tasksData, meetingsData, notesData, notesListData, requestData, eventsData] = await Promise.all([
          dashboardService.getTeacherSummary().catch(() => null),
          dashboardService.getTeacherStudents().catch(() => []),
          dashboardService.getTeacherTasks().catch(() => []),
          dashboardService.getTeacherMeetings().catch(() => []),
          dashboardService.getTeacherNotes().catch(() => []),
          dashboardService.getTeacherNotesDetailed().catch(() => []),
          meetingsService.getMeetingRequests().catch(() => []),
          eventsService.getEvents().catch(() => [])
        ]);

        if (!ignore) {
          setSummary(summaryData);
          setTeacherStudents(studentsData);
          setTeacherTasks(tasksData);
          setTeacherMeetings(meetingsData);
          setSubjectFolders(notesData);
          setTeacherNotes(Array.isArray(notesListData) ? notesListData : []);
          setMeetingRequests(Array.isArray(requestData) ? requestData : []);
          setTeacherEvents(Array.isArray(eventsData) ? eventsData : []);
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
        if (!ignore) {
          setSummary(null);
          setTeacherStudents([]);
          setTeacherTasks([]);
          setTeacherMeetings([]);
          setSubjectFolders([]);
          setTeacherNotes([]);
          setMeetingRequests([]);
          setTeacherEvents([]);
        }
      }
    };

    loadDashboard();
    const intervalId = setInterval(loadDashboard, REFRESH_INTERVAL_MS);

    return () => {
      ignore = true;
      clearInterval(intervalId);
    };
  }, [user]);

  // Subscribe to notifications
  useEffect(() => {
    if (!user || user.role !== 'TEACHER') {
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
    if (!user || user.role !== 'TEACHER') {
      return undefined;
    }

    let ignore = false;
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
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const highPriorityTasks = teacherTasks.filter((t) => t.priority === 'High');
  const submissionsWaiting = teacherTasks.filter((t) => t.status === 'In Review').length;
  const completedTasks = teacherTasks.filter((t) => t.status === 'Completed');
  const pendingMeetingRequests = meetingRequests.filter((request) => !request.status || String(request.status).toUpperCase() === 'PENDING');
  const handleCreateTask = async (event) => {
    event.preventDefault();
    setTaskFormError('');

    if (!taskForm.title.trim() || !taskForm.subject.trim() || !taskForm.audience.trim() || !taskForm.dueDate) {
      setTaskFormError('Title, subject, student and due date are required.');
      return;
    }

    setTaskSubmitting(true);
    try {
      await dashboardService.createTask({
        ...taskForm,
        title: taskForm.title.trim(),
        subject: taskForm.subject.trim(),
        audience: taskForm.audience.trim(),
        detail: taskForm.detail.trim()
      });
      const tasksData = await dashboardService.getTeacherTasks();
      setTeacherTasks(tasksData);
      setTaskForm({
        title: '',
        subject: '',
        audience: '',
        dueDate: '',
        priority: 'HIGH',
        detail: ''
      });
      setShowTaskForm(false);
    } catch (error) {
      setTaskFormError(error.response?.data?.message || 'Unable to create task.');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleMeetingRequestAction = async (requestId, action) => {
    try {
      if (action === 'accept') {
        await meetingsService.acceptMeetingRequest(requestId);
      } else {
        await meetingsService.declineMeetingRequest(requestId);
      }
      setMeetingRequests((current) => current.filter((item) => item.id !== requestId));
      const meetingsData = await dashboardService.getTeacherMeetings().catch(() => []);
      setTeacherMeetings(meetingsData);
    } catch (error) {
      console.error('Unable to update meeting request', error);
    }
  };

  const handleCreateEvent = async (event) => {
    event.preventDefault();
    setEventFormError('');

    if (!eventForm.title.trim() || !eventForm.audience.trim() || !eventForm.eventDate || !eventForm.startTime || !eventForm.endTime) {
      setEventFormError('Title, audience, date, start time and end time are required.');
      return;
    }

    const scheduledAt = `${eventForm.eventDate}T${eventForm.startTime}`;
    const endAt = `${eventForm.eventDate}T${eventForm.endTime}`;
    if (new Date(endAt).getTime() <= new Date(scheduledAt).getTime()) {
      setEventFormError('End time must be after start time.');
      return;
    }

    setEventSubmitting(true);
    try {
      const created = await eventsService.createEvent({
        title: eventForm.title.trim(),
        audience: eventForm.audience.trim(),
        scheduledAt,
        endAt,
        location: eventForm.location.trim(),
        detail: [eventForm.detail.trim(), eventForm.location.trim() ? `Location: ${eventForm.location.trim()}` : ''].filter(Boolean).join('\n')
      });

      setTeacherEvents((current) => [created, ...current]);
      setEventForm({
        title: '',
        audience: '',
        eventDate: '',
        startTime: '',
        endTime: '',
        location: '',
        detail: ''
      });
      setShowEventForm(false);
    } catch (error) {
      setEventFormError(error.response?.data?.message || 'Unable to create event.');
    } finally {
      setEventSubmitting(false);
    }
  };

  const handleCreateNote = async (event) => {
    event.preventDefault();
    setNoteFormError('');

    if (!noteForm.title.trim() || !noteForm.subject.trim() || !noteForm.driveLink.trim()) {
      setNoteFormError('Title, subject and Drive link are required.');
      return;
    }

    setNoteSubmitting(true);
    try {
      await dashboardService.createTeacherNote({
        title: noteForm.title.trim(),
        subject: noteForm.subject.trim(),
        driveLink: noteForm.driveLink.trim()
      });
      const [notesData, notesListData] = await Promise.all([
        dashboardService.getTeacherNotes(),
        dashboardService.getTeacherNotesDetailed().catch(() => [])
      ]);
      setSubjectFolders(notesData);
      setTeacherNotes(Array.isArray(notesListData) ? notesListData : []);
      setNoteForm({ title: '', subject: '', driveLink: '' });
      setShowNoteForm(false);
    } catch (error) {
      setNoteFormError(error.response?.data?.message || 'Unable to create note.');
    } finally {
      setNoteSubmitting(false);
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
        senderRoleType: user?.role || 'TEACHER'
      });
      setConnectionForm({ username: '', message: '' });
      setConnectionSearchResults([]);
      setSelectedConnectionUser(null);
      setSelectedConnectionRole('PARENT');
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
      const filtered = (Array.isArray(results) ? results : []).filter((candidate) => ['PARENT', 'CHILD'].includes(candidate.role));
      setConnectionSearchResults(filtered);
      if (!filtered.length) {
        setConnectionFormError('No matching parent or child account found.');
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
    setSelectedConnectionRole(['PARENT', 'CHILD'].includes(selectedUser.role) ? selectedUser.role : 'PARENT');
    setShowConnectionRolePicker(true);
    setConnectionFormError('');
  };

  const handleConnectionRequestAction = async (requestId, action) => {
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

  const teacherMetrics = [
    { label: 'Linked Students', value: `${summary?.linkedStudents || 0}`, helper: 'Teaching this period' },
    { label: 'Tasks In Review', value: `${summary?.tasksInReview || 0}`, helper: 'Waiting for approval' },
    { label: 'Meeting Requests', value: `${pendingMeetingRequests.length}`, helper: 'Awaiting your response' },
    { label: 'Subject Resources', value: `${summary?.notesUploadedThisWeek || 0}`, helper: 'Available materials' }
  ];

  const connectedChildStudents = connections
    .filter((connection) => connection?.role === 'CHILD')
    .map((connection) => ({
      id: connection.userId || connection.id,
      name: connection.name,
      className: 'Connected child',
      pendingTasks: 0,
      lastActive: connection.username || '',
      childId: connection.userId || connection.id,
      parentEmail: ''
    }));
  const selectableStudents = Array.from(
    new Map(
      [...linkedChildren, ...teacherStudents, ...connectedChildStudents]
        .filter((student) => student?.id != null)
        .map((student) => [String(student.id), student])
    ).values()
  );
  const allStudents = selectableStudents;
  const activeStudentsCount = Math.max(3, allStudents.length);
  const sidebarSections = [
    { label: 'Students', meta: `${activeStudentsCount} active` },
    { label: 'Tasks', meta: `${submissionsWaiting} in review` },
    { label: 'Notes', meta: `${subjectFolders.length} subjects` },
    { label: 'Meetings', meta: `${teacherMeetings.length} scheduled` },
    { label: 'Notifications', meta: `${unreadCount} new` },
    { label: 'Requests', meta: `${pendingMeetingRequests.length} pending` },
    { label: 'Screen Monitor', meta: 'Locked', comingSoon: true }
  ];
  const activeSection = sidebarSections[activeSidebarIndex]?.label || 'Students';
  const teacherProfile = {
    ...normalizeUserProfile(profile, user),
    teacherName: profile?.teacherName || user?.name || ''
  };
  const currentUserId = teacherProfile.id || user?.id;
  const incomingFriendRequests = friendRequests.filter((request) => isIncomingRequestForUser(request, currentUserId));

  return (
    <AppShell
      roleLabel="Teacher"
      title="Teacher Dashboard"
      subtitle="Track submissions, unblock students quickly, and keep the day moving without hunting across screens."
      navItems={sidebarSections}
      activeNavIndex={activeSidebarIndex}
      onNavChange={setActiveSidebarIndex}
      summary={{
        title: highPriorityTasks.length > 0 ? 'Focus on high-priority items first' : 'All tasks are on track',
        body: highPriorityTasks.length > 0
          ? `You have ${highPriorityTasks.length} high-priority task(s) to review. ${submissionsWaiting} submission(s) waiting for approval.`
          : 'Review submissions and prepare for scheduled meetings.',
        highlights: (highPriorityTasks.length > 0 ? highPriorityTasks : completedTasks).slice(0, 3).map((t) => `${t.title}${t.audience ? ` (${t.audience})` : ''}`)
      }}
      topbarMeta={[
        { label: 'Students online', value: `${summary?.studentsOnline || 0}`, helper: 'Active students' },
        { label: 'Needs feedback', value: `${summary?.needsFeedback || 0}`, helper: 'Action required' },
        { label: 'Notifications', value: `${unreadCount}`, helper: 'Unread items' }
      ]}
      showNotificationButton={false}
      actionSlot={(
        <div className="quick-actions-menu">
          <button
            type="button"
            className="ghost-btn quick-actions-trigger"
            aria-label="Open quick actions"
            onClick={() => setShowQuickActions((open) => !open)}
          >
            ...
          </button>
          {showQuickActions ? (
            <div className="quick-actions-dropdown">
              <button type="button" className="ghost-btn" onClick={() => { setShowProfile((open) => !open); setShowQuickActions(false); }}>
                {showProfile ? 'Close Profile' : 'Profile'}
              </button>
              <button type="button" className="ghost-btn" onClick={() => { setShowAddChildForm((open) => !open); setShowQuickActions(false); }}>
                {showAddChildForm ? 'Close Add Child' : 'Add Child'}
              </button>
              <button type="button" className="ghost-btn" onClick={() => { setShowScheduleMeetingForm((open) => !open); setShowQuickActions(false); }}>
                {showScheduleMeetingForm ? 'Close Meeting' : 'Schedule Meeting'}
              </button>
              <button type="button" className="ghost-btn" onClick={() => { setShowConnectionForm((open) => !open); setShowQuickActions(false); }}>
                {showConnectionForm ? 'Close Connect' : 'Connect User'}
              </button>
              <button type="button" className="ghost-btn" onClick={() => { setShowNoteForm((open) => !open); setShowQuickActions(false); }}>
                {showNoteForm ? 'Close Notes' : 'Add Note'}
              </button>
              <NotifBell />
            </div>
          ) : null}
          <button type="button" className="primary-btn" onClick={() => setShowTaskForm((open) => !open)}>
            {showTaskForm ? 'Close Task Form' : 'Create Task'}
          </button>
          <button type="button" className="ghost-btn" onClick={() => setShowEventForm((open) => !open)}>
            {showEventForm ? 'Close Event Form' : 'Create Event'}
          </button>
        </div>
      )}
    >
      {showProfile ? (
        <section className="panel inline-form-panel">
          <div className="panel-head">
            <h3>Profile</h3>
          </div>
          <div className="stack-list">
            <div className="info-card">
              <strong>{teacherProfile.name || 'N/A'}</strong>
              <span>User ID: {teacherProfile.id || 'N/A'}</span>
              <small>Username: {teacherProfile.username || 'N/A'}</small>
              <small>Role: {teacherProfile.role || 'N/A'}</small>
              <span>{teacherProfile.email || 'N/A'}</span>
              <small>Linked Child ID: {teacherProfile.linkedChildId || 'N/A'}</small>
              <small>Linked Child Name: {teacherProfile.linkedChildName || 'N/A'}</small>
            </div>
          </div>
        </section>
      ) : null}

      {showConnectionForm ? (
        <section className="panel inline-form-panel">
          <div className="panel-head">
            <h3>Connect user</h3>
            <p>Search for a parent or child, choose the role, then send a connection request.</p>
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
            {['PARENT', 'CHILD'].map((role) => (
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

      {showAddChildForm ? (
        <section className="panel inline-form-panel">
          <div className="panel-head">
            <h3>Add child and link parent</h3>
            <p>Link child ID with parent username (email).</p>
          </div>
          <form
            className="inline-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              setAddChildFormError('');
              if (!addChildForm.childId.trim() || !addChildForm.childName.trim() || !addChildForm.parentUsername.trim()) {
                setAddChildFormError('Child ID, name, and parent username are required.');
                return;
              }
              setLinkedChildren((current) => ([
                {
                  id: addChildForm.childId.trim(),
                  name: addChildForm.childName.trim(),
                  className: addChildForm.className.trim() || 'N/A',
                  pendingTasks: 0,
                  lastActive: `Parent: ${addChildForm.parentUsername.trim()}`,
                  parentUsername: addChildForm.parentUsername.trim()
                },
                ...current.filter((item) => item.id !== addChildForm.childId.trim())
              ]));
              setAddChildForm({ childId: '', childName: '', className: '', parentUsername: '' });
              setShowAddChildForm(false);
            }}
          >
            <label>
              <span>Child ID *</span>
              <input value={addChildForm.childId} onChange={(event) => setAddChildForm((f) => ({ ...f, childId: event.target.value }))} />
            </label>
            <label>
              <span>Child name *</span>
              <input value={addChildForm.childName} onChange={(event) => setAddChildForm((f) => ({ ...f, childName: event.target.value }))} />
            </label>
            <label>
              <span>Class</span>
              <input value={addChildForm.className} onChange={(event) => setAddChildForm((f) => ({ ...f, className: event.target.value }))} />
            </label>
            <label>
              <span>Parent username (email) *</span>
              <input value={addChildForm.parentUsername} onChange={(event) => setAddChildForm((f) => ({ ...f, parentUsername: event.target.value }))} />
            </label>
            {addChildFormError ? <p className="form-error inline-form-error">{addChildFormError}</p> : null}
            <button type="submit" className="primary-btn">Link Child</button>
          </form>
        </section>
      ) : null}

      {showEventForm ? (
        <section className="panel inline-form-panel">
          <div className="panel-head">
            <h3>Create event</h3>
          </div>
          <form className="inline-form-grid" onSubmit={handleCreateEvent}>
            <label>
              <span>Event title *</span>
              <input value={eventForm.title} onChange={(event) => setEventForm((f) => ({ ...f, title: event.target.value }))} />
            </label>
            <label>
              <span>Audience / Child ID *</span>
              <select value={eventForm.audience} onChange={(event) => setEventForm((f) => ({ ...f, audience: event.target.value }))}>
                <option value="">Select student</option>
                <option value="ALL">All linked students</option>
                {selectableStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.id})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Event date *</span>
              <input type="date" value={eventForm.eventDate} onChange={(event) => setEventForm((f) => ({ ...f, eventDate: event.target.value }))} />
            </label>
            <label>
              <span>Start time *</span>
              <input type="time" value={eventForm.startTime} onChange={(event) => setEventForm((f) => ({ ...f, startTime: event.target.value }))} />
            </label>
            <label>
              <span>End time *</span>
              <input type="time" value={eventForm.endTime} onChange={(event) => setEventForm((f) => ({ ...f, endTime: event.target.value }))} />
            </label>
            <label>
              <span>Location</span>
              <input value={eventForm.location} onChange={(event) => setEventForm((f) => ({ ...f, location: event.target.value }))} />
            </label>
            <label className="inline-form-span-two">
              <span>Details</span>
              <textarea value={eventForm.detail} onChange={(event) => setEventForm((f) => ({ ...f, detail: event.target.value }))} rows={3} />
            </label>
            {eventFormError ? <p className="form-error inline-form-error">{eventFormError}</p> : null}
            <button type="submit" className="primary-btn" disabled={eventSubmitting}>
              {eventSubmitting ? 'Saving...' : 'Save Event'}
            </button>
          </form>
        </section>
      ) : null}

      {showScheduleMeetingForm ? (
        <section className="panel inline-form-panel">
          <div className="panel-head">
            <h3>Schedule meeting</h3>
            <p>Select date/time to notify linked parent and child dashboards.</p>
          </div>
          <form
            className="inline-form-grid"
            onSubmit={async (event) => {
              event.preventDefault();
              setMeetingScheduleError('');
              if (!meetingScheduleForm.childId.trim() || !meetingScheduleForm.parentUsername.trim() || !meetingScheduleForm.title.trim() || !meetingScheduleForm.scheduledAt) {
                setMeetingScheduleError('Child ID, parent username, title and date/time are required.');
                return;
              }
              setMeetingScheduling(true);
              try {
                await meetingsService.scheduleMeetingByTeacher({
                  childId: meetingScheduleForm.childId.trim(),
                  parentUsername: meetingScheduleForm.parentUsername.trim(),
                  title: meetingScheduleForm.title.trim(),
                  detail: meetingScheduleForm.detail.trim(),
                  scheduledAt: meetingScheduleForm.scheduledAt
                });
                const meetingsData = await dashboardService.getTeacherMeetings();
                setTeacherMeetings(meetingsData);
                setMeetingScheduleForm({ childId: '', parentUsername: '', title: '', scheduledAt: '', detail: '' });
                setShowScheduleMeetingForm(false);
              } catch (error) {
                setMeetingScheduleError(error.response?.data?.message || 'Unable to schedule meeting.');
              } finally {
                setMeetingScheduling(false);
              }
            }}
          >
            <label>
              <span>Child ID *</span>
              <input value={meetingScheduleForm.childId} onChange={(event) => setMeetingScheduleForm((f) => ({ ...f, childId: event.target.value }))} />
            </label>
            <label>
              <span>Parent username (email) *</span>
              <input value={meetingScheduleForm.parentUsername} onChange={(event) => setMeetingScheduleForm((f) => ({ ...f, parentUsername: event.target.value }))} />
            </label>
            <label>
              <span>Meeting title *</span>
              <input value={meetingScheduleForm.title} onChange={(event) => setMeetingScheduleForm((f) => ({ ...f, title: event.target.value }))} />
            </label>
            <label>
              <span>Date and time *</span>
              <input type="datetime-local" value={meetingScheduleForm.scheduledAt} onChange={(event) => setMeetingScheduleForm((f) => ({ ...f, scheduledAt: event.target.value }))} />
            </label>
            <label className="inline-form-span-two">
              <span>Details</span>
              <textarea value={meetingScheduleForm.detail} onChange={(event) => setMeetingScheduleForm((f) => ({ ...f, detail: event.target.value }))} rows={3} />
            </label>
            {meetingScheduleError ? <p className="form-error inline-form-error">{meetingScheduleError}</p> : null}
            <button type="submit" className="primary-btn" disabled={meetingScheduling}>
              {meetingScheduling ? 'Scheduling...' : 'Schedule and Notify'}
            </button>
          </form>
        </section>
      ) : null}

      {showTaskForm ? (
        <section className="panel inline-form-panel">
          <div className="panel-head">
            <h3>Create task</h3>
          </div>
          <form className="inline-form-grid" onSubmit={handleCreateTask}>
            <label>
              <span>Title *</span>
              <input value={taskForm.title} onChange={(event) => setTaskForm((f) => ({ ...f, title: event.target.value }))} />
            </label>
            <label>
              <span>Subject *</span>
              <input value={taskForm.subject} onChange={(event) => setTaskForm((f) => ({ ...f, subject: event.target.value }))} />
            </label>
            <label>
              <span>Student / child *</span>
              <select value={taskForm.audience} onChange={(event) => setTaskForm((f) => ({ ...f, audience: event.target.value }))}>
                <option value="">Select student</option>
                <option value="ALL">All linked students</option>
                {selectableStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.id})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Due date *</span>
              <input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((f) => ({ ...f, dueDate: event.target.value }))} />
            </label>
            <label>
              <span>Priority *</span>
              <select value={taskForm.priority} onChange={(event) => setTaskForm((f) => ({ ...f, priority: event.target.value }))}>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </label>
            <label className="inline-form-span-two">
              <span>Details</span>
              <textarea value={taskForm.detail} onChange={(event) => setTaskForm((f) => ({ ...f, detail: event.target.value }))} rows={3} />
            </label>
            {taskFormError ? <p className="form-error inline-form-error">{taskFormError}</p> : null}
            <button type="submit" className="primary-btn" disabled={taskSubmitting}>
              {taskSubmitting ? 'Saving...' : 'Save Task'}
            </button>
          </form>
        </section>
      ) : null}

      {pendingMeetingRequests.length > 0 && activeSection !== 'Requests' ? (
        <section className="panel">
          <div className="panel-head">
            <h3>Meeting requests</h3>
            <p>{pendingMeetingRequests.length} parent request{pendingMeetingRequests.length === 1 ? '' : 's'} awaiting your response.</p>
          </div>
          <div className="stack-list">
            {pendingMeetingRequests.map((request) => (
              <div key={request.id} className="info-card">
                <strong>{request.title || 'Meeting request'}</strong>
                <span>{request.senderName || request.parentName || 'Parent'} requested a meeting</span>
                <small>{request.detail || request.message || request.requestedAt || 'Please review this request.'}</small>
                <div className="row-between action-row">
                  <button type="button" className="ghost-btn" onClick={() => handleMeetingRequestAction(request.id, 'decline')}>Decline</button>
                  <button type="button" className="primary-btn" onClick={() => handleMeetingRequestAction(request.id, 'accept')}>Accept</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {showNoteForm ? (
        <section className="panel inline-form-panel">
          <div className="panel-head">
            <h3>Add note</h3>
            <p>Paste a Google Drive link to share this subject note with all linked children.</p>
          </div>
          <form className="inline-form-grid" onSubmit={handleCreateNote}>
            <label>
              <span>Title *</span>
              <input value={noteForm.title} onChange={(event) => setNoteForm((form) => ({ ...form, title: event.target.value }))} />
            </label>
            <label>
              <span>Subject *</span>
              <input value={noteForm.subject} onChange={(event) => setNoteForm((form) => ({ ...form, subject: event.target.value }))} />
            </label>
            <label className="inline-form-span-two">
              <span>Drive link *</span>
              <input value={noteForm.driveLink} onChange={(event) => setNoteForm((form) => ({ ...form, driveLink: event.target.value }))} />
            </label>
            {noteFormError ? <p className="form-error inline-form-error">{noteFormError}</p> : null}
            <button type="submit" className="primary-btn" disabled={noteSubmitting}>
              {noteSubmitting ? 'Saving...' : 'Save Note'}
            </button>
          </form>
        </section>
      ) : null}

      <section className="page-hero page-hero-teacher">
        <div className="page-hero-main">
          <p className="eyebrow">Teaching dashboard</p>
          <h3>Everything that needs your attention is grouped by urgency.</h3>
          <p>
            Your dashboard pulls real data from all students and shows submission status, student progress,
            and upcoming meetings in one coordinated view.
          </p>
          <div className="hero-badges">
            <span>{submissionsWaiting} submissions waiting</span>
            <span>{teacherMeetings.length} meetings scheduled</span>
            <span>{unreadCount} new notifications</span>
          </div>
        </div>
        <div className="hero-aside">
          <p className="hero-card-label">Next steps</p>
          <ul className="hero-priority-list">
            {highPriorityTasks.slice(0, 3).map((task) => (
              <li key={task.id}>{task.title} ({task.audience})</li>
            ))}
            {highPriorityTasks.length === 0 && <li>Review student submissions when ready</li>}
          </ul>
        </div>
      </section>

      <section className="metric-grid">
        {teacherMetrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <p>{metric.label}</p>
            <h3>{metric.value}</h3>
            <span>{metric.helper}</span>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>{activeSection} details</h3>
          <p>Clicked from sidebar. This section shows only related information.</p>
        </div>
      </section>

      {activeSection === 'Students' ? (
        <section className="panel">
          <div className="panel-head">
            <h3>Linked students</h3>
          </div>
          <div className="student-grid">
            {allStudents.map((student) => (
              <div key={student.id} className="student-card">
                <div className="avatar">{(student.name || student.childName || 'S')[0]}</div>
                <div>
                  <h4>{student.childName || student.name}</h4>
                  <p>ID: {student.childId || student.id || 'N/A'}</p>
                  <small>{student.className || 'Student account'}</small>
                </div>
                <span className="status-tag neutral">{student.pendingTaskCount || student.pendingTasks || 0} pending tasks</span>
                <span className="meta-copy">
                  {student.parentEmail ? `Parent: ${student.parentEmail}` : (student.parentUsername ? `Parent: ${student.parentUsername}` : student.lastActive)}
                </span>
              </div>
            ))}
            {allStudents.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No students found</p>}
          </div>
        </section>
      ) : null}

      {activeSection === 'Tasks' ? (
        <section className="panel">
          <div className="panel-head">
            <h3>Task manager</h3>
          </div>
          <div className="stack-list">
            {teacherTasks.map((task) => (
              <div key={task.id} className="info-card">
                <strong>{task.title}</strong>
                <span>{task.subject}{task.audience ? ` | ${task.audience}` : ''}</span>
                <div className="row-between">
                  <small>Due {task.dueDate}</small>
                  <span className={`status-tag ${task.priority.toLowerCase()}`}>{task.status}</span>
                </div>
                {task.completedAt ? <small>Completed: {task.completedAt}</small> : null}
                {task.driveLink ? <a href={task.driveLink} target="_blank" rel="noopener noreferrer">Open task note</a> : null}
              </div>
            ))}
            {teacherTasks.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No tasks assigned yet</p>}
          </div>
        </section>
      ) : null}

      {activeSection === 'Notes' ? (
        <section className="panel">
          <div className="panel-head">
            <h3>Subject notes</h3>
          </div>
          <div className="stack-list">
            {teacherNotes.map((note) => (
              <div key={note.id} className="info-card">
                <strong>{note.title || 'Subject note'}</strong>
                <span>{note.subject || 'General'}</span>
                <small>{note.childId ? `Child ID: ${note.childId}` : 'Visible to all linked children'}</small>
                {note.driveLink ? (
                  <button type="button" className="ghost-btn note-view-btn" onClick={() => openExternalLink(note.driveLink)}>
                    View Note
                  </button>
                ) : null}
              </div>
            ))}
            {teacherNotes.length === 0 && subjectFolders.map((folder) => (
              <div key={folder.subject} className="folder-card">
                <div className="folder-icon">+</div>
                <h4>{folder.subject}</h4>
                <p>{folder.files} files</p>
                <small>{folder.latest}</small>
              </div>
            ))}
            {teacherNotes.length === 0 && subjectFolders.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No subject notes</p>}
          </div>
        </section>
      ) : null}

      {activeSection === 'Meetings' ? (
        <section className="content-grid teacher-grid">
          <article className="panel">
            <div className="panel-head">
              <h3>Meeting scheduler</h3>
            </div>
            <div className="stack-list">
              {teacherMeetings.map((meeting) => (
                <div key={meeting.id} className="info-card">
                  <strong>{meeting.title}</strong>
                  <span>{meeting.time}</span>
                  <small>{meeting.detail}</small>
                </div>
              ))}
              {teacherMeetings.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No meetings scheduled</p>}
            </div>
          </article>
          <article className="panel">
            <div className="panel-head">
              <h3>Events</h3>
            </div>
            <div className="stack-list">
              {teacherEvents.map((event) => (
                <div key={event.id || `${event.title}-${event.scheduledAt}`} className="info-card">
                  <strong>{event.title}</strong>
                  <span>{formatEventTimeRange(event)}</span>
                  <small>{event.detail || event.location || 'School event'}</small>
                </div>
              ))}
              {teacherEvents.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No events available</p>}
            </div>
          </article>
        </section>
      ) : null}

      {activeSection === 'Notifications' ? (
        <section className="panel">
          <div className="panel-head">
            <h3>Notification updates</h3>
          </div>
          <div className="stack-list">
            {notifications.map((item) => (
              <div key={item.id} className="info-card">
                <strong>{item.title}</strong>
                <span>{item.body}</span>
                <small>{item.read ? 'Read' : 'Unread'}</small>
              </div>
            ))}
            {notifications.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No notifications yet</p>}
          </div>
        </section>
      ) : null}

      {activeSection === 'Requests' ? (
        <section className="panel">
          <div className="panel-head">
            <h3>Meeting requests</h3>
          </div>
          <div className="stack-list">
            {pendingMeetingRequests.map((request) => (
              <div key={request.id} className="info-card">
                <strong>{request.title || 'Meeting request'}</strong>
                <span>{request.senderName || request.parentName || 'Parent'} requested a meeting</span>
                <small>{request.detail || request.message || 'Please review this request.'}</small>
                <div className="row-between action-row">
                  <button type="button" className="ghost-btn" onClick={() => handleMeetingRequestAction(request.id, 'decline')}>Decline</button>
                  <button type="button" className="primary-btn" onClick={() => handleMeetingRequestAction(request.id, 'accept')}>Accept</button>
                </div>
              </div>
            ))}
            {pendingMeetingRequests.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No pending meeting requests</p>}
          </div>
        </section>
      ) : null}

      {activeSection === 'Students' ? (
        <section className="content-grid teacher-grid">
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
                    <button type="button" className="ghost-btn" onClick={() => handleConnectionRequestAction(request.id, 'decline')}>Decline</button>
                    <button type="button" className="primary-btn" onClick={() => handleConnectionRequestAction(request.id, 'accept')}>Accept</button>
                  </div>
                </div>
              ))}
              {incomingFriendRequests.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No pending requests</p>}
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
                  <small>{connection.role}</small>
                </div>
              ))}
              {connections.length === 0 && <p style={{ padding: '1rem', color: '#666' }}>No connected users</p>}
            </div>
          </article>
        </section>
      ) : null}
    </AppShell>
  );
}

export default TeacherDashboard;
