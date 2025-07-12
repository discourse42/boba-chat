export interface User {
  id: number;
  username: string;
}

export interface Session {
  id: string;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id?: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ChatState {
  currentSession: Session | null;
  sessions: Session[];
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
}

export interface StreamEvent {
  type: 'sessionId' | 'start' | 'content' | 'stop' | 'error';
  sessionId?: string;
  content?: string;
  error?: string;
}