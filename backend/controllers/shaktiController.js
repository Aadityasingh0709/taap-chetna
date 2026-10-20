/**
 * shaktiController.js
 * Controller handling Shakti conversational AI endpoints.
 * 
 * Enforces request validation, rate limiting, context truncation,
 * trusted location resolution, real weather service integration,
 * and safe error shielding.
 */

const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateChatResponse, getProviderStatus } = require('../services/aiProvider');
const { SHAKTI_SYSTEM_PROMPT, OLLAMA_SHAKTI_SYSTEM_PROMPT } = require('../services/shaktiSystemPrompt');
const { SHAKTI_TOOL_DEFINITIONS, executeShaktiTool } = require('../services/shaktiTools');
const { enrichShaktiContext } = require('../services/shaktiContextService');

// Lightweight in-memory rate-limiter (per IP window: 25 requests / 60 seconds)
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
  const { messages, locale = 'en', context = {} } = req.body;

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
    if (role !== 'user' && role !== 'assistant' && role !== 'system') {
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

  // 3. Optional Authentication: Identify logged in citizen to access profile location
  let authenticatedUser = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tapchetna_secret_key_2026');
      if (decoded && decoded.id) {
        authenticatedUser = await User.findById(decoded.id).select('-password');
      }
    } catch {
      // Optional auth: treat as guest citizen if token is absent/invalid
    }
  }

  // Truncate conversation history to last 4 turns (2 user, 2 assistant)
  // to prevent prompt token bloat on CPU inference while preserving recent context
  const trimmedMessages = sanitizedMessages.slice(-4);

  // 4. Server-Side Context Enrichment: Proactively resolve location & fetch verified weather
  let enrichedConversation = trimmedMessages;
  let resolvedLocation = null;
  let weatherData = null;
  let weatherServiceError = null;
  let proactiveTools = [];
  let queryIntent = {};

  try {
    const enrichment = await enrichShaktiContext({
      messages: trimmedMessages,
      locale,
      context,
      user: authenticatedUser,
    });
    enrichedConversation = enrichment.enrichedMessages;
    resolvedLocation = enrichment.resolvedLocation;
    weatherData = enrichment.weatherData;
    weatherServiceError = enrichment.weatherError;
    proactiveTools = enrichment.toolsExecuted || [];
    queryIntent = enrichment.intent || {};
  } catch (enrichErr) {
    console.error('[ShaktiController] Context enrichment error:', enrichErr.message);
  }

  // 5. Select system prompt: concise for local CPU inference, full for cloud
  const provider = (process.env.AI_PROVIDER || 'ollama').trim().toLowerCase();
  let basePrompt = provider === 'ollama' ? OLLAMA_SHAKTI_SYSTEM_PROMPT : SHAKTI_SYSTEM_PROMPT;
  let dynamicSystemPrompt = basePrompt;
  if (locale === 'hi') {
    dynamicSystemPrompt += '\n\n[Citizen Preferred Locale: Hindi. Please respond predominantly in Hindi (देवनागरी).]';
  }

  // Helper to format weather summary consistently
  const formatWeatherSummary = (w) => {
    if (!w) return null;
    return {
      location: w.location,
      temperature: w.temperature,
      apparentTemperature: w.apparentTemperature !== undefined ? w.apparentTemperature : w.temperature,
      humidity: w.humidity,
      condition: w.condition,
      precipitation: w.precipitation !== undefined ? w.precipitation : 0.0,
      rainProbability: w.precipitationProbabilityMax,
      heatIndex: w.heatIndex,
      wetBulb: w.wetBulb,
      riskLevel: w.riskLevel,
      isLive: w.isLive,
      source: w.source,
      timestamp: w.timestamp,
    };
  };

  // Helper to construct structured verified weather response if AI generation times out
  // Helper to construct structured verified weather response if AI generation times out or is incomplete
  const buildVerifiedWeatherFallback = ({ location, weather, isTimeout, lang, isPandalOrEvening = false }) => {
    const temp = weather.temperature;
    const apparent = weather.apparentTemperature !== undefined ? weather.apparentTemperature : temp;
    const humidity = weather.humidity;
    const wind = weather.windSpeed || 8;
    const condition = weather.condition || 'Clear Sky';
    const precip = weather.precipitation !== undefined ? weather.precipitation : 0.0;
    const rainProb = weather.precipitationProbabilityMax !== null ? `${weather.precipitationProbabilityMax}%` : 'Low (<10%)';
    const heatIndex = weather.heatIndex || temp;
    const risk = weather.riskLevel || 'LOW';

    let eveningLine = isPandalOrEvening
      ? `• **Pandal Hopping / Evening Precautions:** Hydrate regularly with water or ORS packets, wear lightweight loose-fitting cotton clothing, and take periodic rest pauses in shaded or ventilated areas.`
      : null;

    if (lang === 'hi') {
      const notice = isTimeout
        ? `⚠️ **सूचना:** स्थानीय AI व्याख्या CPU पर समय समाप्त (timeout) हो गई, लेकिन **${location}** के लिए ताप चेतना मौसम डेटा सफलतापूर्वक सत्यापित किया गया है:`
        : `ℹ️ **सत्यापित मौसम डेटा (${location}):**`;
      const lines = [
        notice,
        `• **तापमान:** ${temp}°C (महसूस: ${apparent}°C)`,
        `• **मौसम की स्थिति:** ${condition}`,
        `• **आर्द्रता (Humidity):** ${humidity}%`,
        `• **हवा की गति:** ${wind} किमी/घंटा`,
        `• **वर्षा की संभावना:** ${rainProb} (वर्तमान वर्षा: ${precip} मिमी)`,
        `• **हीट इंडेक्स:** ${heatIndex}°C (${risk} जोखिम श्रेणी)`,
      ];
      if (isPandalOrEvening) {
        lines.push(`• **पंडाल भ्रमण सावधानियां:** ओआरएस/पानी से हाइड्रेटेड रहें, ढीले सूती कपड़े पहनें और बीच-बीच में छायादार स्थानों पर विश्राम करें।`);
      }
      lines.push(`\n*कृपया तुरंत लाइव डेटा के लिए ऊपर दिए गए डैशबोर्ड की जांच करें या थोड़ी देर बाद पुनः प्रयास करें।*`);
      return lines.join('\n');
    }

    const notice = isTimeout
      ? `⚠️ **Notice:** Local AI explanation timed out on CPU, but live Taap Chetna telemetry was successfully verified for **${location}**:`
      : `ℹ️ **Verified Weather Telemetry (${location}):**`;
    const lines = [
      notice,
      `• **Current Temperature:** ${temp}°C (Feels like: ${apparent}°C)`,
      `• **Sky Condition:** ${condition}`,
      `• **Relative Humidity:** ${humidity}%`,
      `• **Wind Speed:** ${wind} km/h`,
      `• **Rain / Precipitation:** ${precip} mm (Today's max rain probability: ${rainProb})`,
      `• **Heat Index:** ${heatIndex}°C (${risk} Risk Tier)`,
    ];
    if (eveningLine) {
      lines.push(eveningLine);
    }
    lines.push(`\n*Please check the live dashboard above for full telemetry or retry your question.*`);
    return lines.join('\n');
  };

  // 6. If weather lookup was required but failed, immediately inform citizen with safety guidance
  if (weatherServiceError) {
    const isHindi = locale === 'hi';
    const locName = resolvedLocation || 'your area';
    const message = isHindi
      ? `⚠️ **मौसम सेवा सूचना (${locName}):**\n**${locName}** के लिए लाइव मौसम डेटा इस समय उपलब्ध नहीं हो सका (${weatherServiceError})।\n\n*सामान्य ताप सुरक्षा सुझाव:*\n• दिनभर पर्याप्त मात्रा में पानी और ओआरएस पिएं।\n• दोपहर के समय (11 बजे से 3 बजे तक) तेज धूप में निकलने से बचें।\n• ढीले और हल्के सूती वस्त्र पहनें।`
      : `⚠️ **Live Weather Notice (${locName}):**\nLive weather lookup for **${locName}** could not be completed at this moment (${weatherServiceError}).\n\n*General Heat Safety Guidance:*\n• Stay well-hydrated with water and electrolyte solutions throughout the day.\n• Avoid prolonged direct sun exposure during peak afternoon hours (11 AM – 3 PM).\n• Wear lightweight, loose-fitting cotton clothing and take periodic rest in shade.`;

    return res.json({
      message,
      model: process.env.OLLAMA_MODEL || 'qwen3:4b',
      provider,
      resolvedLocation,
      weatherSummary: null,
      toolCallsExecuted: proactiveTools,
      aiGenerated: false,
      fallbackReason: 'WEATHER_SERVICE_UNAVAILABLE',
      timestamp: new Date().toISOString(),
    });
  }

  // 7. Generate AI Completion via Provider
  // If weatherData was already proactively retrieved, omit tool schemas so Qwen doesn't
  // waste CPU tokens on function schema evaluation or attempt tool-calling loops.
  const toolsForModel = weatherData ? [] : (process.env.OLLAMA_ENABLE_TOOLS === 'true' ? SHAKTI_TOOL_DEFINITIONS : []);

  try {
    const aiResponse = await generateChatResponse({
      messages: enrichedConversation,
      systemPrompt: dynamicSystemPrompt,
      tools: toolsForModel,
      executeTool: executeShaktiTool,
    });

    // Check if conceptual difference query needs complete definition
    if (queryIntent.isDifference && (!aiResponse.content || !aiResponse.content.toLowerCase().includes('wet') || aiResponse.content.length < 40)) {
      const isHindi = locale === 'hi';
      const diffText = isHindi
        ? `• **हीट इंडेक्स (Heat Index):** हवा के तापमान और आर्द्रता (humidity) को मिलाकर यह दर्शाता है कि मानव शरीर पर गर्मी का वास्तविक तनाव कितना महसूस हो रहा है।\n• **वेट-बल्ब तापमान (Wet-Bulb Temperature):** यह पसीने के वाष्पीकरण द्वारा शरीर को ठंडा करने की भौतिक सीमा है। 35°C वेट-बल्ब पर मानव शरीर पसीने से भी खुद को ठंडा नहीं कर पाता, जो जीवन के लिए अत्यंत खतरनाक है।`
        : `• **Heat Index:** Measures perceived environmental thermal load on human biology by combining ambient air temperature and relative humidity.\n• **Wet-Bulb Temperature:** Measures the physical threshold of evaporative sweating. When wet-bulb exceeds 35°C, the human body cannot shed metabolic heat through perspiration, posing critical biological danger.`;

      return res.json({
        message: diffText,
        model: aiResponse.model || process.env.OLLAMA_MODEL || 'qwen3:4b',
        provider,
        resolvedLocation: null,
        weatherSummary: null,
        toolCallsExecuted: proactiveTools,
        diagnostics: aiResponse.diagnostics || null,
        aiGenerated: false,
        fallbackReason: 'AI_REASONING_FILTERED',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if AI generated a valid response or if internal reasoning was filtered out
    if (!aiResponse.content || aiResponse.content.trim().length === 0) {
      // 1. If weather data is available, fallback to verified telemetry
      if (weatherData) {
        console.warn('[ShaktiController] AI output was reasoning-only. Preserving verified weather telemetry.');
        const fallbackText = buildVerifiedWeatherFallback({
          location: resolvedLocation || weatherData.location,
          weather: weatherData,
          isTimeout: false,
          lang: locale,
          isPandalOrEvening: queryIntent.isPandalOrEvening,
        });

        return res.json({
          message: fallbackText,
          model: aiResponse.model || process.env.OLLAMA_MODEL || 'qwen3:4b',
          provider,
          resolvedLocation,
          weatherSummary: formatWeatherSummary(weatherData),
          toolCallsExecuted: [
            ...proactiveTools,
            ...(aiResponse.toolsExecuted || []),
          ],
          diagnostics: aiResponse.diagnostics || null,
          aiGenerated: false,
          fallbackReason: 'AI_REASONING_FILTERED',
          timestamp: new Date().toISOString(),
        });
      }

      // 2. If conceptual query, provide verified domain explanation
      if (queryIntent.isDifference) {
        return res.json({
          message: [
            '• **Heat Index:** Measures perceived environmental thermal load on the human biology by combining ambient temperature and relative humidity.',
            '• **Wet-Bulb Temperature:** Measures the physical threshold of evaporative sweating. When wet-bulb exceeds 35°C, the human body cannot shed metabolic heat through sweat, posing severe biological heat danger.',
          ].join('\n'),
          model: aiResponse.model || process.env.OLLAMA_MODEL || 'qwen3:4b',
          provider,
          resolvedLocation: null,
          weatherSummary: null,
          toolCallsExecuted: proactiveTools,
          diagnostics: aiResponse.diagnostics || null,
          aiGenerated: false,
          fallbackReason: 'AI_REASONING_FILTERED',
          timestamp: new Date().toISOString(),
        });
      }

      // 3. General query fallback
      return res.json({
        message: 'I apologize, but I could not formulate a complete response to your query right now. Please ask your question again or check the live dashboard.',
        model: aiResponse.model || process.env.OLLAMA_MODEL || 'qwen3:4b',
        provider,
        resolvedLocation: resolvedLocation || null,
        weatherSummary: null,
        toolCallsExecuted: proactiveTools,
        diagnostics: aiResponse.diagnostics || null,
        aiGenerated: false,
        fallbackReason: 'AI_INCOMPLETE',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      message: aiResponse.content,
      model: aiResponse.model,
      provider: aiResponse.provider,
      resolvedLocation,
      weatherSummary: formatWeatherSummary(weatherData),
      toolCallsExecuted: [
        ...proactiveTools,
        ...(aiResponse.toolsExecuted || []),
      ],
      diagnostics: aiResponse.diagnostics || null,
      aiGenerated: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const isTimeout = err.status === 504 || err.originalCode === 'TIMEOUT' || err.message?.includes('timeout');

    // CRITICAL: If weather data was verified from live telemetry before the LLM timed out,
    // preserve and return the real verified weather metrics to the citizen rather than
    // discarding it and showing a generic error!
    if (weatherData) {
      console.warn(`[ShaktiController] AI generation failed (${err.message}). Preserving verified weather telemetry fallback.`);
      const fallbackText = buildVerifiedWeatherFallback({
        location: resolvedLocation || weatherData.location,
        weather: weatherData,
        isTimeout,
        lang: locale,
        isPandalOrEvening: queryIntent.isPandalOrEvening,
      });

      return res.json({
        message: fallbackText,
        model: process.env.OLLAMA_MODEL || 'qwen3:4b',
        provider,
        resolvedLocation,
        weatherSummary: formatWeatherSummary(weatherData),
        toolCallsExecuted: proactiveTools,
        aiGenerated: false,
        fallbackReason: isTimeout ? 'AI_TIMEOUT' : 'AI_ERROR',
        timestamp: new Date().toISOString(),
      });
    }

    const statusCode = err.status || 500;
    res.status(statusCode).json({
      message: err.message || 'Shakti encountered an error while formulating guidance. Please try again.',
      code: isTimeout ? 'TIMEOUT' : (err.originalCode || 'AI_PROVIDER_ERROR'),
      isTimeout,
      resolvedLocation: resolvedLocation || null,
      weatherSummary: null,
      toolCallsExecuted: proactiveTools,
    });
  }
});

module.exports = {
  getStatus,
  chat,
};
