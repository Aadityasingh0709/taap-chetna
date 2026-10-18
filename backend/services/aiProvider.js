/**
 * aiProvider.js
 * Provider abstraction layer for conversational AI.
 * 
 * Supports:
 *  1. Local Ollama inference (e.g., Qwen3 4B on http://127.0.0.1:11434)
 *  2. Cloud GroqCloud inference (via groq-sdk)
 * 
 * Controlled via environment variable:
 *  AI_PROVIDER=ollama (default) | groq
 */

const axios = require('axios');
const Groq = require('groq-sdk');

const DEFAULT_GROQ_MODEL = 'qwen/qwen3.8-27b';
const DEFAULT_OLLAMA_MODEL = 'qwen3:4b';
const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';

/**
 * Validates and returns active AI provider configuration.
 */
function getProviderStatus() {
  const provider = (process.env.AI_PROVIDER || 'ollama').trim().toLowerCase();

  if (provider === 'groq') {
    const hasKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
    const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
    return {
      provider: 'groq',
      configured: hasKey,
      model,
    };
  }

  // Default: Ollama local instance
  const baseUrl = (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, '');
  const model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

  return {
    provider: 'ollama',
    configured: true,
    model,
    baseUrl,
  };
}

/**
 * Initializes the Groq client.
 */
function getGroqClient() {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    const error = new Error('AI service is not configured. Please set GROQ_API_KEY in the backend environment.');
    error.status = 503;
    error.code = 'CONFIG_MISSING';
    throw error;
  }

  return new Groq({ apiKey });
}

/**
 * Submits a conversation to the active provider (Ollama or Groq) with optional tool execution.
 * 
 * @param {Object} options
 * @param {Array} options.messages - Sanitized chat messages [{ role, content }]
 * @param {string} options.systemPrompt - Instructions for assistant persona and rules
 * @param {Array} [options.tools] - Approved tool definitions
 * @param {Function} [options.executeTool] - Function to run a tool server-side (name, args) => Promise<Object>
 * @param {number} [options.maxIterations=3] - Maximum tool call loops
 */
async function generateChatResponse(options) {
  const provider = (process.env.AI_PROVIDER || 'ollama').trim().toLowerCase();

  if (provider === 'groq') {
    return generateGroqResponse(options);
  }

  return generateOllamaResponse(options);
}

/**
 * Local Ollama chat completion using native POST /api/chat.
 */
