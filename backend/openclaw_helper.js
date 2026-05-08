const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function infer(prompt, options = {}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.7
    })
  });
  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || `Groq request failed with ${response.status}`;
    throw new Error(message);
  }

  if (!data?.choices?.[0]?.message?.content) {
    throw new Error('Groq response did not include assistant content');
  }

  return data.choices[0].message.content;
}

module.exports = { infer };
