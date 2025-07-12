import { useReducer, useCallback } from 'react';
import type { ChatState, Message, Session, TokenUsage } from '../types';
import { chatService, sessionService } from '../services/api';

// Utility function to sanitize and truncate user input for session title
const sanitizeTitle = (input: string): string => {
  return input
    .replace(/[^\w\s\-.,!?()]/g, '') // Remove special chars except basic punctuation
    .trim()
    .substring(0, 300) // Limit to 300 characters
    .replace(/\s+/g, ' '); // Normalize whitespace
};

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_STREAMING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SESSIONS'; payload: Session[] }
  | { type: 'SET_CURRENT_SESSION'; payload: Session | null }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_LAST_MESSAGE'; payload: string }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_TOKEN_USAGE'; payload: TokenUsage | null };

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_STREAMING':
      return { ...state, isStreaming: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    case 'SET_CURRENT_SESSION':
      return { ...state, currentSession: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_LAST_MESSAGE': {
      const messages = [...state.messages];
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        const updatedMessage = { ...lastMessage, content: lastMessage.content + action.payload };
        messages[messages.length - 1] = updatedMessage;
      }
      return { ...state, messages };
    }
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], currentSession: null, tokenUsage: null };
    case 'SET_TOKEN_USAGE':
      return { ...state, tokenUsage: action.payload };
    default:
      return state;
  }
};

const initialState: ChatState = {
  currentSession: null,
  sessions: [],
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  tokenUsage: null,
};

