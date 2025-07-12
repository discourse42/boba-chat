import Anthropic from '@anthropic-ai/sdk';

export interface TokenUsage {
  inputTokens: number;
  outputTokens?: number;
  totalTokens: number;
  messageCount: number;
}

export async function countTokens(messages: Array<{ role: string; content: string }>, model: string = 'claude-sonnet-4-20250514'): Promise<number> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment');
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });
    
    // Use Anthropic's official token counting
    const response = await anthropic.messages.countTokens({
      model,
      messages: messages as any[],
    });
    
    return response.input_tokens;
    
  } catch (error) {
    console.error('Error counting tokens with Anthropic API:', error);
    console.log('Falling back to estimation method');
    
    // Fallback estimation
    let totalTokens = 0;
    for (const message of messages) {
      const content = message.content;
      const estimatedTokens = Math.ceil(content.length / 3.5);
      const messageOverhead = 15;
      totalTokens += estimatedTokens + messageOverhead;
    }
    const systemOverhead = 25;
    totalTokens += systemOverhead;
    
    return totalTokens;
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