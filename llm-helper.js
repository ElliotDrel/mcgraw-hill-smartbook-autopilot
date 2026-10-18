const RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';

const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    choice_letter: { type: ['string', 'null'] },
    choice_index: { type: ['integer', 'null'] },
    answer_text: { type: 'string' },
    reasoning: { type: 'string' }
  },
  required: ['choice_letter', 'choice_index', 'answer_text', 'reasoning'],
  additionalProperties: false
};

const RESPONSE_TEXT_FORMAT = {
  type: 'json_schema',
  name: 'homework_response',
  strict: true,
  schema: RESPONSE_JSON_SCHEMA
};

const RESPONSE_TEXT_CONFIG = {
  format: RESPONSE_TEXT_FORMAT,
  verbosity: 'low'
};

const RESPONSE_REASONING_CONFIG = {
  effort: 'medium',
  summary: 'auto'
};

const RESPONSE_INCLUDE_FIELDS = [
  'reasoning.encrypted_content',
  'web_search_call.action.sources'
];

const RESPONSE_SYSTEM_INSTRUCTIONS = 'You are a helpful homework assistant. Always respond with valid JSON containing the fields "choice_letter", "choice_index", "answer_text", and "reasoning".';

/**
 * Call OpenAI API to get an answer for a homework question
 * @param {string} question - The question text
 * @param {Array<string>} choices - Array of answer choices (can be empty for fill-in-blank)
 * @param {string} questionType - Type: "multiple_choice", "true_false", or "fill_in_blank"
 * @returns {Promise<{success: boolean, choiceIndex: (number|null), choiceLetter: (string|null), answerText: string|null, reasoning: string|null}>}
 */
async function askLLM(question, choices, questionType) {
  const stored = await chrome.storage.local.get(['openaiApiKey', 'aiDisabled']);
  const apiKey = stored.aiDisabled ? "" : stored.openaiApiKey || LOCAL_CONFIG.OPENAI_API_KEY;
  if (!apiKey) return { success: false, reasoning: 'AI is optional; no key configured' };
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

Return JSON with this exact shape (choice_index must be null for fill-in-the-blank):
{"choice_letter": null, "choice_index": null, "answer_text": "your answer here", "reasoning": "brief explanation"}`;
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

Return JSON with this exact shape:
{"choice_letter": "A", "choice_index": 0, "answer_text": "exact choice text from above", "reasoning": "brief explanation"}

Rules:
- choice_index must be zero-based (0 for the first option, 1 for the second, etc.).
- choice_letter must match the letter shown (A, B, C...).
- answer_text must exactly match one of the provided choices.`;
  }

  // Retry logic with exponential backoff
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🤖 LLM Helper: Attempt ${attempts}/${maxAttempts}`);

    try {
      const requestBody = {
        model: 'gpt-5-mini',
        instructions: RESPONSE_SYSTEM_INSTRUCTIONS,
        input: prompt,
        text: RESPONSE_TEXT_CONFIG,
        reasoning: RESPONSE_REASONING_CONFIG,
        tools: [],
        store: false,
        include: RESPONSE_INCLUDE_FIELDS
      };

      console.log("📤 LLM Helper: Sending request to OpenAI with store=false");


      const response = await fetch(RESPONSES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000) // 30 second timeout to accommodate slower responses
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
        return { success: false, choiceIndex: null, choiceLetter: null, answerText: null, reasoning: `API error: ${response.status}` };
      }

      const data = await response.json();
      console.log("📥 LLM Helper: Full API response received");


      // Log usage statistics
      if (data.usage) {
        console.log("📊 Token usage - Input:", data.usage.input_tokens,
                    "| Output:", data.usage.output_tokens,
                    "| Total:", data.usage.total_tokens);
      }

      // Log request ID for tracking (useful when store=true)
      if (data.id) {
        console.log("🆔 Request ID:", data.id);
      }

      // Parse the response
      const outputItems = Array.isArray(data.output) ? data.output : [];
      const messageItem = outputItems.find(item => item.type === 'message');
      const messageContent = messageItem && Array.isArray(messageItem.content)
        ? messageItem.content
            .filter(part => part.type === 'output_text' && typeof part.text === 'string')
            .map(part => part.text)
            .join('\n')
            .trim()
        : null;

      if (!messageContent) {
        throw new Error('LLM Helper: No response content returned from model');
      }

      const parsed = JSON.parse(messageContent);

      const choiceLetter = typeof parsed.choice_letter === 'string' ? parsed.choice_letter.trim() || null : null;
      let choiceIndex = null;
      if (typeof parsed.choice_index === 'number') {
        choiceIndex = Number.isFinite(parsed.choice_index) ? parsed.choice_index : null;
      } else if (typeof parsed.choice_index === 'string') {
        const parsedIndex = parseInt(parsed.choice_index, 10);
        if (!Number.isNaN(parsedIndex)) {
          choiceIndex = parsedIndex;
        }
      }
      const answerText = (parsed.answer_text || parsed.answer || null);
      const reasoning = parsed.reasoning || null;

      console.log("✅ LLM Helper: Choice Letter:", choiceLetter);
      console.log("🔢 LLM Helper: Choice Index:", choiceIndex);
      console.log("📝 LLM Helper: Answer Text:", answerText);
      console.log("💡 LLM Helper: Reasoning:", reasoning);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      return {
        success: true,
        choiceIndex,
        choiceLetter,
        answerText,
        reasoning
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
  return { success: false, choiceIndex: null, choiceLetter: null, answerText: null, reasoning: "All retry attempts failed" };
}

