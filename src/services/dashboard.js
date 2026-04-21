import api from './api';

const formatDateLabel = (dateString) => {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTimeLabel = (dateString) => {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatStatusLabel = (status) => {
  if (!status) {
    return '';
  }

  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatPriorityLabel = (priority) => {
  if (!priority) {
    return '';
  }

  return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
};

const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const formatRelativeOrDate = (dateString, fallback = '') => {
  if (!dateString) {
    return fallback;
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return formatDateTimeLabel(dateString);
};

export const dashboardService = {
  // Teacher methods
  getTeacherSummary: async () => {
    const data = (await api.get('/teacher/dashboard-summary')).data;

    return {
      linkedStudents: toNumber(data.linkedStudents),
      tasksInReview: toNumber(data.tasksInReview),
      meetingRequests: toNumber(data.meetingRequests),
      notesUploadedThisWeek: toNumber(data.notesUploadedThisWeek),
      studentsOnline: toNumber(data.studentsOnline),
      needsFeedback: toNumber(data.needsFeedback)
    };
  },
  getTeacherStudents: async () => (await api.get('/teacher/students')).data,
  getTeacherTasks: async () => {
    const data = (await api.get('/tasks', { params: { role: 'teacher' } })).data;

    return data.map((task) => ({
      ...task,
      dueDate: formatDateLabel(task.dueDate),
      priority: formatPriorityLabel(task.priority),
      status: formatStatusLabel(task.status),
      completedAt: task.completedAt ? formatDateTimeLabel(task.completedAt) : ''
    }));
  },
  getTeacherMeetings: async () => {
    const [meetingsData, acceptedRequests] = await Promise.all([
      api.get('/meetings', { params: { role: 'teacher' } }),
      api.get('/meeting-requests', { params: { status: 'ACCEPTED' } }).catch(() => ({ data: [] }))
    ]);

    const baseMeetings = Array.isArray(meetingsData.data) ? meetingsData.data : [];
    const acceptedAsMeetings = (Array.isArray(acceptedRequests.data) ? acceptedRequests.data : []).map((request) => ({
      id: `req-${request.id}`,
      title: request.title || 'Parent appointment',
      detail: request.detail || 'Accepted appointment request',
      scheduledAt: request.requestedAt
    }));

    return [...acceptedAsMeetings, ...baseMeetings].map((meeting) => ({
      ...meeting,
      time: formatDateTimeLabel(meeting.scheduledAt)
    }));
  },
  getTeacherNotes: async () => {
    const data = (await api.get('/notes/subjects')).data;

    return data.map((folder) => ({
      subject: folder.subject,
      files: toNumber(folder.files ?? folder.fileCount ?? folder.notesCount),
      latest: folder.latest ?? folder.latestNoteTitle ?? formatRelativeOrDate(folder.latestUpdatedAt, 'No recent note'),
      driveLink: folder.driveLink || ''
    }));
  },
  getTeacherNotesDetailed: async () => (await api.get('/notes')).data,
  createTeacherNote: async (noteData) => (await api.post('/notes', noteData)).data,

  // Parent methods
  getParentChildren: async () => (await api.get('/parent/children')).data,
  getParentSummary: async (childId) => {
    const data = (await api.get('/parent/dashboard-summary', { params: { childId } })).data;

    return {
      name: data.selectedChild,
      className: data.className,
      completion: data.completionRate,
      completed: data.completed,
      assigned: data.assigned,
      submitted: data.submitted
    };
  },
  getParentPerformance: async (childId) => {
    const data = (await api.get('/parent/performance', { params: { childId, period: '7d' } })).data;

    return data.map((point) => ({
      day: point.day,
      value: point.completed
    }));
  },
  getParentTasks: async (childId) => {
    const data = (await api.get('/parent/tasks', { params: { childId } })).data;

    return data.map((task) => ({
      ...task,
      status: formatStatusLabel(task.status),
      detail: task.detail || `Due ${formatDateLabel(task.dueDate)}`,
      dueDate: formatDateLabel(task.dueDate),
      completedAt: task.completedAt ? formatDateTimeLabel(task.completedAt) : ''
    }));
  },
  getParentActivity: async (childId) => (await api.get('/parent/activity-feed', { params: { childId } })).data,

  // Child methods
  getChildSummary: async () => (await api.get('/child/dashboard-summary')).data,
  getChildTasks: async () => {
    const data = (await api.get('/child/tasks/today')).data;

    return data.map((task) => ({
      ...task,
      dueDate: formatDateLabel(task.dueDate),
      status: formatStatusLabel(task.status),
      feedback: task.feedback || ''
    }));
  },
  updateChildTaskStatus: async (taskId, status) => {
    const data = (await api.patch(`/child/tasks/${taskId}/status`, { status })).data;
    return {
      ...data,
      dueDate: formatDateLabel(data.dueDate),
      status: formatStatusLabel(data.status),
      feedback: data.feedback || ''
    };
  },
  getChildNotesDetailed: async () => (await api.get('/notes')).data,
  getChildNotes: async () => {
    const data = (await api.get('/child/notes/subjects')).data;

    return data.map((folder) => ({
      subject: folder.subject,
      files: toNumber(folder.files ?? folder.fileCount ?? folder.notesCount),
      latest: folder.latest ?? folder.latestNoteTitle ?? formatRelativeOrDate(folder.latestUpdatedAt, 'No recent note'),
      driveLink: folder.driveLink || ''
    }));
  },
  getChildEvents: async () => {
    const data = (await api.get('/child/events')).data;

    return data.map((event) => ({
      ...event,
      when: formatDateTimeLabel(event.scheduledAt)
    }));
  },

  // Task management methods
  createTask: async (taskData) => {
    const payload = {
      title: taskData.title,
      subject: taskData.subject,
      dueDate: taskData.dueDate,
      priority: taskData.priority,
      detail: taskData.detail
    };

    if (taskData.audience) {
      payload.audience = taskData.audience;
    }

    const response = await api.post('/tasks', payload);
    return response.data;
  },

  updateTask: async (taskId, taskUpdate) => {
    const response = await api.put(`/tasks/${taskId}`, {
      ...taskUpdate,
      status: taskUpdate.status || 'PENDING'
    });
    return response.data;
  },

  getTask: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  }
};

export default dashboardService;
