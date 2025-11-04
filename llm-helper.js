// LLM Helper for BetterBook Chrome Extension
// Handles OpenAI API calls for answering homework questions
//
// FEATURES:
// - Uses OpenAI's gpt-4o-mini model for fast, cost-effective responses
// - Includes 'store: true' parameter to enable OpenAI request logging/storage
// - Comprehensive console logging for debugging and monitoring
// - 3-retry logic with exponential backoff for reliability
// - Structured JSON responses with answer + reasoning

console.log("✅ LLM Helper loaded successfully");

// Helper function to wait/sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test API connection on load
async function testAPIConnection() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔧 LLM Helper: Running API connection test...");
  
  try {
    // Check if API key exists
    if (typeof CONFIG === 'undefined' || !CONFIG.OPENAI_API_KEY) {
      console.error("❌ API Test FAILED: CONFIG.OPENAI_API_KEY not found");
      console.error("⚠️  LLM features will be disabled");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      return;
    }
    
    if (CONFIG.OPENAI_API_KEY === "your-openai-api-key-here") {
      console.error("❌ API Test FAILED: Please replace placeholder API key in config.js");
      console.error("⚠️  LLM features will be disabled");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      return;
    }

    // Make a minimal test call
    const testRequestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Respond with JSON only: {"status":"ok"}'
        }
      ],
      temperature: 0,
      max_tokens: 10,
      response_format: { type: "json_object" },
      store: true
    };

    console.log("📤 Sending test request to OpenAI API...");
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
      },
      body: JSON.stringify(testRequestBody),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Test FAILED: HTTP ${response.status}`);
      console.error("Error details:", errorText);
      console.error("⚠️  LLM features may not work correctly");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      return;
    }

    const data = await response.json();
    
    console.log("✅ API Test PASSED: OpenAI connection successful!");
    console.log("🆔 Test Request ID:", data.id);
    console.log("📊 Test used", data.usage.total_tokens, "tokens");
    console.log("🎯 LLM features are ready to use");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (error) {
    console.error("❌ API Test FAILED: Exception occurred");
    console.error("Error:", error.message);
    console.error("⚠️  LLM features may not work correctly");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}

// Run test after a short delay to allow config to load
setTimeout(testAPIConnection, 500);

/**
 * Call OpenAI API to get an answer for a homework question
 * @param {string} question - The question text
 * @param {Array<string>} choices - Array of answer choices (can be empty for fill-in-blank)
 * @param {string} questionType - Type: "multiple_choice", "true_false", or "fill_in_blank"
 * @returns {Promise<{success: boolean, answer: string, reasoning: string}>}
 */
async function askLLM(question, choices, questionType) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🤖 LLM Helper: NEW REQUEST - Asking AI for help");
  console.log("📝 Question:", question);
  console.log("🎯 Question Type:", questionType);
  if (choices && choices.length > 0) {
    console.log("📌 Available Choices:", choices);
  }
  
  // Build the prompt based on question type
  let prompt = "";
  if (questionType === "fill_in_blank") {
    prompt = `You are helping answer a homework question. Respond with JSON only.

Question: ${question}

This is a fill-in-the-blank question. Provide a single word or short phrase that best completes the question.

Return JSON: {"answer": "your answer here", "reasoning": "brief explanation"}`;
  } else {
    // Multiple choice or true/false
    const choicesFormatted = choices.map((choice, idx) => {
      const letter = String.fromCharCode(65 + idx); // A, B, C, D...
      return `${letter}) ${choice}`;
    }).join('\n');
    
    prompt = `You are helping answer a homework question. Respond with JSON only.

Question: ${question}

Choices:
${choicesFormatted}

Return JSON: {"answer": "exact choice text from above", "reasoning": "brief explanation"}`;
  }

  // Retry logic with exponential backoff
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🤖 LLM Helper: Attempt ${attempts}/${maxAttempts}`);
    
    try {
      // Get API key from config
      if (typeof CONFIG === 'undefined' || !CONFIG.OPENAI_API_KEY) {
        console.error("❌ LLM Helper: CONFIG.OPENAI_API_KEY not found. Please set up config.js");
        return { success: false, answer: null, reasoning: "API key not configured" };
      }
      
      if (CONFIG.OPENAI_API_KEY === "your-openai-api-key-here") {
        console.error("❌ LLM Helper: Please replace the placeholder API key in config.js with your actual OpenAI API key");
        return { success: false, answer: null, reasoning: "API key not configured" };
      }

      const requestBody = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful homework assistant. Always respond with valid JSON containing "answer" and "reasoning" fields.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 500,
        response_format: { type: "json_object" },
        store: true  // Enable OpenAI request storage for debugging and logging
      };
      
      console.log("📤 LLM Helper: Sending request to OpenAI with store=true (logging enabled)");
      console.log("📋 Request body:", JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ LLM Helper: API error (${response.status}):`, errorText);
        
        // If it's a rate limit or server error, retry
        if (response.status === 429 || response.status >= 500) {
          const backoffMs = Math.pow(2, attempts) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`⏳ LLM Helper: Retrying in ${backoffMs}ms...`);
          await sleep(backoffMs);
          continue;
        }
        
        // For other errors (auth, bad request), don't retry
        return { success: false, answer: null, reasoning: `API error: ${response.status}` };
      }

      const data = await response.json();
      console.log("📥 LLM Helper: Full API response received");
      console.log("🔍 Raw response data:", JSON.stringify(data, null, 2));
      
      // Log usage statistics
      if (data.usage) {
        console.log("📊 Token usage - Prompt:", data.usage.prompt_tokens, 
                    "| Completion:", data.usage.completion_tokens, 
                    "| Total:", data.usage.total_tokens);
      }
      
      // Log request ID for tracking (useful when store=true)
      if (data.id) {
        console.log("🆔 Request ID (stored by OpenAI):", data.id);
      }

      // Parse the response
      const messageContent = data.choices[0].message.content;
      const parsed = JSON.parse(messageContent);
      
      console.log("✅ LLM Helper: AI Answer:", parsed.answer);
      console.log("💡 LLM Helper: AI Reasoning:", parsed.reasoning);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      return {
        success: true,
        answer: parsed.answer,
        reasoning: parsed.reasoning
      };

    } catch (error) {
      console.error(`❌ LLM Helper: Error on attempt ${attempts}:`, error);
      
      // If we have retries left, wait and try again
      if (attempts < maxAttempts) {
        const backoffMs = Math.pow(2, attempts) * 1000; // Exponential backoff
        console.log(`⏳ LLM Helper: Retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
        continue;
      }
    }
  }

  // All attempts failed
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("❌ LLM Helper: FAILED - All 3 retry attempts exhausted");
  console.error("🔄 Falling back to default guessing behavior");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  return { success: false, answer: null, reasoning: "All retry attempts failed" };
}

