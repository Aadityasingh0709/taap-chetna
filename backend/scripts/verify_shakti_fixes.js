/**
 * verify_shakti_fixes.js
 * End-to-end verification of all 7 test cases specified in the Shakti local Qwen specification:
 * 1. "How is the weather today?"
 * 2. "What is the current temperature in my area?"
 * 3. "If I go pandal hopping from 6 PM, what precautions should I take?"
 * 4. General question that needs no external data.
 * 5. Ollama stopped or unavailable.
 * 6. Weather service unavailable.
 * 7. Weather retrieval succeeds but Qwen generation times out.
 */

const { chat } = require('../controllers/shaktiController');
const { resolveLocationHierarchy } = require('../services/shaktiContextService');

function createMockRes() {
  return {
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
}

async function runTest(testNum, testName, reqBody, customCheck) {
  console.log(`\n============================================================`);
  console.log(`TEST ${testNum}: ${testName}`);
  console.log(`Query: "${reqBody.messages[reqBody.messages.length - 1].content}"`);
  console.log(`Context:`, reqBody.context || {});
  console.log(`------------------------------------------------------------`);

  const req = {
    body: reqBody,
    ip: '127.0.0.1',
    headers: {},
  };
  const res = createMockRes();

  const start = Date.now();
  await chat(req, res);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`Status Code: ${res.statusCode} | Elapsed: ${elapsed}s`);
  console.log(`Resolved Location:`, res.data?.resolvedLocation || 'None');
  console.log(`Weather Summary:`, res.data?.weatherSummary ? `${res.data.weatherSummary.temperature}°C, ${res.data.weatherSummary.condition}` : 'None');
  console.log(`Tool Calls:`, res.data?.toolCallsExecuted || []);
  console.log(`AI Generated:`, res.data?.aiGenerated);
  if (res.data?.fallbackReason) console.log(`Fallback Reason:`, res.data.fallbackReason);
  if (res.data?.diagnostics) console.log(`Diagnostics:`, res.data.diagnostics);
  console.log(`\n--- Response Text ---`);
  console.log(res.data?.message);
  console.log(`--- End Response ---\n`);

  // Global assertion: Verify NO internal reasoning leaked
  const msg = res.data?.message || '';
  const leakedReasoning = /(?:(?:Okay|Hmm|Well|First),?\s+the user|\*checks requirements\*|Key points to hit:|Word count must stay|My draft has|Word limit|The instruction says)/i.test(msg);
  if (leakedReasoning) {
    console.error(`❌ TEST ${testNum} FAILED: Internal chain-of-thought leaked into response!`);
    return false;
  }

  // Custom Assertions
  const checkResult = customCheck(res);
  if (checkResult === true) {
    console.log(`✅ TEST ${testNum} PASSED`);
    return true;
  } else {
    console.error(`❌ TEST ${testNum} FAILED:`, checkResult);
    return false;
  }
}