export const useChat = () => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const loadSessions = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const sessions = await sessionService.getSessions();
      dispatch({ type: 'SET_SESSIONS', payload: sessions });
    } catch (error) {
      let errorMessage = 'Failed to load sessions';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide helpful guidance for authentication errors
        if (errorMessage.toLowerCase().includes('access token required') || 
            errorMessage.toLowerCase().includes('token') ||
            errorMessage.toLowerCase().includes('unauthorized')) {
          errorMessage += '. Please refresh the page and log in again.';
        }
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const { session, messages } = await sessionService.getSession(sessionId);
      dispatch({ type: 'SET_CURRENT_SESSION', payload: session });
      dispatch({ type: 'SET_MESSAGES', payload: messages });
    } catch (error) {
      let errorMessage = 'Failed to load session';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide helpful guidance for authentication errors
        if (errorMessage.toLowerCase().includes('access token required') || 
            errorMessage.toLowerCase().includes('token') ||
            errorMessage.toLowerCase().includes('unauthorized')) {
          errorMessage += '. Please refresh the page and log in again.';
        }
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    console.log('=== HOOK: sendMessage called ===');
    console.log('Content:', content);
    console.log('Current session:', state.currentSession);
    
    try {
      dispatch({ type: 'SET_STREAMING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Add user message immediately
      const userMessage: Message = {
        session_id: state.currentSession?.id || '',
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      // Stream the response
      console.log('Starting to stream chat...');
      let newSessionId: string | undefined;
      let assistantMessageAdded = false;
      const isFirstMessage = state.messages.length === 0;
      // Check if this is the first non-# message (should update title if no previous non-# messages exist)
      const hasNonCommandMessage = state.messages.some(msg => 
        msg.role === 'user' && !msg.content.trim().startsWith('#')
      );
      const shouldUpdateTitle = !content.trim().startsWith('#') && !hasNonCommandMessage;
      
      for await (const event of chatService.streamChat(content, state.currentSession?.id)) {
        console.log('Received event in hook:', event);
        switch (event.type) {
          case 'sessionId':
            newSessionId = event.sessionId;
            if (!state.currentSession && newSessionId) {
              // Load the new session
              const sessions = await sessionService.getSessions();
              const newSession = sessions.find(s => s.id === newSessionId);
              if (newSession) {
                dispatch({ type: 'SET_CURRENT_SESSION', payload: newSession });
                dispatch({ type: 'SET_SESSIONS', payload: sessions });
                
                // Update session title with sanitized message if it doesn't start with # and title is still "New Session"
                if (shouldUpdateTitle) {
                  try {
                    const sanitizedTitle = sanitizeTitle(content);
                    if (sanitizedTitle) {
                      await sessionService.updateSessionTitle(newSessionId, sanitizedTitle);
                      // Refresh sessions to get updated title
                      const updatedSessions = await sessionService.getSessions();
                      const updatedSession = updatedSessions.find(s => s.id === newSessionId);
                      if (updatedSession) {
                        dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });
                        dispatch({ type: 'SET_SESSIONS', payload: updatedSessions });
                      }
                    }
                  } catch (error) {
                    console.warn('Failed to update session title:', error);
                  }
                }
              }
            } else if (state.currentSession && shouldUpdateTitle && state.currentSession.title === 'New Session') {
              // Update title for existing session if it's the first message, doesn't start with #, and title is still "New Session"
              try {
                const sanitizedTitle = sanitizeTitle(content);
                if (sanitizedTitle) {
                  await sessionService.updateSessionTitle(state.currentSession.id, sanitizedTitle);
                  // Refresh sessions to get updated title
                  const updatedSessions = await sessionService.getSessions();
                  const updatedSession = updatedSessions.find(s => s.id === state.currentSession?.id);
                  if (updatedSession) {
                    dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });
                    dispatch({ type: 'SET_SESSIONS', payload: updatedSessions });
                  }
                }
              } catch (error) {
                console.warn('Failed to update session title:', error);
              }
            }
            break;
          case 'content':
            if (event.content) {
              // Add assistant message on first content
              if (!assistantMessageAdded) {
                const assistantMessage: Message = {
                  session_id: newSessionId || state.currentSession?.id || '',
                  role: 'assistant',
                  content: event.content,
                  timestamp: new Date().toISOString(),
                };
                dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });
                assistantMessageAdded = true;
              } else {
                dispatch({ type: 'UPDATE_LAST_MESSAGE', payload: event.content });
              }
            }
            break;
          case 'tokenUsage':
            if (event.usage) {
              dispatch({ type: 'SET_TOKEN_USAGE', payload: event.usage });
            }
            break;
          case 'finalTokenUsage':
            if (event.usage) {
              dispatch({ type: 'SET_TOKEN_USAGE', payload: event.usage });
            }
            break;
          case 'error':
            dispatch({ type: 'SET_ERROR', payload: event.error || 'Unknown error occurred' });
            break;
        }
      }
    } catch (error) {
      let errorMessage = 'Failed to send message';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide helpful guidance for authentication errors
        if (errorMessage.toLowerCase().includes('access token required') || 
            errorMessage.toLowerCase().includes('token') ||
            errorMessage.toLowerCase().includes('unauthorized')) {
          errorMessage += '. Please refresh the page and log in again.';
        }
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_STREAMING', payload: false });
    }
  }, [state.currentSession?.id]);

  const createNewSession = useCallback(() => {
    console.log('=== Creating new session ===');
    dispatch({ type: 'CLEAR_MESSAGES' });
    dispatch({ type: 'SET_CURRENT_SESSION', payload: null });
    dispatch({ type: 'SET_ERROR', payload: null });
    // Reload sessions to refresh the sidebar
    loadSessions();
  }, [loadSessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await sessionService.deleteSession(sessionId);
      const sessions = state.sessions.filter(s => s.id !== sessionId);
      dispatch({ type: 'SET_SESSIONS', payload: sessions });
      
      if (state.currentSession?.id === sessionId) {
        dispatch({ type: 'CLEAR_MESSAGES' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete session' });
    }
  }, [state.sessions, state.currentSession?.id]);

  return {
    ...state,
    loadSessions,
    loadSession,
    sendMessage,
    createNewSession,
    deleteSession,
  };
};