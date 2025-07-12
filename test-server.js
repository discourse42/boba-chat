import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Mock data storage
let sessions = [
  {
    id: 'session_1',
    user_id: 1,
    title: 'Welcome Chat',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let messages = [
  {
    id: 1,
    session_id: 'session_1',
    role: 'assistant',
    content: 'Hello! I\'m Claude, your AI assistant. How can I help you today?',
    timestamp: new Date().toISOString()
  }
];

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test server working' });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password });
  
  if (username === 'admin' && password === 'claudechat2025') {
    res.json({ 
      token: 'test-token',
      user: { id: 1, username: 'admin' }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/verify', (req, res) => {
  const { token } = req.body;
  if (token === 'test-token') {
    res.json({ 
      valid: true,
      user: { id: 1, username: 'admin' }
    });
  } else {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Sessions endpoints
app.get('/api/sessions', (req, res) => {
  console.log('Getting sessions');
  res.json(sessions);
});

app.get('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  console.log('Getting session:', sessionId);
  
  const session = sessions.find(s => s.id === sessionId);
  const sessionMessages = messages.filter(m => m.session_id === sessionId);
  
  if (session) {
    console.log(`Found session with ${sessionMessages.length} messages`);
    res.json({ session, messages: sessionMessages });
  } else {
    console.log('Session not found:', sessionId);
    res.status(404).json({ error: 'Session not found' });
  }
});

app.post('/api/sessions', (req, res) => {
  const { title } = req.body;
  const newSession = {
    id: `session_${Date.now()}`,
    user_id: 1,
    title: title || 'New Chat',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  sessions.unshift(newSession);
  res.status(201).json(newSession);
});

// Chat streaming endpoint
app.post('/api/chat/stream', async (req, res) => {
  const { message, sessionId } = req.body;
  console.log('=== CHAT REQUEST ===');
  console.log('Message:', message);
  console.log('SessionId:', sessionId);

  // Set up streaming response
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  });

  let currentSessionId = sessionId;
  
  // Create new session if none provided
  if (!currentSessionId) {
    const newSession = {
      id: `session_${Date.now()}`,
      user_id: 1,
      title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    sessions.unshift(newSession);
    currentSessionId = newSession.id;
    
    res.write(`data: ${JSON.stringify({ type: 'sessionId', sessionId: currentSessionId })}\n\n`);
  }

  // Add user message to storage
  messages.push({
    id: messages.length + 1,
    session_id: currentSessionId,
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  });

  // Send start event
  res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

  try {
    // Get conversation history for this session
    const sessionMessages = messages.filter(m => m.session_id === currentSessionId);
    const conversationHistory = sessionMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Make request to Anthropic API
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: conversationHistory,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        stream: true
      })
    });

    if (!anthropicResponse.ok) {
      throw new Error(`Anthropic API error: ${anthropicResponse.status}`);
    }

    let assistantResponse = '';
    const reader = anthropicResponse.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              res.write('data: [DONE]\n\n');
              break;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                assistantResponse += parsed.delta.text;
                res.write(`data: ${JSON.stringify({ type: 'content', content: parsed.delta.text })}\n\n`);
              } else if (parsed.type === 'message_start') {
                // Already sent start event
              } else if (parsed.type === 'message_stop') {
                res.write(`data: ${JSON.stringify({ type: 'stop' })}\n\n`);
              }
            } catch (parseError) {
              console.error('Failed to parse Anthropic response:', parseError);
            }
          }
        }
      }
    }

    // Save assistant response
    if (assistantResponse.trim()) {
      messages.push({
        id: messages.length + 1,
        session_id: currentSessionId,
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to get response from Claude: ' + error.message })}\n\n`);
  } finally {
    res.end();
    console.log('Stream ended');
  }
});

// Prompts endpoints
app.get('/api/prompts', (req, res) => {
  res.json([
    { name: 'default', filename: 'default.md' }
  ]);
});

app.get('/api/prompts/:name', (req, res) => {
  res.json({
    name: req.params.name,
    content: 'You are Claude, a helpful AI assistant.'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on http://0.0.0.0:${PORT}`);
});