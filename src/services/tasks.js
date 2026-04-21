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

  return String(status)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const mapTask = (task) => ({
  ...task,
  status: formatStatusLabel(task.status),
  dueDate: formatDateLabel(task.dueDate),
  completedAt: formatDateTimeLabel(task.completedAt),
  assignedAt: formatDateTimeLabel(task.assignedAt || task.createdAt)
});

export const getTasks = async (childId) => {
  const response = await api.get('/tasks', childId ? { params: { childId } } : undefined);
  return Array.isArray(response.data) ? response.data.map(mapTask) : [];
};

export const createTask = async (body) => {
  const payload = {
    title: body.title,
    subject: body.subject || body.title,
    dueDate: body.dueDate,
    priority: body.priority || 'MEDIUM',
    detail: body.detail || body.description || '',
    driveLink: body.driveLink || null
  };

  const resolvedAudience = body.childId || body.audience;
  if (resolvedAudience) {
    payload.audience = resolvedAudience;
  }

  const response = await api.post('/tasks', payload);
  return response.data;
};

export const updateStatus = async (id, status) => {
  const response = await api.patch(`/tasks/${id}/status`, { status });
  return mapTask(response.data);
};
