/**
 * aiProvider.js
 * Provider abstraction layer for conversational AI.
 * 
 * Initial implementation uses GroqCloud (via groq-sdk).
 * Designed for future migration to Ollama or local inference without
 * altering application routes, tools, or frontend contracts.
 */

const Groq = require('groq-sdk');

const DEFAULT_MODEL = 'qwen/qwen3.8-27b';

/**
 * Validates whether the AI provider is configured with necessary credentials.
 */
function getProviderStatus() {
  const hasKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  return {
    provider: 'groq',
    configured: hasKey,
    model,
  };
}

/**
 * Initializes the Groq client.
 * Throws a safe, non-sensitive error if the API key is not configured.
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
 * Submits a conversation to Groq with optional tool execution.
 * 
 * @param {Object} options
 * @param {Array} options.messages - Sanitized chat messages [{ role, content }]
 * @param {string} options.systemPrompt - Instructions for assistant persona and rules
 * @param {Array} [options.tools] - Approved tool definitions
 * @param {Function} [options.executeTool] - Function to run a tool server-side (name, args) => Promise<Object>
 * @param {number} [options.maxIterations=3] - Maximum tool call loops to prevent runaway execution
 */
async function generateChatResponse({
  messages = [],
  systemPrompt,
  tools = [],
  executeTool,
  maxIterations = 3,
}) {
  const client = getGroqClient();
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  // Build the message stream starting with the system instructions
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

      // Check if model requested tool execution
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
        // Iterate to allow model to synthesize final answer from tool outputs
        continue;
      }

      // Final assistant response generated
      return {
        success: true,
        content: assistantMessage.content || '',
        model: response.model || model,
        toolsExecuted,
        usage: response.usage,
      };
    } catch (err) {
      // Normalize Groq / network errors into clean, non-sensitive format
      console.error('[AIProvider Error]:', err.message || err);

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

  // Fallback if maxIterations exceeded
  return {
    success: true,
    content: 'I gathered data for your query, but reached maximum tool iterations. Please ask a more specific follow-up question.',
    model,
    toolsExecuted,
  };
}

module.exports = {
  getProviderStatus,
  generateChatResponse,
};
