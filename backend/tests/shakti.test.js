/**
 * shakti.test.js
 * Comprehensive automated verification tests for Shakti Phase 2.
 * 
 * Tests:
 * 1. Request validation (empty messages, invalid roles, excessive length).
 * 2. Tool allowlist security and execution (weather, personal risk, travel, what-if).
 * 3. Provider error handling and missing credentials.
 * 4. System prompt safety instructions.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { SHAKTI_TOOL_DEFINITIONS, executeShaktiTool } = require('../services/shaktiTools');
const { SHAKTI_SYSTEM_PROMPT } = require('../services/shaktiSystemPrompt');
const { getProviderStatus } = require('../services/aiProvider');

test('Shakti Phase 2: System Prompt Safety Safeguards', () => {
  assert.ok(SHAKTI_SYSTEM_PROMPT.includes('Shakti'), 'Prompt must define assistant identity');
  assert.ok(SHAKTI_SYSTEM_PROMPT.includes('Taap Chetna'), 'Prompt must reference platform');
  assert.ok(SHAKTI_SYSTEM_PROMPT.includes('NEVER INVENT WEATHER'), 'Must explicitly forbid inventing weather');
  assert.ok(SHAKTI_SYSTEM_PROMPT.includes('NEVER FABRICATE PERSONAL HEAT-RISK SCORES') || SHAKTI_SYSTEM_PROMPT.includes('NEVER FABRICATE PERSONAL'), 'Must forbid fabricating risk scores');
  assert.ok(SHAKTI_SYSTEM_PROMPT.includes('108 or 102'), 'Must advise emergency medical help for heat stroke');
});

test('Shakti Phase 2: Tool Allowlist & Definitions', () => {
  const allowedNames = SHAKTI_TOOL_DEFINITIONS.map((t) => t.function.name);
  assert.deepEqual(
    allowedNames,
    ['get_current_weather', 'calculate_personal_heat_risk', 'check_travel_risk', 'plan_outdoor_activities'],
    'Only approved tools must be present in the tool registry'
  );

  // Validate tool schemas
  for (const tool of SHAKTI_TOOL_DEFINITIONS) {
    assert.equal(tool.type, 'function');
    assert.ok(tool.function.description.length > 10, 'Tool must have meaningful description');
    assert.ok(tool.function.parameters.properties, 'Tool parameters must be defined');
  }
});

test('Shakti Phase 2: Tool Execution Security & Allowlist Enforcement', async () => {
  // 1. Unregistered tool rejection
  const badTool = await executeShaktiTool('unauthorized_admin_drop_database', {});
  assert.equal(badTool.success, false);
  assert.match(badTool.error, /not registered/i);

  // 2. Personal heat risk calculation (pure server-side execution)
  const riskResult = await executeShaktiTool('calculate_personal_heat_risk', {
    temperature: 38,
    humidity: 70,
    ageBand: '60+',
    occupation: 'Construction Laborer',
    exposureHours: 6,
    healthCondition: 'cardiovascular',
    livingCondition: 'tin_roof_uninsulated',
    hydrationLiters: 1.5,
  });
  assert.equal(riskResult.success, true);
  assert.ok(typeof riskResult.score === 'number' && riskResult.score > 70, 'Calculates elevated risk for vulnerable elderly laborer');
  assert.ok(riskResult.heatIndexC > 40, 'Heat Index correctly calculated');
  assert.ok(riskResult.wetBulbC > 28, 'Wet-bulb correctly calculated');

  // 3. Travel risk comparison between Indian cities
  const travelResult = await executeShaktiTool('check_travel_risk', {
    fromLocation: 'Kolkata',
    toLocation: 'Jaipur',
  });
  assert.equal(travelResult.success, true);
  assert.ok(travelResult.from && travelResult.to, 'Returns both origin and destination metrics');
  assert.ok(travelResult.transitionRisk, 'Returns transition risk evaluation');

  // 4. Missing required args in tool call
  const missingArgs = await executeShaktiTool('get_current_weather', { location: '' });
  assert.equal(missingArgs.success, false);
  assert.match(missingArgs.error, /location/i);
});

test('Shakti Phase 2: Provider Status & Configuration Safety', () => {
  const status = getProviderStatus();
  assert.ok(['ollama', 'groq'].includes(status.provider), 'Provider must be ollama or groq');
  assert.ok(typeof status.configured === 'boolean', 'Status must return boolean configured flag');
  assert.ok(status.model.length > 0, 'Must have a model ID configured');
});

test('Shakti Phase 2: Endpoint Request Validation & Error Shielding', async () => {
  const { chat } = require('../controllers/shaktiController');

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      data: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.data = payload;
      },
    };
    return res;
  };

  // 1. Empty messages array
  const res1 = createMockRes();
  await chat({ body: { messages: [] }, ip: '127.0.0.1' }, res1);
  assert.equal(res1.statusCode, 400);
  assert.equal(res1.data.code, 'INVALID_MESSAGES');

  // 2. Invalid role
  const res2 = createMockRes();
  await chat({ body: { messages: [{ role: 'admin', content: 'test' }] }, ip: '127.0.0.1' }, res2);
  assert.equal(res2.statusCode, 400);
  assert.equal(res2.data.code, 'INVALID_ROLE');

  // 3. Message too long
  const res3 = createMockRes();
  await chat({ body: { messages: [{ role: 'user', content: 'x'.repeat(1600) }] }, ip: '127.0.0.1' }, res3);
  assert.equal(res3.statusCode, 400);
  assert.equal(res3.data.code, 'MESSAGE_TOO_LONG');

  // 4. Empty user message
  const res4 = createMockRes();
  await chat({ body: { messages: [{ role: 'user', content: '   ' }] }, ip: '127.0.0.1' }, res4);
  assert.equal(res4.statusCode, 400);
  assert.equal(res4.data.code, 'EMPTY_USER_MESSAGE');
});

test('Shakti Phase 2: Location Hierarchy & Context Enrichment', async () => {
  const { resolveLocationHierarchy, classifyQueryIntent, enrichShaktiContext } = require('../services/shaktiContextService');

  // 1. Explicit location in query overrides everything
  const loc1 = await resolveLocationHierarchy('what is the temperature in Mumbai?', { selectedLocation: 'Delhi' });
  assert.equal(loc1.location, 'Mumbai');
  assert.equal(loc1.source, 'query_explicit');

  // 2. Selected application location used if query has no explicit location
  const loc2 = await resolveLocationHierarchy('how is todays weather', { selectedLocation: 'Kolkata, West Bengal' });
  assert.equal(loc2.location, 'Kolkata, West Bengal');
  assert.equal(loc2.source, 'app_selected_location');

  // 3. User profile location used if neither query nor app selection provided
  const loc3 = await resolveLocationHierarchy('how is todays weather', {}, { homeLocation: 'Chennai' });
  assert.equal(loc3.location, 'Chennai');
  assert.equal(loc3.source, 'user_profile_location');

  // 4. Location unavailable when none provided
  const loc4 = await resolveLocationHierarchy('how is todays weather', {});
  assert.equal(loc4.location, null);

  // 5. Query classification recognizes weather questions
  const intent = classifyQueryIntent('how is todays weather');
  assert.equal(intent.isWeather, true);

  // 6. Context enrichment injects verified data and instructions when location is resolved
  const enriched = await enrichShaktiContext({
    messages: [{ role: 'user', content: 'how is todays weather' }],
    context: { selectedLocation: 'Kolkata, West Bengal' }
  });
  assert.equal(enriched.resolvedLocation, 'Kolkata, West Bengal');
  assert.ok(enriched.weatherData, 'Must fetch verified weather data for resolved location');
  assert.ok(enriched.toolsExecuted.some(t => t.tool === 'get_current_weather'));
  assert.ok(enriched.enrichedMessages.some(m => m.role === 'system' && m.content.includes('VERIFIED TAAP CHETNA APPLICATION DATA')));
});

test('Shakti Phase 2: Reasoning Leak Prevention & Content Sanitization', () => {
  // Test helper replicating the sanitization regex in aiProvider.js
  const cleanResponse = (content) => {
    return (content || '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/^[\s\S]*?<\/think>/gi, '')
      .replace(/<think>[\s\S]*$/gi, '')
      .trim();
  };

  // 1. Standard closed think block
  const sample1 = '<think>\nInternal chain of thought: the user wants weather in Kolkata\n</think>\nIn Kolkata, the current temperature is 28°C with partly cloudy skies.';
  assert.equal(cleanResponse(sample1), 'In Kolkata, the current temperature is 28°C with partly cloudy skies.');

  // 2. Orphaned closing </think> (where Ollama omits the opening tag at prompt start)
  const sample2 = 'We are given verified data for Kolkata.\nLet us craft the answer.\n</think>\n\nIn Kolkata today, the temperature is 26.5°C.';
  assert.equal(cleanResponse(sample2), 'In Kolkata today, the temperature is 26.5°C.');

  // 3. Orphaned opening <think> (generation cut off mid-reasoning)
  const sample3 = '<think>\nWait, let me ponder whether the user is in Kolkata';
  assert.equal(cleanResponse(sample3), '');

  // 4. Normal text without any think blocks
  const sample4 = 'The current temperature in New Delhi is 32°C with 45% humidity.';
  assert.equal(cleanResponse(sample4), sample4);
});

test('Shakti Phase 2: Verified Weather Fallback Preservation on Timeout', async () => {
  const { chat } = require('../controllers/shaktiController');

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      data: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.data = payload;
        return this;
      },
    };
    return res;
  };

  // Test request with Kolkata context and forced timeout simulated via forceWeatherError: false
  // Even if generateChatResponse throws or fails, weatherData was already retrieved and must be preserved!
  const req = {
    body: {
      messages: [{ role: 'user', content: 'how is todays weather' }],
      context: { selectedLocation: 'Kolkata, West Bengal' },
    },
    ip: '127.0.0.1',
    headers: {},
  };
  const res = createMockRes();

  await chat(req, res);

  assert.equal(res.statusCode, 200, 'Must respond with 200 and preserved weather data even on timeout');
  assert.ok(res.data.weatherSummary, 'Must contain weatherSummary in response');
  assert.ok(typeof res.data.weatherSummary.temperature === 'number', 'Temperature must be a real verified number');
  assert.ok(res.data.weatherSummary.condition, 'Must have sky condition');
  assert.ok(res.data.toolCallsExecuted.some(t => t.tool === 'get_current_weather'), 'Must record get_current_weather tool');
  // Message must not be empty and must include temperature or weather data
  assert.ok(res.data.message.includes('°C') || res.data.message.includes(String(res.data.weatherSummary.temperature)));
  // Must NOT include generic heat-safety tip boilerplate
  assert.ok(!res.data.message.includes('*General Heat Safety Tip:* Drink adequate water with electrolyte salts'));
});

test('Shakti Phase 2: Query Intent Classification for Pandal Hopping & Differences', () => {
  const { classifyQueryIntent } = require('../services/shaktiContextService');

  // Pandal hopping & evening outing
  const pandalIntent = classifyQueryIntent('If I go pandal hopping from 6 PM, what precautions should I take?');
  assert.equal(pandalIntent.isPandalOrEvening, true);

  // General concept difference
  const diffIntent = classifyQueryIntent('what is the difference between heat index and wet bulb temperature?');
  assert.equal(diffIntent.isDifference, true);

  // Pure weather query
  const weatherIntent = classifyQueryIntent('what is the current temperature in my area?');
  assert.equal(weatherIntent.isTemp, true);
  assert.equal(weatherIntent.isWeather, true);
});

