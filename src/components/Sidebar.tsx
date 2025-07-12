import React, { useEffect } from 'react';
import type { Session } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  sessions: Session[];
  currentSession: Session | null;
  onSessionSelect: (sessionId: string) => void; // Kept for compatibility
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onLoadSessions: () => void;
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSession,
  onSessionSelect: _, // Unused but kept for interface compatibility
  onNewSession,
  onDeleteSession,
  onLoadSessions,
  collapsed = false,
}) => {
  const { logout } = useAuth();

  useEffect(() => {
    onLoadSessions();
  }, [onLoadSessions]);

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this session?')) {
      onDeleteSession(sessionId);
    }
  };

  const formatDate = (dateString: string) => {
    // Ensure UTC timestamp is properly parsed by adding 'Z' if not present
    const utcTimestamp = dateString + (dateString.includes('Z') ? '' : 'Z');
    const date = new Date(utcTimestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', timeZone: 'America/Los_Angeles' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' });
    }
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button className="new-chat-button" onClick={() => {
          console.log('=== New Chat button clicked ===');
          onNewSession();
        }}>
          <span className="icon">+</span>
          New Chat
        </button>
      </div>

      <div className="sessions-list">
        <h3>Recent Sessions</h3>
        <div className="sessions-warning">
          ⚠️ All conversations are visible to anyone using this login
        </div>
        {sessions.length === 0 ? (
          <div className="no-sessions">No conversations yet</div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
              onClick={() => {
                // Open session viewer in new tab
                window.open(`/session-viewer.html?session=${encodeURIComponent(session.id)}`, '_blank');
              }}
            >
              <div className="session-content">
                <div className="session-title">{session.title}</div>
                <div className="session-date">{formatDate(session.updated_at)}</div>
              </div>
              <button
                className="delete-session"
                onClick={(e) => handleDeleteSession(e, session.id)}
                title="Delete session"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <button className="logout-button" onClick={logout}>
          Sign Out
        </button>
      </div>
    </div>
  );
};