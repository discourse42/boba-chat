import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider, useChat } from './contexts/ChatContext';
import { LoginForm } from './components/LoginForm';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import './App.css';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    sessions,
    currentSession,
    loadSessions,
    loadSession,
    createNewSession,
    deleteSession,
  } = useChat();
  
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <button 
        className="sidebar-toggle"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
      >
{sidebarCollapsed ? '>' : '<'}
      </button>
      <Sidebar
        sessions={sessions}
        currentSession={currentSession}
        onSessionSelect={loadSession}
        onNewSession={createNewSession}
        onDeleteSession={deleteSession}
        onLoadSessions={loadSessions}
        collapsed={sidebarCollapsed}
      />
      <main className="main-content">
        <ChatInterface />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppContent />
      </ChatProvider>
    </AuthProvider>
  );
};

export default App;
