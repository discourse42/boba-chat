import type { User, Session, Message, StreamEvent } from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('boba-chat-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`);
  }
  return response.json();
};

// Auth API
export const authService = {
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
  },

  async verifyToken(token: string): Promise<{ user: User }> {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return handleResponse(response);
  },
};

// Sessions API
export const sessionService = {
  async getSessions(): Promise<Session[]> {
    const response = await fetch(`${API_BASE}/sessions`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getSession(sessionId: string): Promise<{ session: Session; messages: Message[] }> {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async createSession(title: string): Promise<Session> {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ title }),
    });
    return handleResponse(response);
  },

  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete session');
    }
  },
};

// Chat API
export const chatService = {
  async* streamChat(message: string, sessionId?: string): AsyncGenerator<StreamEvent> {
    console.log('=== FRONTEND: Starting streamChat ===');
    console.log('Message:', message);
    console.log('SessionId:', sessionId);
    console.log('Auth headers:', getAuthHeaders());
    
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ message, sessionId }),
    });
    
    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, errorData.error || 'Failed to start chat stream');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            console.log('Processing line:', data);
            
            if (data === '[DONE]') {
              console.log('Stream finished with [DONE]');
              return;
            }

            try {
              const event: StreamEvent = JSON.parse(data);
              console.log('Yielding event:', event);
              yield event;
            } catch (error) {
              console.warn('Failed to parse stream event:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};

// Prompts API
export const promptService = {
  async getPrompts(): Promise<{ name: string; filename: string }[]> {
    const response = await fetch(`${API_BASE}/prompts`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getPrompt(name: string): Promise<{ name: string; content: string }> {
    const response = await fetch(`${API_BASE}/prompts/${name}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};