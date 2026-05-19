const Groq = require('groq-sdk');

function makeClient(apiKey) {
  if (!apiKey || apiKey === 'dummy_groq_api_key') return null;
  return new Groq({ apiKey });
}

const clients = [
  makeClient(process.env.GROQ_API_KEY),
  makeClient(process.env.GROQ_API_KEY_2),
].filter(Boolean);

function extractRetryAfterMs(err) {
  // Groq returns "Please try again in 2.865s" — extract the seconds
  const match = err?.message?.match(/try again in ([\d.]+)s/);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 200; // add 200ms buffer
  return 4000; // default 4s
}

async function callAgent(agentName, systemPrompt, inputData, mockResponse) {
  if (clients.length === 0) {
    console.log(`[Mock Agent] ${agentName} — no API key, returning mock.`);
    await new Promise(r => setTimeout(r, 1500));
    return mockResponse;
  }

  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Try each key per attempt
    for (let i = 0; i < clients.length; i++) {
      try {
        const completion = await clients[i].chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: JSON.stringify(inputData) },
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        console.log(`[Groq] ${agentName} — OK (key ${i + 1})`);
        return JSON.parse(content);
      } catch (err) {
        const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.toLowerCase().includes('rate limit');

        if (i < clients.length - 1) {
          // More keys available — always try the next one regardless of error type
          const reason = is429 ? 'rate-limited' : `error: ${err.message}`;
          console.warn(`[Groq] Key ${i + 1} ${reason} — trying key ${i + 2}`);
          continue;
        }

        // Last key failed
        if (is429) {
          const waitMs = extractRetryAfterMs(err);
          if (attempt < MAX_RETRIES - 1) {
            console.warn(`[Groq] All keys rate-limited for ${agentName} — waiting ${waitMs}ms then retrying (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(r => setTimeout(r, waitMs));
            break; // break inner loop, outer loop retries
          }
        } else {
          console.error(`[Groq Error] ${agentName} (key ${i + 1}): ${err.message} — falling back to mock`);
          return mockResponse;
        }
      }
    }
  }

  console.warn(`[Groq] ${agentName} — all retries exhausted, using mock`);
  return mockResponse;
}

module.exports = { callAgent };
