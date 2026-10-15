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
  assert.ok(SHAKTI_SYSTEM_PROMPT.includes('NEVER INVENT CURRENT WEATHER'), 'Must explicitly forbid inventing weather');
  assert.ok(SHAKTI_SYSTEM_PROMPT.includes('NEVER FABRICATE PERSONAL HEAT-RISK SCORES'), 'Must forbid fabricating risk scores');
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
  assert.equal(status.provider, 'groq');
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
  await chat({ body: { messages: [{ role: 'system', content: 'test' }] }, ip: '127.0.0.1' }, res2);
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

