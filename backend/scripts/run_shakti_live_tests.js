/**
 * run_shakti_live_tests.js
 * Comprehensive live test suite for Shakti context-aware intelligence.
 * Sends real requests through Express -> shaktiContextService -> weatherService -> Ollama Qwen3 4B.
 */

const axios = require('axios');

const ENDPOINT = 'http://localhost:5000/api/shakti/chat';

const TEST_CASES = [
  {
    id: 'Q1',
    name: 'How is the weather today?',
    payload: {
      messages: [{ role: 'user', content: 'How is the weather today?' }],
      locale: 'en',
      context: { selectedLocation: 'Kolkata, West Bengal' },
    },
    expectedVerification: 'Reuses selectedLocation "Kolkata, West Bengal", invokes weatherService, returns real temp/humidity/condition, model explains real telemetry.',
  },
  {
    id: 'Q2',
    name: 'What is the current temperature in my area?',
    payload: {
      messages: [{ role: 'user', content: 'What is the current temperature in my area?' }],
      locale: 'en',
      context: { selectedLocation: 'Kolkata, West Bengal' },
    },
    expectedVerification: 'Resolves area from selectedLocation, invokes weatherService, returns real temp and apparent temp.',
  },
  {
    id: 'Q3',
    name: 'Will it rain today?',
    payload: {
      messages: [{ role: 'user', content: 'Will it rain today?' }],
      locale: 'en',
      context: { selectedLocation: 'Kolkata, West Bengal' },
    },
    expectedVerification: 'Retrieves verified rain/precipitation and maximum probability from weatherService, answers with verified probability.',
  },
  {
    id: 'Q4',
    name: 'If I go pandal hopping from 6 PM, what precautions should I take?',
    payload: {
      messages: [{ role: 'user', content: 'If I go pandal hopping from 6 PM, what precautions should I take?' }],
      locale: 'en',
      context: { selectedLocation: 'Kolkata, West Bengal' },
    },
    expectedVerification: 'Evaluates evening forecast slot for 6 PM, returns sensible heat precautions contextualized with the evening conditions without claiming 100% safety.',
  },
  {
    id: 'Q5',
    name: 'How is the heat risk today?',
    payload: {
      messages: [{ role: 'user', content: 'How is the heat risk today?' }],
      locale: 'en',
      context: { selectedLocation: 'Kolkata, West Bengal' },
    },
    expectedVerification: 'Computes environmental heat index, wet-bulb temperature, and risk level from verified telemetry.',
  },
  {
    id: 'Q6',
    name: 'What is the difference between a weather forecast and a heat-risk assessment?',
    payload: {
      messages: [{ role: 'user', content: 'What is the difference between a weather forecast and a heat-risk assessment?' }],
      locale: 'en',
      context: { selectedLocation: 'Kolkata, West Bengal' },
    },
    expectedVerification: 'Clearly explains the fundamental distinction between atmospheric weather forecasting and physiological human heat strain.',
  },
  {
    id: 'Q7_LOC_UNAVAILABLE',
    name: 'Location Unavailable: What is the current temperature in my area?',
    payload: {
      messages: [{ role: 'user', content: 'What is the current temperature in my area?' }],
      locale: 'en',
      context: {}, // No selectedLocation or coords
    },
    expectedVerification: 'Recognizes location is unavailable, politely asks which city/area citizen means, does NOT substitute an arbitrary city.',
  },
  {
    id: 'Q8_WEATHER_DOWN',
    name: 'Weather Service Unavailable: How is the weather today?',
    payload: {
      messages: [{ role: 'user', content: 'How is the weather today?' }],
      locale: 'en',
      context: { selectedLocation: 'Kolkata, West Bengal', forceWeatherError: true },
    },
    expectedVerification: 'States honestly that live weather lookup failed, offers sensible general heat safety advice without fabricating numbers.',
  },
];

async function runTest(testCase) {
  console.log(`\n======================================================`);
  console.log(`[TEST CASE ${testCase.id}] ${testCase.name}`);
  console.log(`Payload Context:`, JSON.stringify(testCase.payload.context));
  console.log(`Expected: ${testCase.expectedVerification}`);
  console.log(`Submitting to Express live endpoint...`);

  const startTime = Date.now();
  try {
    const res = await axios.post(ENDPOINT, testCase.payload, {
      timeout: 200000,
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const data = res.data;

    console.log(`✓ Response received in ${duration}s (Status: ${res.status})`);
    console.log(`  Resolved Location:`, data.resolvedLocation);
    console.log(`  Weather Summary:`, JSON.stringify(data.weatherSummary));
    console.log(`  Tools Executed:`, JSON.stringify(data.toolCallsExecuted));
    console.log(`  Model / Provider:`, `${data.model} (${data.provider})`);
    console.log(`\n  --- Final Assistant Message ---`);
    console.log(data.message);
    console.log(`  -------------------------------`);

    return {
      id: testCase.id,
      name: testCase.name,
      success: true,
      duration,
      resolvedLocation: data.resolvedLocation,
      weatherSummary: data.weatherSummary,
      toolCallsExecuted: data.toolCallsExecuted,
      message: data.message,
    };
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`✗ Test failed in ${duration}s:`, err.response?.data || err.message);
    return {
      id: testCase.id,
      name: testCase.name,
      success: false,
      duration,
      error: err.response?.data || err.message,
    };
  }
}

async function runAll() {
  const results = [];
  for (const tc of TEST_CASES) {
    const r = await runTest(tc);
    results.push(r);
  }

  console.log('\n======================================================');
  console.log('SUMMARY OF ALL TEST RESULTS:');
  for (const r of results) {
    console.log(`${r.id}: ${r.success ? 'PASSED' : 'FAILED'} in ${r.duration}s | Location: ${r.resolvedLocation || 'None'}`);
  }
}

runAll().catch(console.error);
