import Anthropic from '@anthropic-ai/sdk';

export interface TokenUsage {
  inputTokens: number;
  outputTokens?: number;
  totalTokens: number;
  messageCount: number;
}

// Initialize Anthropic client for token counting
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function countTokens(messages: Array<{ role: string; content: string }>, model: string = 'claude-sonnet-4-20250514'): Promise<number> {
  try {
    // Use Anthropic's official token counting (correct method name)
    const response = await anthropic.messages.countTokens({
      model,
      messages: messages as any[],
    });
    
    return response.input_tokens;
  } catch (error) {
    console.error('Error counting tokens with Anthropic API:', error);
    // Fallback estimation: roughly 4 characters per token
    let totalChars = 0;
    for (const message of messages) {
      totalChars += message.content.length;
    }
    return Math.ceil(totalChars / 4);
  }
}

export async function calculateContextUsage(messages: Array<{ role: string; content: string }>, model: string = 'claude-sonnet-4-20250514'): Promise<TokenUsage> {
  const messageCount = messages.length;
  
  try {
    const inputTokens = await countTokens(messages, model);
    
    return {
      inputTokens,
      totalTokens: inputTokens,
      messageCount
    };
  } catch (error) {
    console.error('Error calculating token usage:', error);
    // Fallback calculation
    let totalChars = 0;
    for (const message of messages) {
      totalChars += message.content.length;
    }
    const estimatedTokens = Math.ceil(totalChars / 4);
    
    return {
      inputTokens: estimatedTokens,
      totalTokens: estimatedTokens,
      messageCount
    };
  }
}

export function formatTokenUsage(usage: TokenUsage): string {
  if (usage.outputTokens) {
    return `${usage.totalTokens} tokens (${usage.inputTokens} in, ${usage.outputTokens} out, ${usage.messageCount} messages)`;
  }
  return `${usage.inputTokens} input tokens (${usage.messageCount} messages)`;
}