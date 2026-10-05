import api from './api';

export const farmService = {
  getFarmDetails: async () => api.get('/farm'),
  updateFarm: async (farmData) => api.post('/farm', farmData),
  addCrop: async (cropData) => api.post('/farm/crops', cropData),
  updateCrop: async (id, data) => api.put(`/farm/crops/${id}`, data),

  // Tasks
  getTasks: async (status) => api.get('/tasks', { params: status ? { status } : {} }),
  createTask: async (taskData) => api.post('/tasks', taskData),
  updateTask: async (id, taskData) => api.put(`/tasks/${id}`, taskData),
  deleteTask: async (id) => api.delete(`/tasks/${id}`),

  // Journal
  getJournal: async () => api.get('/journal'),
  createJournal: async (journalData) => api.post('/journal', journalData),
  updateJournal: async (id, journalData) => api.put(`/journal/${id}`, journalData),
  deleteJournal: async (id) => api.delete(`/journal/${id}`),

  // Inventory
  getInventory: async () => api.get('/inventory'),
  createInventoryItem: async (itemData) => api.post('/inventory', itemData),
  updateInventoryItem: async (id, itemData) => api.put(`/inventory/${id}`, itemData),
  deleteInventoryItem: async (id) => api.delete(`/inventory/${id}`),

  // Expenses
  getExpenses: async () => api.get('/expenses'),
  createExpense: async (expenseData) => api.post('/expenses', expenseData),
  updateExpense: async (id, expenseData) => api.put(`/expenses/${id}`, expenseData),
  deleteExpense: async (id) => api.delete(`/expenses/${id}`),

  // Seasonal Reports
  getSeasonalReport: async (season, year) => api.get('/reports/seasonal', { params: { season, year } }),
  getSeasonalPdfUrl: (season, year) => `/api/reports/seasonal/pdf?season=${season || 'Kharif'}&year=${year || 2026}`,

  // Notifications
  getNotifications: async (unreadOnly = false) => api.get('/notifications', { params: { unread_only: unreadOnly } }),
  markNotificationRead: async (id) => api.post(`/notifications/${id}/read`),
  markAllNotificationsRead: async () => api.post('/notifications/read-all'),
};
