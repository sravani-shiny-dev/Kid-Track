export const roleMeta = {
  TEACHER: {
    label: 'Teacher',
    tone: 'Organize classes, tasks, notes, meetings, and events in one calm workspace.'
  },
  PARENT: {
    label: 'Parent',
    tone: 'Monitor progress, stay in sync with teachers, and follow each child clearly.'
  },
  CHILD: {
    label: 'Child',
    tone: 'A bright, simple dashboard for today\'s tasks, notes, and upcoming school moments.'
  }
};

export const teacherStudents = [
  { id: 's1', name: 'Aarav Nair', className: 'Grade 4', pendingTasks: 3, lastActive: '20 mins ago' },
  { id: 's2', name: 'Maya Iyer', className: 'Grade 2', pendingTasks: 1, lastActive: '1 hour ago' },
  { id: 's3', name: 'Kabir Das', className: 'Grade 5', pendingTasks: 0, lastActive: 'Just now' }
];

export const teacherMetrics = [
  { label: 'Linked Students', value: '28', helper: 'Across 3 active classes' },
  { label: 'Tasks In Review', value: '12', helper: 'Waiting for teacher approval' },
  { label: 'Meeting Requests', value: '5', helper: '2 need a response today' },
  { label: 'Notes Uploaded', value: '19', helper: 'This week across subjects' }
];

export const teacherTasks = [
  { title: 'Fractions practice sheet', subject: 'Mathematics', dueDate: 'Mar 30', priority: 'High', audience: 'Grade 4' },
  { title: 'Plant life cycle poster', subject: 'Science', dueDate: 'Apr 1', priority: 'Medium', audience: 'Grade 5' },
  { title: 'Reading journal entry', subject: 'English', dueDate: 'Mar 31', priority: 'Low', audience: 'All linked students' }
];

export const teacherMeetings = [
  { title: 'Parent request from Maya\'s family', time: 'Today, 4:30 PM', detail: 'Discuss reading pace and revision feedback.' },
  { title: 'Class progress check-in', time: 'Monday, 10:00 AM', detail: 'Online meeting with Grade 4 parents.' }
];

export const subjectFolders = [
  { subject: 'Mathematics', files: 6, latest: 'Chapter 3 worksheet uploaded today' },
  { subject: 'Science', files: 4, latest: 'Photosynthesis notes added yesterday' },
  { subject: 'English', files: 5, latest: 'Grammar revision guide updated' }
];

export const parentChildren = [
  { id: 'c1', name: 'Aarav', className: 'Grade 4', completion: 86, assigned: 9, completed: 7, submitted: 1 },
  { id: 'c2', name: 'Maya', className: 'Grade 2', completion: 74, assigned: 8, completed: 5, submitted: 2 }
];

export const parentActivity = [
  { time: '08:10 AM', title: 'Math task submitted', detail: 'Aarav sent in Fractions practice sheet.' },
  { time: '11:20 AM', title: 'Teacher uploaded notes', detail: 'New Science diagrams were added for Maya.' },
  { time: '03:15 PM', title: 'Meeting scheduled', detail: 'Reading progress meeting confirmed for Monday.' }
];

export const performanceDays = [
  { day: 'Mon', value: 5 },
  { day: 'Tue', value: 6 },
  { day: 'Wed', value: 4 },
  { day: 'Thu', value: 7 },
  { day: 'Fri', value: 6 },
  { day: 'Sat', value: 3 },
  { day: 'Sun', value: 5 }
];

export const parentTasks = [
  { title: 'Fractions practice sheet', status: 'Pending', teacher: 'Ms. Priya', detail: 'Due tomorrow' },
  { title: 'Reading journal entry', status: 'Submitted', teacher: 'Ms. Priya', detail: 'Waiting for approval' },
  { title: 'Water cycle chart', status: 'Needs Revision', teacher: 'Mr. Dinesh', detail: 'Teacher requested clearer labels' }
];

export const childTasks = [
  { title: 'Complete page 28 workbook', subject: 'Mathematics', dueDate: 'Today', status: 'Pending' },
  { title: 'Learn 5 new science words', subject: 'Science', dueDate: 'Tomorrow', status: 'Submitted' },
  { title: 'Fix reading summary', subject: 'English', dueDate: 'Today', status: 'Needs Revision', feedback: 'Add two more sentences about the main idea.' }
];

export const childEvents = [
  { title: 'Science Fair', when: 'Apr 3, 10:00 AM' },
  { title: 'Sports Day Practice', when: 'Apr 5, 8:30 AM' }
];

export const notificationsByRole = {
  TEACHER: [
    { id: 't1', title: 'New submission', body: 'Aarav completed Fractions practice sheet.', read: false },
    { id: 't2', title: 'Meeting request', body: 'Maya\'s parent asked for a time slot this evening.', read: false }
  ],
  PARENT: [
    { id: 'p1', title: 'Task assigned', body: 'New task: Fractions practice sheet for Aarav.', read: false },
    { id: 'p2', title: 'Notes uploaded', body: 'Science notes were uploaded for Maya.', read: true }
  ],
  CHILD: [
    { id: 'c1', title: 'Great work', body: 'Your Science words task was approved.', read: false },
    { id: 'c2', title: 'Teacher feedback', body: 'Please update your reading summary.', read: false }
  ]
};
