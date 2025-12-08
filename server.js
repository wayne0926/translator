require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // Using node-fetch v2

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.static('dist')); // Serve static files from the 'dist' directory

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// --- Translation Endpoint --- 
app.post('/api/translate', async (req, res) => {
    const { text, source_lang, target_lang } = req.body;

    if (!OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'OpenRouter API key not configured.' });
    }
    if (!text || !target_lang) {
        return res.status(400).json({ error: 'Missing required fields: text, target_lang' });
    }

    // Map language codes if necessary (OpenRouter might expect specific formats or full names)
    // Example: 'en' -> 'English', 'zh' -> 'Chinese'
    // This depends heavily on the model chosen and OpenRouter's requirements.
    // For now, we assume the codes are directly usable or the model handles detection/mapping.
    const sourceLangString = source_lang === 'auto' ? 'auto-detect' : source_lang; // Placeholder logic
    const targetLangString = target_lang; // Placeholder logic

    // Special handling for Chinese translations
    let promptAddendum = '';
    if (targetLangString === 'zh' || targetLangString === 'zh-CN' || targetLangString === 'zh-TW' || targetLangString === 'Chinese (Simplified)' || targetLangString === 'Chinese (Traditional)') {
        promptAddendum = `
For Chinese translations:
- Be aware of context-dependent character choice (e.g., 书/書 for book, 预订/預訂 for reservation)
- Use appropriate measure words based on the noun's context
- For Simplified Chinese: use simplified characters (简体字)
- For Traditional Chinese: use traditional characters (繁體字)
- Maintain formal/informal tone appropriate to the original content`;
    }

    // Construct the prompt for the OpenRouter model
    // This prompt structure might need significant adjustment based on the chosen model.
    const prompt = `You are an expert translator specializing in accurate, natural-sounding translations. 

Task: Translate the following text from ${sourceLangString === 'auto-detect' ? 'the detected language' : sourceLangString} to ${targetLangString}.

Input text: ${text}

Instructions:
1. Preserve the original meaning, tone, and context completely.
2. If multiple translations are possible based on context, provide the most appropriate one.
3. For ambiguous words, analyze surrounding context to determine the correct meaning.
4. Consider cultural context and idioms, translating to equivalent expressions in the target language.
5. Maintain formatting, including sentence structure, paragraphs, and special characters.
6. For technical terms, use the standard terminology in the target language.
7. For names and places, follow standard transliteration practices for the target language.
8. DO NOT add explanatory notes or alternative translations in your response.
9. DO NOT include the original text in your response.

Output only the translation text, nothing else:

${promptAddendum}`;

    try {
        console.log(`Sending to OpenRouter: Model=anthropic/claude-3-haiku, Prompt Snippet=${prompt.substring(0, 100)}...`);

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                // Optional: Add HTTP Referer or other headers if needed by OpenRouter
                // 'HTTP-Referer': 'YOUR_SITE_URL', 
                // 'X-Title': 'YOUR_SITE_NAME',
            },
            body: JSON.stringify({
                // --- IMPORTANT: Choose a specific model --- 
                // You need to select a model from OpenRouter suitable for translation.
                // Example: 'google/gemini-pro', 'mistralai/mistral-7b-instruct', etc.
                // Check OpenRouter documentation for available models and their capabilities.
                model: 'google/gemini-2.5-flash', // Using Claude which has good translation capabilities
                messages: [
                    { role: 'user', content: prompt }
                ],
                // Optional parameters for translation optimization
                temperature: 0.3, // Lower temperature for more consistent translations
                max_tokens: 4000, // Adequate space for translations of varying lengths
            }),
        });

        const data = await response.json();
        console.log('Received from OpenRouter:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            console.error('OpenRouter API Error:', data);
            // Try to extract a more specific error message if available
            const errorMessage = data?.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }

        // --- Extract the translation --- 
        // The way to extract the translation depends heavily on the model's response format.
        // Inspect the 'data' object logged above to see the structure.
        // Common structures: data.choices[0].message.content, data.choices[0].text, etc.
        const rawTranslation = data?.choices?.[0]?.message?.content?.trim();

        if (!rawTranslation) {
            console.error('Could not extract translation from OpenRouter response:', data);
            throw new Error('Failed to parse translation from API response.');
        }

        // Clean up the translation - remove any explanatory notes or prefixes the model might add
        let translation = rawTranslation;
        
        // Remove any "Translation:" prefix if present
        translation = translation.replace(/^(Translation:|翻译:|译文:|Translated text:)/i, '').trim();
        
        // Remove any explanatory notes that might follow the translation
        translation = translation.split(/(\n\n|\n)(Note:|注:|备注:|PS:|说明:|Explanation:)/i)[0].trim();
        
        // If the model wrapped the translation in quotes, remove them
        translation = translation.replace(/^["'](.*)["']$/s, '$1').trim();

        res.json({ translation: translation });

    } catch (error) {
        console.error('Error in /api/translate:', error);
        res.status(500).json({ error: error.message || 'An internal server error occurred.' });
    }
});

// --- Start Server --- 
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
}); 