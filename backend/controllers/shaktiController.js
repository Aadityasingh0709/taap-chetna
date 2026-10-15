/**
 * shaktiController.js
 * Controller handling Shakti conversational AI endpoints.
 * 
 * Enforces request validation, rate limiting, context truncation,
 * and safe error shielding.
 */

const asyncHandler = require('express-async-handler');
const { generateChatResponse, getProviderStatus } = require('../services/aiProvider');
const { SHAKTI_SYSTEM_PROMPT } = require('../services/shaktiSystemPrompt');
const { SHAKTI_TOOL_DEFINITIONS, executeShaktiTool } = require('../services/shaktiTools');

// Lightweight in-memory rate-limiter (per IP window: 20 requests / 60 seconds)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 25;

function checkRateLimit(clientIp) {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIp);

  if (!entry || now - entry.startTime > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(clientIp, { count: 1, startTime: now });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Clean up stale rate-limit records every 5 minutes (unref to avoid hanging tests)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now - data.startTime > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

/**
 * GET /api/shakti/status
 * Returns non-sensitive health & configuration status of the AI provider.
 */
const getStatus = asyncHandler(async (req, res) => {
  const status = getProviderStatus();
  res.json({
    status: 'OK',
    assistant: 'Shakti (शक्ति)',
    provider: status.provider,
    configured: status.configured,
    model: status.model,
    toolsSupported: SHAKTI_TOOL_DEFINITIONS.map((t) => t.function.name),
  });
});

/**
 * POST /api/shakti/chat
 * Primary conversation endpoint.
 */
const chat = asyncHandler(async (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

  // 1. Rate Limiting Check
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      message: 'You have sent multiple messages in a short time. Please wait a moment before sending another.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  // 2. Body & Messages Validation
  const { messages, locale = 'en' } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      message: 'Request must include a non-empty "messages" array.',
      code: 'INVALID_MESSAGES',
    });
  }

  // Bounded context window: max 12 recent messages to prevent token bloat
  const recentMessages = messages.slice(-12);

  // Validate individual message structures
  const sanitizedMessages = [];
  for (const msg of recentMessages) {
    if (!msg || typeof msg !== 'object') {
      return res.status(400).json({
        message: 'Invalid message object in conversation stream.',
        code: 'MALFORMED_MESSAGE',
      });
    }

    const role = (msg.role || '').toLowerCase();
    if (role !== 'user' && role !== 'assistant') {
      return res.status(400).json({
        message: `Invalid message role "${msg.role}". Only "user" and "assistant" are permitted.`,
        code: 'INVALID_ROLE',
      });
    }

    const content = typeof msg.content === 'string' ? msg.content.trim() : '';
    if (content.length > 1500) {
      return res.status(400).json({
        message: 'Message content exceeds maximum allowed character limit (1500 chars).',
        code: 'MESSAGE_TOO_LONG',
      });
    }

    sanitizedMessages.push({ role, content });
  }

  // Verify the latest message is from the user and not empty
  const latestMessage = sanitizedMessages[sanitizedMessages.length - 1];
  if (!latestMessage || latestMessage.role !== 'user' || latestMessage.content.length === 0) {
    return res.status(400).json({
      message: 'Latest conversation entry must be a non-empty message from the user.',
      code: 'EMPTY_USER_MESSAGE',
    });
  }

  // 3. Optional contextual hint if user preferred Hindi
  let dynamicSystemPrompt = SHAKTI_SYSTEM_PROMPT;
  if (locale === 'hi') {
    dynamicSystemPrompt += '\n\n[Citizen Preferred Locale: Hindi. Please respond predominantly in Hindi (देवनागरी).]';
  }

  // 4. Generate AI Completion via Provider
  try {
    const aiResponse = await generateChatResponse({
      messages: sanitizedMessages,
      systemPrompt: dynamicSystemPrompt,
      tools: SHAKTI_TOOL_DEFINITIONS,
      executeTool: executeShaktiTool,
    });

    res.json({
      message: aiResponse.content,
      model: aiResponse.model,
      toolCallsExecuted: aiResponse.toolsExecuted || [],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      message: err.message || 'Shakti encountered an error while formulating guidance. Please try again.',
      code: err.originalCode || 'AI_PROVIDER_ERROR',
    });
  }
});

module.exports = {
  getStatus,
  chat,
};
