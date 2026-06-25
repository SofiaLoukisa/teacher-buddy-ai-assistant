import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  token: string;
  user: User;
}

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  message_count?: number;
}

export interface SendMessageResponse {
  session_id: number;
  user_message: Message;
  ai_message: Message;
}

export interface AdminStats {
  total_users: number;
  total_chats: number;
  total_messages: number;
  active_users: number;
  new_users_this_week: number;
  new_chats_this_week: number;
  avg_messages_per_chat: number;
}

export interface ResourceFile {
  id: number;
  filename: string;
  filetype: string;
  created_at: string;
}

export interface LessonPlan {
  id: number;
  title: string;
  instructions: string;
  resourceFileId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: number;
  date: string;
  title: string;
}

export interface CalendarClass {
  id: number;
  name: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  room?: string;
}

export interface Assignment {
  id: number;
  title: string;
  dueDate: string;
  className?: string;
}

export interface TeacherPreferences {
  gradeLevel: string;
  curriculum: string;
  classSize: string;
  teachingStyle: string;
}

// Authentication API
export const authAPI = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', {
      username,
      password,
    });
    return response.data;
  },

  register: async (
    username: string,
    email: string,
    password: string
  ): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/api/auth/register', {
      username,
      email,
      password,
    });
    return response.data;
  },

  verify: async (): Promise<{ user: User }> => {
    const response = await api.get<{ user: User }>('/api/auth/verify');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// Chat API
export const chatAPI = {
  getSessions: async (): Promise<{ sessions: ChatSession[] }> => {
    const response = await api.get<{ sessions: ChatSession[] }>('/api/chat/sessions');
    return response.data;
  },

  getSessionHistory: async (
    sessionId: number
  ): Promise<{ session: ChatSession; messages: Message[] }> => {
    const response = await api.get<{ session: ChatSession; messages: Message[] }>(
      `/api/chat/sessions/${sessionId}`
    );
    return response.data;
  },

  deleteSession: async (sessionId: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/chat/sessions/${sessionId}`);
    return response.data;
  },

  sendMessage: async (
    message: string,
    sessionId?: number,
    context?: string,
    resourceId?: number
  ): Promise<SendMessageResponse> => {
    const response = await api.post<SendMessageResponse>('/api/chat/send', {
      message,
      session_id: sessionId,
      context,
      resource_id: resourceId,
    });
    return response.data;
  },
};

export const resourceAPI = {
  list: async (): Promise<{ resources: ResourceFile[] }> => {
    const response = await api.get<{ resources: ResourceFile[] }>('/api/resources');
    return response.data;
  },

  upload: async (file: File): Promise<ResourceFile & { content_length: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ResourceFile & { content_length: number }>(
      '/api/resources/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/resources/${id}`);
  },
};

// Admin API
export const adminAPI = {
  getStats: async (): Promise<AdminStats> => {
    const response = await api.get<AdminStats>('/api/admin/stats');
    return response.data;
  },
};

// Lesson Plans API
export const lessonPlanAPI = {
  list: async (): Promise<{ resources: LessonPlan[] }> => {
    const response = await api.get<LessonPlan[]>('/api/lesson-plans');
    return { resources: response.data };
  },

  create: async (title: string, instructions: string, resourceFileId?: number): Promise<LessonPlan> => {
    const response = await api.post<LessonPlan>('/api/lesson-plans', {
      title,
      instructions,
      resourceFileId,
    });
    return response.data;
  },

  update: async (id: number, title: string, instructions: string, resourceFileId?: number): Promise<LessonPlan> => {
    const response = await api.put<LessonPlan>(`/api/lesson-plans/${id}`, {
      title,
      instructions,
      resourceFileId,
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/lesson-plans/${id}`);
  },
};

// Notes API
export const notesAPI = {
  list: async (): Promise<Note[]> => {
    const response = await api.get<Note[]>('/api/notes');
    return response.data;
  },

  create: async (title: string, content: string): Promise<Note> => {
    const response = await api.post<Note>('/api/notes', { title, content });
    return response.data;
  },

  update: async (id: number, title: string, content: string): Promise<Note> => {
    const response = await api.put<Note>(`/api/notes/${id}`, { title, content });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/notes/${id}`);
  },
};

// Calendar Events API
export const calendarEventsAPI = {
  list: async (): Promise<CalendarEvent[]> => {
    const response = await api.get<CalendarEvent[]>('/api/calendar/events');
    return response.data;
  },

  create: async (date: string, title: string): Promise<CalendarEvent> => {
    const response = await api.post<CalendarEvent>('/api/calendar/events', { date, title });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/calendar/events/${id}`);
  },
};

// Calendar Classes API
export const calendarClassesAPI = {
  list: async (): Promise<CalendarClass[]> => {
    const response = await api.get<CalendarClass[]>('/api/calendar/classes');
    return response.data;
  },

  create: async (name: string, date: string, timeFrom: string, timeTo: string, room?: string): Promise<CalendarClass> => {
    const response = await api.post<CalendarClass>('/api/calendar/classes', {
      name,
      date,
      timeFrom,
      timeTo,
      room,
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/calendar/classes/${id}`);
  },
};

// Assignments API
export const assignmentsAPI = {
  list: async (): Promise<Assignment[]> => {
    const response = await api.get<Assignment[]>('/api/assignments');
    return response.data;
  },

  create: async (title: string, dueDate: string, className?: string): Promise<Assignment> => {
    const response = await api.post<Assignment>('/api/assignments', {
      title,
      dueDate,
      className,
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/assignments/${id}`);
  },
};

// Teacher Preferences API
export const preferencesAPI = {
  get: async (): Promise<TeacherPreferences> => {
    const response = await api.get<TeacherPreferences>('/api/preferences');
    return response.data;
  },

  update: async (preferences: TeacherPreferences): Promise<TeacherPreferences> => {
    const response = await api.put<TeacherPreferences>('/api/preferences', preferences);
    return response.data;
  },
};

export default api;
