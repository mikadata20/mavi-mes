/**
 * AI Service for Mavi MES 
 * Supports Google Gemini, OpenAI, Anthropic, and Meta/Groq 
 */

const SYSTEM_PROMPT = `
You are a Manufacturing Systems Engineer specializing in Digital Work Instructions and MES (Manufacturing Execution Systems).
Analyze the provided document (SOP, PDF, or Image) and extract the manufacturing process into a structured digital application.

Output MUST be a valid JSON object following this schema:
{
  "name": "Descriptive App Name",
  "steps": [
    {
      "title": "Clear Step Title",
      "stepType": "Step" | "Form Step" | "Signature Form",
      "cycleTimeSeconds": number (default 60),
      "components": [
        {
          "type": "TEXT" | "IMAGE" | "CHECKLIST" | "BUTTON" | "TEXT_INPUT" | "DROPDOWN" | "SIGNATURE" | "QUALITY_PASS_FAIL" | "CAMERA_CAPTURE",
          "x": number (0-1000),
          "y": number (0-600),
          "w": number,
          "h": number,
          "props": { 
             "label": "string",
             "text": "string",
             "items": ["string"],
             "options": ["string"]
          }
        }
      ]
    }
  ]
}
`;

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

async function callGemini(file, settings) {
    const { apiKey, modelId } = settings;
    const base64Data = await fileToBase64(file);
    const mimeType = file.type;
    const cleanModelId = modelId.includes('/') ? modelId.split('/').pop() : modelId;
    const url = `https://generativelanguage.googleapis.com/v1/models/${cleanModelId}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    };

    const response = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.json()).error?.message || 'Gemini Error');
    const result = await response.json();
    return JSON.parse(result.candidates[0].content.parts[0].text);
}

const normalizeProvider = (provider = '') => {
    const key = String(provider || '').trim().toLowerCase();
    if (!key) return '';

    if (['gemini', 'google', 'google gemini'].includes(key)) return 'gemini';
    if (['openai'].includes(key)) return 'openai';
    if (['anthropic', 'claude'].includes(key)) return 'anthropic';
    if (['groq', 'meta/groq', 'grok'].includes(key)) return 'groq';
    if (['openrouter', 'open router'].includes(key)) return 'openrouter';
    if (['ollama', 'local', 'local ai (ollama)', 'local (ollama/lm studio)'].includes(key)) return 'ollama';
    if (['custom', 'custom api'].includes(key)) return 'custom';

    return key;
};

async function callOpenAI(file, settings, baseUrl = 'https://api.openai.com/v1') {
    const { apiKey, modelId } = settings;
    const base64Data = await fileToBase64(file);
    if (file.type === 'application/pdf' && !baseUrl.includes('groq')) throw new Error('PDF not supported via OpenAI Vision API.');

    const payload = {
        model: modelId,
        messages: [{ role: 'user', content: [{ type: 'text', text: SYSTEM_PROMPT }, { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64Data}` } }] }],
        response_format: { type: 'json_object' }
    };

    const cleanBaseUrl = String(baseUrl || '').replace(/\/$/, '');
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error((await response.json()).error?.message || 'AI API Error');
    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
}

async function callAnthropic(file, settings) {
    const { apiKey, modelId } = settings;
    const base64Data = await fileToBase64(file);

    // Anthropic requires specific headers and format
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'dangerously-allow-browser': 'true' // Note: This usually requires a proxy in production
        },
        body: JSON.stringify({
            model: modelId,
            max_tokens: 4096,
            system: "You are a Manufacturing Systems Engineer. Return valid JSON only.",
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: SYSTEM_PROMPT },
                    { type: 'image', source: { type: 'base64', media_type: file.type, data: base64Data } }
                ]
            }]
        })
    });
    if (!response.ok) throw new Error((await response.json()).error?.message || 'Anthropic Error');
    const result = await response.json();
    return JSON.parse(result.content[0].text);
}

