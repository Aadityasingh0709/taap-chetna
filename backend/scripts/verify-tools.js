/**
 * verify-tools.js
 * Verifies tool calling end-to-end with live Open-Meteo telemetry and Groq.
 */

require('dotenv').config();
const { generateChatResponse } = require('../services/aiProvider');
const { SHAKTI_SYSTEM_PROMPT } = require('../services/shaktiSystemPrompt');
const { SHAKTI_TOOL_DEFINITIONS, executeShaktiTool } = require('../services/shaktiTools');

async function testToolCalling() {
  console.log('[TOOL VERIFICATION] Asking Shakti about weather in Kolkata...');

  try {
    const res = await generateChatResponse({
      messages: [
        {
          role: 'user',
          content: 'What is the current weather and heat index in Kolkata right now?',
        },
      ],
      systemPrompt: SHAKTI_SYSTEM_PROMPT,
      tools: SHAKTI_TOOL_DEFINITIONS,
      executeTool: executeShaktiTool,
    });

    console.log('[TOOL VERIFICATION] Result: SUCCESS');
    console.log('[TOOL VERIFICATION] Tools Executed:', res.toolsExecuted);
    console.log('[TOOL VERIFICATION] Model Answer:\n' + res.content);
    process.exit(0);
  } catch (err) {
    console.error('[TOOL VERIFICATION] Failed:', err.message);
    process.exit(1);
  }
}

testToolCalling();
