import React from 'react';
import { marked } from 'marked';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

// Configure marked for security
marked.setOptions({
  breaks: true,
  gfm: true,
});

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderContent = () => {
    if (message.role === 'assistant') {
      try {
        return { __html: marked(message.content) };
      } catch (error) {
        console.error('Error parsing markdown:', error);
        return { __html: message.content };
      }
    }
    return { __html: message.content };
  };

  return (
    <div className={`message ${message.role}`}>
      <div className="message-header">
        <span className="message-role">
          {message.role === 'user' ? 'You' : 'Boba'}
        </span>
        <span className="message-timestamp">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
      <div 
        className="message-content"
        dangerouslySetInnerHTML={renderContent()}
      />
    </div>
  );
};