async function main() {
  const results = [];

  // TEST 1: "How is the weather today?"
  results.push(await runTest(
    1,
    'Live Weather Query ("How is the weather today?")',
    {
      messages: [{ role: 'user', content: 'How is the weather today?' }],
      context: { selectedLocation: 'Kolkata, West Bengal' },
    },
    (res) => {
      if (res.statusCode !== 200) return `Expected status 200, got ${res.statusCode}`;
      if (!res.data.weatherSummary) return 'Missing weatherSummary';
      if (typeof res.data.weatherSummary.temperature !== 'number') return 'Temperature must be a number';
      if (!res.data.toolCallsExecuted.some((t) => t.tool === 'get_current_weather')) return 'get_current_weather tool not recorded';
      if (!res.data.message.includes('°C') && !res.data.message.includes(String(res.data.weatherSummary.temperature))) {
        return 'Message must include actual temperature';
      }
      return true;
    }
  ));

  // TEST 2: "What is the current temperature in my area?"
  results.push(await runTest(
    2,
    'Current Temperature Query ("What is the current temperature in my area?")',
    {
      messages: [{ role: 'user', content: 'What is the current temperature in my area?' }],
      context: { selectedLocation: 'Mumbai, Maharashtra' },
    },
    (res) => {
      if (res.statusCode !== 200) return `Expected status 200, got ${res.statusCode}`;
      if (!res.data.weatherSummary) return 'Missing weatherSummary';
      if (typeof res.data.weatherSummary.temperature !== 'number') return 'Temperature must be a number';
      return true;
    }
  ));

  // TEST 3: "If I go pandal hopping from 6 PM, what precautions should I take?"
  results.push(await runTest(
    3,
    'Pandal Hopping / Evening Query',
    {
      messages: [{ role: 'user', content: 'If I go pandal hopping from 6 PM, what precautions should I take?' }],
      context: { selectedLocation: 'Kolkata, West Bengal' },
    },
    (res) => {
      if (res.statusCode !== 200) return `Expected status 200, got ${res.statusCode}`;
      if (!res.data.weatherSummary) return 'Missing weatherSummary';
      if (!res.data.message.toLowerCase().includes('water') && !res.data.message.toLowerCase().includes('hydrate') && !res.data.message.toLowerCase().includes('precaution')) {
        return 'Must provide precautions in response';
      }
      return true;
    }
  ));

  // TEST 4: General question needing no external data
  results.push(await runTest(
    4,
    'General Conceptual Question (No external data needed)',
    {
      messages: [{ role: 'user', content: 'What is the difference between heat index and wet bulb temperature?' }],
      context: {},
    },
    (res) => {
      if (res.statusCode !== 200) return `Expected status 200, got ${res.statusCode}`;
      const msg = res.data.message.toLowerCase();
      if (!msg.includes('heat index') || !msg.includes('wet')) {
        return 'Must explain heat index and wet bulb';
      }
      return true;
    }
  ));

  // TEST 5: Ollama stopped or unavailable
  console.log(`\n============================================================`);
  console.log(`TEST 5: Ollama Unreachable / Down Simulation`);
  console.log(`------------------------------------------------------------`);
  {
    const oldBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:9999'; // invalid port
    const req = {
      body: {
        messages: [{ role: 'user', content: 'Explain what heat acclimation means.' }],
        context: {},
      },
      ip: '127.0.0.1',
      headers: {},
    };
    const res = createMockRes();
    await chat(req, res);
    process.env.OLLAMA_BASE_URL = oldBaseUrl; // restore

    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response Code:`, res.data?.code);
    console.log(`Message:`, res.data?.message);
    const passed = (res.statusCode === 503 || res.statusCode === 502) && (res.data?.code === 'ECONNREFUSED' || res.data?.message?.includes('unreachable'));
    if (passed) {
      console.log(`✅ TEST 5 PASSED`);
      results.push(true);
    } else {
      console.error(`❌ TEST 5 FAILED: Expected 503/502 ECONNREFUSED`);
      results.push(false);
    }
  }

  // TEST 6: Weather service unavailable
  results.push(await runTest(
    6,
    'Weather Service Unavailable Simulation',
    {
      messages: [{ role: 'user', content: 'How is the weather today?' }],
      context: { selectedLocation: 'Kolkata, West Bengal', forceWeatherError: true },
    },
    (res) => {
      if (res.statusCode !== 200 && res.statusCode !== 503) return `Expected status 200 or 503, got ${res.statusCode}`;
      const msg = (res.data?.message || '').toLowerCase();
      if (!msg.includes('unavailable') && !msg.includes('could not')) {
        return 'Must state that weather service is unavailable';
      }
      return true;
    }
  ));

  // TEST 7: Weather retrieval succeeds but Qwen generation times out
  console.log(`\n============================================================`);
  console.log(`TEST 7: Weather Retrieval Succeeds but Qwen Times Out`);
  console.log(`------------------------------------------------------------`);
  {
    const oldTimeout = process.env.OLLAMA_TIMEOUT_MS || '90000';
    process.env.OLLAMA_TIMEOUT_MS = '1'; // 1ms forces immediate axios timeout
    const req = {
      body: {
        messages: [{ role: 'user', content: 'How is the weather today?' }],
        context: { selectedLocation: 'Kolkata, West Bengal' },
      },
      ip: '127.0.0.1',
      headers: {},
    };
    const res = createMockRes();
    await chat(req, res);
    process.env.OLLAMA_TIMEOUT_MS = oldTimeout; // restore

    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Weather Summary preserved:`, res.data?.weatherSummary ? `${res.data.weatherSummary.temperature}°C` : 'None');
    console.log(`Fallback Reason:`, res.data?.fallbackReason);
    console.log(`Tool Calls Preserved:`, res.data?.toolCallsExecuted);
    console.log(`\n--- Fallback Response ---`);
    console.log(res.data?.message);
    console.log(`--- End Fallback Response ---\n`);

    const passed =
      res.statusCode === 200 &&
      res.data?.weatherSummary &&
      typeof res.data.weatherSummary.temperature === 'number' &&
      res.data.fallbackReason === 'AI_TIMEOUT' &&
      res.data.aiGenerated === false &&
      res.data.message.includes('°C') &&
      !res.data.message.includes('*General Heat Safety Tip:* Drink adequate water with electrolyte salts');

    if (passed) {
      console.log(`✅ TEST 7 PASSED`);
      results.push(true);
    } else {
      console.error(`❌ TEST 7 FAILED: Weather data was not properly preserved in fallback`);
      results.push(false);
    }
  }

  console.log(`\n============================================================`);
  console.log(`SUMMARY: ${results.filter(Boolean).length}/${results.length} TESTS PASSED`);
  console.log(`============================================================`);
  if (results.every(Boolean)) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
