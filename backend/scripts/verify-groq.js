/**
 * verify-groq.js
 * Safe live authenticated verification script.
 * 
 * Strict Security Rules:
 * - NEVER prints or logs the API key.
 * - Reports only success/failure and configured model ID.
 */

require('dotenv').config();
const { generateChatResponse, getProviderStatus } = require('../services/aiProvider');
const { SHAKTI_SYSTEM_PROMPT } = require('../services/shaktiSystemPrompt');

async function verify() {
  const status = getProviderStatus();
  console.log(`[VERIFICATION] Checking AI Provider status...`);
  console.log(`[VERIFICATION] Provider: ${status.provider}`);
  console.log(`[VERIFICATION] Configured: ${status.configured}`);
  console.log(`[VERIFICATION] Model: ${status.model}`);

  if (!status.configured) {
    console.error(`[VERIFICATION] GROQ_API_KEY is not set or empty in backend/.env.`);
    process.exit(1);
  }

  console.log(`[VERIFICATION] Sending single test prompt to GroqCloud...`);

  try {
    const res = await generateChatResponse({
      messages: [
        {
          role: 'user',
          content: 'Hello Shakti! In one brief sentence, what is the core purpose of Taap Chetna?',
        },
      ],
      systemPrompt: SHAKTI_SYSTEM_PROMPT,
      tools: [],
    });

    console.log(`[VERIFICATION] Result: SUCCESS`);
    console.log(`[VERIFICATION] Model Used: ${res.model}`);
    console.log(`[VERIFICATION] Response excerpt: "${res.content.replace(/\n+/g, ' ').substring(0, 160)}..."`);
    process.exit(0);
  } catch (err) {
    console.error(`[VERIFICATION] Result: FAILED`);
    console.error(`[VERIFICATION] Error message: ${err.message}`);
    process.exit(1);
  }
}

verify();
