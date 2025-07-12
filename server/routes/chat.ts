import express from 'express';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { DatabaseService } from '../services/database';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { calculateContextUsage, formatTokenUsage } from '../utils/tokenCounter';
import type { Response } from 'express';

const router = express.Router();

interface ChatRequest {
  message: string;
  sessionId?: string;
  model?: string;
}

// Chat endpoint with streaming
router.post('/stream', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { message, sessionId, model = 'claude-sonnet-4-20250514' }: ChatRequest = req.body;
  const userId = req.user!.id;

  if (!message?.trim()) {
    throw createError('Message is required', 400);
  }

  let currentSessionId = sessionId;

  // Create new session if none provided
  if (!currentSessionId) {
    const title = message.slice(0, 50).trim() + (message.length > 50 ? '...' : '');
    currentSessionId = await DatabaseService.createSession(userId, title);
  } else {
    // Verify session belongs to user
    const session = await DatabaseService.getSession(currentSessionId);
    if (!session || session.user_id !== userId) {
      throw createError('Session not found or access denied', 404);
    }
  }

  // Save user message
  await DatabaseService.saveMessage(currentSessionId, 'user', message);

  // Get conversation history
  const messages = await DatabaseService.getMessagesBySessionId(currentSessionId);
  const conversationHistory = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // Calculate token usage
  const tokenUsage = await calculateContextUsage(conversationHistory, model);
  console.log(`Token usage: ${formatTokenUsage(tokenUsage)}`);

  // Set up streaming response
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  try {
    // Make request to Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: conversationHistory,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw createError(`Anthropic API error: ${response.status} ${errorData}`, response.status);
    }

    let assistantResponse = '';
    let outputTokens = 0;
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    if (!reader) {
      throw createError('Failed to get response stream', 500);
    }

    // Send session ID and token usage to client
    res.write(`data: ${JSON.stringify({ type: 'sessionId', sessionId: currentSessionId })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'tokenUsage', usage: tokenUsage })}\n\n`);

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          
          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
            break;
          }

          if (data === '') continue;

          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              assistantResponse += parsed.delta.text;
              res.write(`data: ${JSON.stringify({ type: 'content', content: parsed.delta.text })}\n\n`);
            } else if (parsed.type === 'message_start') {
              res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);
            } else if (parsed.type === 'message_delta' && parsed.usage) {
              // Capture output token usage
              outputTokens = parsed.usage.output_tokens || 0;
            } else if (parsed.type === 'message_stop') {
              // Send final token usage with output tokens
              const finalTokenUsage = {
                ...tokenUsage,
                outputTokens,
                totalTokens: tokenUsage.inputTokens + outputTokens
              };
              res.write(`data: ${JSON.stringify({ type: 'finalTokenUsage', usage: finalTokenUsage })}\n\n`);
              res.write(`data: ${JSON.stringify({ type: 'stop' })}\n\n`);
            }
          } catch (parseError) {
            console.error('Failed to parse streaming data:', parseError);
            console.error('Problematic data:', data);
          }
        }
      }
    }

    // Save assistant response
    if (assistantResponse.trim()) {
      await DatabaseService.saveMessage(currentSessionId, 'assistant', assistantResponse);
    }

  } catch (error) {
    console.error('Chat streaming error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to get response from Claude' })}\n\n`);
  } finally {
    res.end();
  }
}));

export { router as chatRoutes };