export const processDocument = async (file, connector) => {
    const settings = connector?.aiSettings;
    if (!settings) throw new Error('AI Settings are missing.');

    const provider = normalizeProvider(settings.provider);
    const modelId = String(settings.modelId || '').trim();

    // Provider-first routing so non-Gemini providers don't get forced to Gemini
    if (provider === 'gemini') {
        if (!settings.apiKey) throw new Error('API Key missing in AI Settings.');
        return await callGemini(file, settings);
    }

    if (provider === 'openai') {
        if (!settings.apiKey) throw new Error('API Key missing in AI Settings.');
        return await callOpenAI(file, settings);
    }

    if (provider === 'anthropic') {
        if (!settings.apiKey) throw new Error('API Key missing in AI Settings.');
        return await callAnthropic(file, settings);
    }

    if (provider === 'groq') {
        if (!settings.apiKey) throw new Error('API Key missing in AI Settings.');
        return await callOpenAI(file, settings, 'https://api.groq.com/openai/v1');
    }

    if (provider === 'openrouter') {
        if (!settings.apiKey) throw new Error('API Key missing in AI Settings.');
        return await callOpenAI(file, settings, 'https://openrouter.ai/api/v1');
    }

    if (provider === 'ollama') {
        // Ollama / local OpenAI-compatible endpoint (no API key required by default)
        return await callOpenAI(file, settings, settings.baseUrl || 'http://localhost:11434/v1');
    }

    if (provider === 'custom') {
        const customBaseUrl = settings.baseUrl || connector?.serverAddress;
        if (!customBaseUrl) {
            throw new Error('Custom provider requires baseUrl in AI Settings.');
        }
        return await callOpenAI(file, settings, customBaseUrl);
    }

    // Backward compatibility fallback for legacy rows without provider
    if (modelId.toLowerCase().startsWith('gemini')) {
        if (!settings.apiKey) throw new Error('API Key missing in AI Settings.');
        return await callGemini(file, settings);
    }

    throw new Error(`Provider ${settings.provider || '(empty)'} is not yet fully implemented for document processing.`);
};

/**
 * Generic Chat Completion for various AI providers
 */
export const getChatCompletion = async (messages, connector) => {
    const settings = connector?.aiSettings;
    if (!settings) throw new Error('AI Settings are missing.');

    const provider = normalizeProvider(settings.provider);
    const modelId = settings.modelId;
    const apiKey = settings.apiKey;
    const baseUrl = settings.baseUrl || connector?.serverAddress;

    if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`;
        const payload = {
            contents: messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            })),
            generationConfig: { temperature: 0.7 }
        };
        const response = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
        if (!response.ok) throw new Error((await response.json()).error?.message || 'Gemini Chat Error');
        const result = await response.json();
        return result.candidates[0].content.parts[0].text;
    }

    // OpenAI, Groq, OpenRouter, Ollama, Custom (OpenAI-compatible)
    const openAiUrl = provider === 'groq' ? 'https://api.groq.com/openai/v1' :
                     provider === 'openrouter' ? 'https://openrouter.ai/api/v1' :
                     provider === 'ollama' ? (baseUrl || 'http://localhost:11434/v1') :
                     (baseUrl || 'https://api.openai.com/v1');

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(`${openAiUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: modelId,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature: 0.7
        })
    });

    if (!response.ok) throw new Error((await response.json()).error?.message || 'AI Chat API Error');
    const result = await response.json();
    return result.choices[0].message.content;
};

/**
 * Specialized Advice for Blockly Logic
 */
export const getLogicAdvice = async (userMessage, history, context, connector) => {
    const systemPrompt = `You are the Mavi MES Code Advisor. Your job is to help users build automation logic using Blockly code blocks.
You understand the Mavi MES MIT App Inventor-style environment.

CONTEXT:
- Available Widgets: ${JSON.stringify(context.widgets || [])}
- Available Variables: ${JSON.stringify(context.variables || [])}
- Current Step: ${context.currentStepName || 'Unknown'}

BLOCKLY XML FORMAT:
If you suggest logic, you MUST provide a valid Blockly XML snippet wrapped in <block_xml> tags.
IMPORTANT: Do NOT use markdown code blocks (like \`\`\`xml) inside the <block_xml> tags. Output the RAW XML only.
Example:
"To make the button move, use this block:
<block_xml>
  <block type="set_universal_property">
    <value name="WIDGET">
      <block type="widget_selector"><field name="WIDGET">button_id</field></block>
    </value>
    <field name="PROP">left</field>
    <value name="VALUE">
      <block type="math_number"><field name="NUM">100</field></block>
    </value>
  </block>
</block_xml>"

Be concise and helpful. Respond in the user's language (default to Indonesian if they speak Indonesian).`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessage }
    ];

    return await getChatCompletion(messages, connector);
};
