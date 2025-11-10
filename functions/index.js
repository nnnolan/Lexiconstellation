const functions = require('firebase-functions');
const { onRequest } = require('firebase-functions/v2/https');
const cors = require('cors')({ origin: true });

// Cloud Function for Gemini API (replaces Express server)
exports.api = onRequest(
  {
    cors: true,
    memory: '256MB',
    timeoutSeconds: 60
  },
  async (req, res) => {
    // Handle CORS preflight
    cors(req, res, async () => {
      // Only allow POST requests to /api/generate-clue
      if (req.method !== 'POST' || !req.path.includes('/generate-clue')) {
        return res.status(404).json({ error: 'Not found' });
      }

      const { word, difficulty, misdirection } = req.body;
      const API_KEY = functions.config().gemini?.api_key || process.env.GEMINI_API_KEY;

      if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
      }

      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

      let prompt = `Generate a single, creative crossword puzzle clue for the word "${word}".
Requirements:
- Difficulty: ${difficulty}
${misdirection ? '- Include misdirection or wordplay (make it tricky!)' : '- Be straightforward and clear'}
- Clue should be concise (under 80 characters)
- Make it engaging and creative
- Return ONLY the clue text, no explanations or numbering
- Be creative and unique, but not too obscure, unless the difficulty warrants it to be more obscure
- Use past tense if the word is a verb, present tense if it is a noun, and past participle if it is a verb ending in -ed or -ing
- Same with plural nouns, use plural verbs and adjectives
- Don't use the word itself in the clue
- Feel free to refrence any form of media, celebrities,culture, history, whatever you seem fit, again bearing in mind the difficulty of the word and request.`;

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          return res.json({ clue: data.candidates[0].content.parts[0].text.trim() });
        } else {
          return res.status(500).json({ error: 'Unexpected API response' });
        }
      } catch (error) {
        console.error('Error calling Gemini API:', error);
        return res.status(500).json({ error: error.message });
      }
    });
  }
);