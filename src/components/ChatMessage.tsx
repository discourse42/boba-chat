import React from 'react';
import { marked } from 'marked';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

// Configure marked for security and link behavior
marked.setOptions({
  breaks: true,
  gfm: true,
});

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const formatTimestamp = (timestamp: string) => {
    // Ensure UTC timestamp is properly parsed by adding 'Z' if not present
    const utcTimestamp = timestamp + (timestamp.includes('Z') ? '' : 'Z');
    const date = new Date(utcTimestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderContent = () => {
    if (message.role === 'assistant') {
      try {
        let html = marked(message.content);
        // Post-process to add target="_blank" to all links
        html = html.replace(/<a href="([^"]*)"([^>]*)>/g, '<a href="$1" target="_blank" rel="noopener noreferrer"$2>');
        return { __html: html };
      } catch (error) {
        console.error('Error parsing markdown:', error);
        return { __html: message.content };
      }
    } else {
      // For user messages, just preserve line breaks
      const content = message.content.replace(/\n/g, '<br>');
      return { __html: content };
    }
  };

  return (
    <div className={`message ${message.role}`}>
      <div className="message-header">
        <span className="message-role">
          {message.role === 'user' ? 'You' : 'Boba'}
        </span>
        <span className="message-timestamp">
          {formatTimestamp(message.timestamp)}
          {message.role === 'assistant' && message.metadata?.outputTokens && (
            <span className="token-count"> • {message.metadata.inputTokens || 0}/{message.metadata.outputTokens}</span>
          )}
        </span>
      </div>
      <div 
        className="message-content"
        dangerouslySetInnerHTML={renderContent()}
      />
    </div>
  );
};