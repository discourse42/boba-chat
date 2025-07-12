import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useChat } from '../contexts/ChatContext';

export const ChatInterface: React.FC = () => {
  const {
    messages,
    isStreaming,
    isLoading,
    error,
    tokenUsage,
    sendMessage,
  } = useChat();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingSeconds, setStreamingSeconds] = useState(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Timer for streaming indicator
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isStreaming) {
      setStreamingSeconds(0);
      interval = setInterval(() => {
        setStreamingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setStreamingSeconds(0);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isStreaming]);

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
              <p>A basic Claude Sonnet 4 chat wrapper</p>
              <p style={{ fontSize: '14px', color: '#666', margin: '10px 0', textAlign: 'center' }}>
                <br/>Boba Chat is a chatbot implementation that likes to provide links and <br/>has a tendency to search before speaking.<br/><br/>Why the name? <br/><br/>I built this while half-watching that Boba Fett show on Disney. <br/>I thought it might be good like Andor, but it was just passable. <br/><br/>Kind of like this app, which was a way to teach<br/>myself the Claude API, not to provide a product, <br/> so there you go.
              </p>
              <div style={{ 
                fontSize: '14px', 
                color: '#b8860b', 
                marginTop: '20px',
                backgroundColor: '#fffacd',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '12px 16px',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                ⚠️ Note: This interface is not yet designed for mobile devices
              </div>
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
            <span className="streaming-text">
              Generating...may be some time ({streamingSeconds}s)
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
        {tokenUsage && (
          <div className="token-usage">
            📊 {tokenUsage.outputTokens 
              ? `${tokenUsage.totalTokens} tokens (${tokenUsage.inputTokens} in + ${tokenUsage.outputTokens} out, ${tokenUsage.messageCount} messages)`
              : `${tokenUsage.inputTokens} input tokens (${tokenUsage.messageCount} messages)`
            }
          </div>
        )}
        <ChatInput
          onSendMessage={sendMessage}
          disabled={isStreaming || isLoading}
          placeholder={getPlaceholder()}
        />
      </div>
    </div>
  );
};