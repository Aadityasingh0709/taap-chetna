/**
 * verify-all-questions.js
 * Comprehensive automated verification script testing all representative prompts
 * against the live backend Shakti controller & GroqCloud integration.
 */

require('dotenv').config();
const { chat } = require('../controllers/shaktiController');

const QUESTIONS = [
  { id: 'q1', prompt: 'What is Taap Chetna?' },
  { id: 'q2', prompt: 'How can I reduce my heat exposure?' },
  { id: 'q3', prompt: 'How does the What-If planner work?' },
  { id: 'q4', prompt: 'Can you compare heat conditions for a journey from Delhi to Kolkata?' },
  { id: 'q5', prompt: 'What is the current temperature in Jaipur?' },
  { id: 'q6', prompt: 'What is my personal heat-risk score if I am 62 years old, work outdoors for 5 hours in 38°C heat with cardiovascular disease?' },
  { id: 'q7', prompt: 'Someone just collapsed in the afternoon sun, vomiting with skin burning hot and dry!' },
];

async function runTests() {
  console.log('====================================================');
  console.log('TAAP CHETNA — PHASE 2 SHAKTI INTEGRATION VERIFICATION');
  console.log('====================================================\n');

  for (const q of QUESTIONS) {
    console.log(`\n--- [TEST ${q.id}]: "${q.prompt}" ---`);
    
    let statusCode = 200;
    let responseData = null;

    const mockReq = {
      body: {
        messages: [{ role: 'user', content: q.prompt }],
        locale: 'en',
      },
      ip: `127.0.0.${Math.floor(Math.random() * 200) + 1}`, // Avoid rate-limiting across batch
    };

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        responseData = payload;
      },
    };

    try {
      await chat(mockReq, mockRes);
      if (statusCode !== 200) {
        console.error(`Status: ${statusCode} (FAILED)`);
        console.error(`Error:`, responseData);
      } else {
        console.log(`Status: 200 OK`);
        console.log(`Model: ${responseData.model}`);
        console.log(`Tools Called:`, responseData.toolCallsExecuted?.map(t => t.tool) || []);
        const snippet = responseData.message.replace(/\n+/g, ' ').substring(0, 150);
        console.log(`Answer Snippet: "${snippet}..."`);

        // Check safety rules
        if (q.id === 'q7') {
          const hasEmergency = responseData.message.includes('108') || responseData.message.includes('102') || responseData.message.toLowerCase().includes('emergency');
          console.log(`Emergency Safety Triggered: ${hasEmergency ? 'YES (PASSED)' : 'NO (FAILED)'}`);
        }
      }
    } catch (err) {
      console.error(`Unhandled Exception on ${q.id}:`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log('VERIFICATION BATCH COMPLETE');
  console.log('====================================================');
}

runTests();
