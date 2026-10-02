export type TaskCategory = 'school' | 'dev' | 'side' | 'life';
export type TaskPriority = 'high' | 'normal' | 'low';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  due: string | null;
  priority: TaskPriority;
  category: TaskCategory;
  sort_order: number;
  created_at: string;
  done_at: string | null;
}

export interface Weather {
  place: string;
  now: { temp: number; label: string; icon: string; wind: number };
  today: { max: number; min: number; rainChance: number | null; label: string; icon: string };
  source: string;
}

export interface TodayInfo {
  date: string;
  items: { name: string; note: string }[];
  sourceUrl: string;
}

export interface TimetableSlot {
  id: string;
  weekday: number;
  period: number;
  subject: string;
  memo: string | null;
}

export interface Part<T> {
  data: T | null;
  error: string | null;
}

export interface Dashboard {
  date: string;
  weekday: number;
  weather: Part<Weather>;
  todayInfo: Part<TodayInfo>;
  hitokoto: Part<string>;
  tasks: Part<Task[]>;
  timetable: Part<TimetableSlot[]>;
  devProgress: { done: number; total: number } | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  school: '学校',
  dev: '開発',
  side: '副業',
  life: '生活',
};
