import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useChat } from '../contexts/ChatContext';

export const ChatInterface: React.FC = () => {
  const {
    messages,
    isStreaming,
    isLoading,
    error,
    sendMessage,
  } = useChat();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getPlaceholder = () => {
    if (isStreaming) return 'Claude is responding...';
    if (isLoading) return 'Loading...';
    if (messages.length === 0) return 'Start a new conversation...';
    return 'Type your message...';
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h1>Boba Chat</h1>
        <div className="model-info">
          Model: claude-sonnet-4-20250514
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !isLoading && (
          <div className="welcome-message">
            <div className="welcome-content">
              <h2>Welcome to Boba Chat</h2>
              <p>A basic Claude chat wrapper</p>
              <p style={{ fontSize: '14px', color: '#666', margin: '10px 0' }}>
                I built this while half-watching that Boba Fett show on Disney. I thought it might be good like Andor, but it was just passable. Kind of like this app.
              </p>
              <p style={{ fontSize: '14px', color: '#999', marginTop: '20px' }}>
                Note: This interface is not yet designed for mobile devices
              </p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <ChatMessage key={`${message.session_id}-${index}`} message={message} />
        ))}

        {isStreaming && messages.length > 0 && (
          <div className="streaming-indicator">
            <span className="typing-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="chat-input-area">
        <ChatInput
          onSendMessage={sendMessage}
          disabled={isStreaming || isLoading}
          placeholder={getPlaceholder()}
        />
      </div>
    </div>
  );
};