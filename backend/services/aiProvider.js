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
 *
 * CRITICAL: Qwen3 4B has a built-in "thinking" mode where it generates internal
 * chain-of-thought reasoning inside a <think> block before producing the actual
 * user-facing answer. Without intervention:
 *   - All generated tokens go to message.thinking, leaving message.content empty
 *   - The num_predict budget is exhausted on thinking, never reaching the answer
 *   - Previous fallback code tried to extract answers from thinking using fragile
 *     regex patterns, which leaked raw reasoning to users when the patterns failed
 *
 * Fix: Set think:false in the Ollama payload to disable thinking mode entirely.
 * This forces all generated tokens into message.content as the direct answer.
 */
/**
 * Strips internal chain-of-thought deliberation, rule-evaluations, and think tags.
 * Returns only the clean citizen-facing answer, or empty string if only reasoning was generated.
 */
function cleanAssistantContent(raw) {
  if (!raw || typeof raw !== 'string') return '';

  // 1. Defensively strip tagged think blocks
  let text = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();

  // 2. Look for explicit transitions from thought to final draft / answer
  const transitionMatch = text.match(/(?:(?:Draft|Let's write|We write|Let's craft|Here is the (?:response|answer)|Final answer|We output):\s*)([\s\S]+)$/i);
  if (transitionMatch && transitionMatch[1] && transitionMatch[1].trim().length > 10) {
    text = transitionMatch[1].trim();
  }

  // 3. Strip trailing thought artifacts
  text = text
    .replace(/\n*\s*(?:Word count|My draft has|Word limit|Target length)[\s\S]*$/i, '')
    .trim();

  // 4. Filter lines: remove internal planning bullets and stop when trailing reasoning starts
  const lines = text.split('\n');
  const validLines = [];
  let reachedActualAnswer = false;

  const planningPatterns = /(?:(?:First|Second|Third|One|Two)\s+bullet|One for |One key difference|Then, provide|We must|The user's question|Also, note|Since the user|However, note|Let's extract|so we don't have to|implies it\?|service notice says|checks requirements|checks rules|Key points to hit|Do NOT invent|Answer directly in \d|No preamble|Start directly with|so we stick to|The query is just|Important:|Do not include any thinking)/i;
  const trailingReasoningStart = /^(?:We must|The user's question|Also, note|Since the user|However, note|Let's extract|Wait,|Hmm,|Okay,|\d+\.\s+(?:Since|We note|Also|We output|We must|For evening)|Important:)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (reachedActualAnswer && trailingReasoningStart.test(trimmed)) {
      break;
    }

    if (planningPatterns.test(trimmed)) {
      continue;
    }

    const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*');
    if (isBullet) {
      // Must contain actual content/data/advice, not deliberation
      const isActualContent = /(?:°C|temperature|feels like|humidity|sky|condition|rain|precipitation|wind|heat index|wet-bulb|risk|hydrate|water|ors|cotton|rest|breaks|precaution|available|emergency|108|102)/i.test(trimmed);
      if (isActualContent) {
        reachedActualAnswer = true;
        validLines.push(trimmed);
      }
    } else if (/^(?:In |Current |Today|Live weather|Please |Heat Index |Wet-Bulb |⚠️|ℹ️)/i.test(trimmed)) {
      reachedActualAnswer = true;
      validLines.push(trimmed);
    } else if (reachedActualAnswer) {
      validLines.push(trimmed);
    }
  }

  if (validLines.length === 0) {
    return '';
  }

  return validLines.join('\n').trim();
}

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
  // Configured for Intel i3 CPU inference: 180-250 tokens prevents long generation hangs
  const numPredict = parseInt(process.env.OLLAMA_NUM_PREDICT, 10) || 250;
  // Configurable request timeout: defaults to 90 seconds
  const timeoutMs = parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 90000;
  // Keep model in memory for 10 minutes to eliminate 15-30s cold-start model load time
  const keepAlive = process.env.OLLAMA_KEEP_ALIVE || '10m';

  // Build the message stream starting with the system prompt
  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const toolsExecuted = [];
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations += 1;
    const reqStartTime = Date.now();

    try {
      // Disable Qwen3's thinking mode so all generated tokens go to message.content.
      // Set keep_alive to 10 minutes to keep model loaded on CPU across citizen queries.
      const payload = {
        model,
        messages: conversation,
        stream: false,
        think: false,
        keep_alive: keepAlive,
        options: {
          num_ctx: numCtx,
          num_predict: numPredict,
          temperature: 0.1,
        },
      };

      if (process.env.OLLAMA_ENABLE_TOOLS === 'true' && tools && tools.length > 0) {
        payload.tools = tools;
      }

      const response = await axios.post(`${baseUrl}/api/chat`, payload, {
        timeout: timeoutMs,
        headers: { 'Content-Type': 'application/json' },
      });

      const elapsedMs = Date.now() - reqStartTime;
      const rData = response.data || {};
      const loadDurationMs = rData.load_duration ? Math.round(rData.load_duration / 1e6) : null;
      const promptTokens = rData.prompt_eval_count || null;
      const outputTokens = rData.eval_count || null;
      const evalDurationMs = rData.eval_duration ? Math.round(rData.eval_duration / 1e6) : null;
      const tokensPerSec = (outputTokens && evalDurationMs) ? parseFloat(((outputTokens / evalDurationMs) * 1000).toFixed(1)) : null;

      // Safe timing telemetry: no citizen messages or secrets logged
      console.log(`[AIProvider Ollama] Completed in ${(elapsedMs / 1000).toFixed(1)}s (load: ${loadDurationMs !== null ? (loadDurationMs / 1000).toFixed(1) + 's' : 'warm'}, prompt: ${promptTokens || '?'} tok, eval: ${outputTokens || '?'} tok @ ${tokensPerSec || '?'} tok/s)`);

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

      // Clean message content: strip thinking tags and internal reasoning
      const cleanContent = cleanAssistantContent(assistantMessage.content || '');

      return {
        success: Boolean(cleanContent),
        content: cleanContent,
        model: response.data.model || model,
        provider: 'ollama',
        toolsExecuted,
        diagnostics: {
          durationMs: elapsedMs,
          loadDurationMs,
          promptTokens,
          outputTokens,
          evalDurationMs,
          tokensPerSec,
        },
      };
    } catch (err) {
      const elapsedMs = Date.now() - reqStartTime;
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      const isConnRefused = err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED');
      const isNotFound = err.response?.status === 404 || err.message?.includes('404') || err.message?.includes('not found');

      console.error(`[AIProvider Ollama Failure] Type: ${err.code || (isTimeout ? 'TIMEOUT' : 'ERROR')} | Duration: ${(elapsedMs / 1000).toFixed(1)}s | Model: ${model}`);

      let statusCode = 502;
      let userFriendlyMessage = 'Local AI service encountered an error. Please try again.';

      if (isConnRefused) {
        statusCode = 503;
        userFriendlyMessage = `Local Ollama service is unreachable at ${baseUrl}. Please ensure Ollama is running locally with 'ollama serve'.`;
      } else if (isNotFound) {
        statusCode = 503;
        userFriendlyMessage = `Model "${model}" was not found in local Ollama. Please run 'ollama pull ${model}' in your terminal.`;
      } else if (isTimeout) {
        statusCode = 504;
        userFriendlyMessage = 'Local AI generation timed out. Your CPU may be under heavy load. Please retry with a shorter prompt.';
      }

      const normalizedErr = new Error(userFriendlyMessage);
      normalizedErr.status = statusCode;
      normalizedErr.originalCode = isTimeout ? 'TIMEOUT' : (err.code || err.response?.status || 'OLLAMA_ERROR');
      normalizedErr.durationMs = elapsedMs;
      normalizedErr.timeoutMs = timeoutMs;
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

      const cleanContent = cleanAssistantContent(assistantMessage.content || '');

      return {
        success: Boolean(cleanContent),
        content: cleanContent,
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