async function generateOllamaResponse({
  messages = [],
  systemPrompt,
  tools = [],
  executeTool,
  maxIterations = 3,
}) {
  const baseUrl = (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, '');
  const model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
  const numCtx = parseInt(process.env.OLLAMA_NUM_CTX, 10) || 4096;
  const numPredict = parseInt(process.env.OLLAMA_NUM_PREDICT, 10) || 500;

  // Build the message stream starting with the system prompt
  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const toolsExecuted = [];
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations += 1;

    try {
      // Important: do not include the "think" field in the request.
      const payload = {
        model,
        messages: conversation,
        stream: false,
        options: {
          num_ctx: numCtx,
          num_predict: numPredict,
          temperature: 0.2,
        },
      };

      if (process.env.OLLAMA_ENABLE_TOOLS === 'true' && tools && tools.length > 0) {
        payload.tools = tools;
      }

      const response = await axios.post(`${baseUrl}/api/chat`, payload, {
        timeout: 180000, // 180s timeout for CPU inference
        headers: { 'Content-Type': 'application/json' },
      });

      const assistantMessage = response.data && response.data.message;
      if (!assistantMessage) {
        throw new Error('Ollama returned an empty response object.');
      }

      conversation.push(assistantMessage);

      // Check if Ollama requested function / tool calls
      const toolCalls = assistantMessage.tool_calls;
      if (toolCalls && toolCalls.length > 0 && typeof executeTool === 'function') {
        for (const call of toolCalls) {
          const fnName = call.function?.name;
          const fnArgs = call.function?.arguments;

          toolsExecuted.push({
            id: call.id || `call_${Date.now()}`,
            tool: fnName,
          });

          let toolResult;
          try {
            toolResult = await executeTool(fnName, fnArgs);
          } catch (tErr) {
            toolResult = {
              success: false,
              error: `Tool execution failed: ${tErr.message}`,
            };
          }

          conversation.push({
            role: 'tool',
            content: JSON.stringify(toolResult),
          });
        }
        // Iterate to allow model to synthesize final answer from tool outputs
        continue;
      }

      // Clean message content: strip any lingering think blocks
      let cleanContent = (assistantMessage.content || '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .trim();

      // If content was empty, check if reasoning concluded in thinking
      if (!cleanContent && assistantMessage.thinking) {
        const thinkingClean = assistantMessage.thinking
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .trim();
        // Look for drafted final answer in quotes or after "response:" / "draft:"
        const draftMatch = thinkingClean.match(/(?:response|draft|final response|answer):\s*["'“]([\s\S]*?)["'”]/i) ||
                           thinkingClean.match(/["'“](Today in [^"'”]+|In [A-Z][a-zA-Z\s]+, [^"'”]+)["'”]/i);
        if (draftMatch && draftMatch[1]) {
          cleanContent = draftMatch[1].trim();
        } else {
          // Take the last paragraph of thinking as concluding answer
          const paragraphs = thinkingClean.split('\n\n').map(p => p.trim()).filter(Boolean);
          const lastPara = paragraphs[paragraphs.length - 1];
          if (lastPara && lastPara.length > 20 && !lastPara.toLowerCase().startsWith('let')) {
            cleanContent = lastPara;
          } else if (thinkingClean.length > 30) {
            cleanContent = thinkingClean;
          }
        }
      }

      // Safe handling if model returned completely empty response
      if (!cleanContent) {
        cleanContent = 'I apologize, but I could not formulate a complete response to your query. Please ask your question again or check the live dashboard.';
      }

      return {
        success: true,
        content: cleanContent,
        model: response.data.model || model,
        provider: 'ollama',
        toolsExecuted,
      };
    } catch (err) {
      console.error('[AIProvider Ollama Error]:', err.message || err);

      let statusCode = 502;
      let userFriendlyMessage = 'Local AI service encountered an error. Please try again.';

      if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
        statusCode = 503;
        userFriendlyMessage = `Local Ollama service is unreachable at ${baseUrl}. Please ensure Ollama is running locally with 'ollama serve'.`;
      } else if (err.response?.status === 404 || err.message?.includes('404') || err.message?.includes('not found')) {
        statusCode = 503;
        userFriendlyMessage = `Model "${model}" was not found in local Ollama. Please run 'ollama pull ${model}' in your terminal.`;
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        statusCode = 504;
        userFriendlyMessage = 'Local AI generation timed out. Your CPU may be under heavy load. Please retry with a shorter prompt.';
      }

      const normalizedErr = new Error(userFriendlyMessage);
      normalizedErr.status = statusCode;
      normalizedErr.originalCode = err.code || err.response?.status || 'OLLAMA_ERROR';
      throw normalizedErr;
    }
  }

  return {
    success: true,
    content: 'I gathered data for your query, but reached maximum tool iterations. Please ask a more specific follow-up question.',
    model,
    provider: 'ollama',
    toolsExecuted,
  };
}

/**
 * Cloud GroqCloud chat completion (retained for dual-provider support).
 */
async function generateGroqResponse({
  messages = [],
  systemPrompt,
  tools = [],
  executeTool,
  maxIterations = 3,
}) {
  const client = getGroqClient();
  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const toolsExecuted = [];
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations += 1;

    try {
      const payload = {
        model,
        messages: conversation,
        temperature: 0.4,
        max_tokens: 1024,
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      const response = await client.chat.completions.create(payload);
      const choice = response.choices && response.choices[0];
      if (!choice || !choice.message) {
        throw new Error('Groq returned an empty completion response.');
      }

      const assistantMessage = choice.message;
      conversation.push(assistantMessage);

      const toolCalls = assistantMessage.tool_calls;
      if (toolCalls && toolCalls.length > 0 && typeof executeTool === 'function') {
        for (const call of toolCalls) {
          const fnName = call.function?.name;
          const fnArgs = call.function?.arguments;

          toolsExecuted.push({
            id: call.id,
            tool: fnName,
          });

          let toolResult;
          try {
            toolResult = await executeTool(fnName, fnArgs);
          } catch (tErr) {
            toolResult = {
              success: false,
              error: `Tool execution failed: ${tErr.message}`,
            };
          }

          conversation.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(toolResult),
          });
        }
        continue;
      }

      return {
        success: true,
        content: assistantMessage.content || '',
        model: response.model || model,
        provider: 'groq',
        toolsExecuted,
        usage: response.usage,
      };
    } catch (err) {
      console.error('[AIProvider Groq Error]:', err.message || err);

      let statusCode = 502;
      let userFriendlyMessage = 'The AI service encountered an error. Please try again.';

      if (err.status === 401 || err.message?.includes('401') || err.message?.includes('Invalid API Key')) {
        statusCode = 503;
        userFriendlyMessage = 'Authentication with the AI provider failed. Please verify the GROQ_API_KEY in the backend configuration.';
      } else if (err.status === 404 || err.message?.includes('model_not_found') || err.message?.includes('404')) {
        statusCode = 503;
        userFriendlyMessage = `Configured model "${model}" is currently unavailable on Groq. Please configure a supported GROQ_MODEL in .env.`;
      } else if (err.status === 429 || err.message?.includes('rate_limit') || err.message?.includes('429')) {
        statusCode = 429;
        userFriendlyMessage = 'AI service capacity is currently saturated. Please wait a few seconds before asking another question.';
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        statusCode = 504;
        userFriendlyMessage = 'AI response timed out. Please retry your request.';
      } else if (err.code === 'CONFIG_MISSING') {
        statusCode = 503;
        userFriendlyMessage = err.message;
      }

      const normalizedErr = new Error(userFriendlyMessage);
      normalizedErr.status = statusCode;
      normalizedErr.originalCode = err.code || err.status;
      throw normalizedErr;
    }
  }

  return {
    success: true,
    content: 'I gathered data for your query, but reached maximum tool iterations. Please ask a more specific follow-up question.',
    model,
    provider: 'groq',
    toolsExecuted,
  };
}

module.exports = {
  getProviderStatus,
  generateChatResponse,
};
