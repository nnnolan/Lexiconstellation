const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static('public'));

// API endpoint for Gemini (keeps API key server-side)
app.post('/api/generate-clue', async (req, res) => {
    const { word, difficulty, misdirection } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;
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
        
        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            res.json({ clue: data.candidates[0].content.parts[0].text.trim() });
        } else {
            res.status(500).json({ error: 'Unexpected API response' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});