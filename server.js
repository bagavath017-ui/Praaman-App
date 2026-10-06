require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '15mb' })); // screenshots arrive as base64, keep the limit generous

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'; // cheap, fast — keeps per-use cost low
const API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude({ system, messages, maxTokens = 1024 }) {
  if (!ANTHROPIC_API_KEY) {
    const err = new Error('Server is missing ANTHROPIC_API_KEY — add it to your .env file (see .env.example).');
    err.status = 500;
    throw err;
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages })
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Claude API error ${res.status}: ${text}`);
    err.status = res.status === 429 ? 429 : 500;
    throw err;
  }
  const data = await res.json();
  return (data.content || []).map(b => b.text || '').join('\n');
}

function parseJsonLoose(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch (e) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch (e2) { /* fall through */ } }
    throw new Error('Could not parse the AI response as JSON: ' + text.slice(0, 200));
  }
}

// Analyze one pasted/picked screenshot — extract quote, attribution, suggest category + caption
app.post('/api/analyze-screenshot', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });
    const system = 'You analyze screenshots saved as evidence of someone\'s work (chat messages, emails, notes of appreciation, task boards, dashboards). Reply with ONLY a JSON object, no other text, no markdown fences.';
    const messages = [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/png', data: imageBase64 } },
        { type: 'text', text:
          'Reply with ONLY this JSON object: {' +
          '"quote": the exact text of the key message/praise/result as written if there is one, else "", ' +
          '"attributed_to": who said it if visible (name and/or role), else "", ' +
          '"platform": your best guess (Slack, WhatsApp, Email, LinkedIn, Teams, Jira, GitHub, Other), ' +
          '"suggested_category": exactly one of "Achievement", "Deliverable", "Task", "Meeting", "Appreciation", ' +
          '"suggested_caption": a short first-person one-line caption, under 15 words' +
          '}. Use the exact original wording for "quote" — never paraphrase it.'
        }
      ]
    }];
    const text = await callClaude({ system, messages, maxTokens: 500 });
    res.json(parseJsonLoose(text));
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Clean up a rambling voice-to-text transcript into a proper log entry
app.post('/api/clean-voice', async (req, res) => {
  try {
    const { raw } = req.body;
    if (!raw) return res.status(400).json({ error: 'raw is required' });
    const system = 'You tidy up spoken work-log entries. Reply with ONLY a JSON object, no other text.';
    const messages = [{ role: 'user', content:
      `Raw transcript (may include filler words like "um", "like", repeats itself): "${raw}"\n` +
      'Reply with ONLY this JSON object: {"cleaned_text": a clear concise first-person rewrite keeping all real facts/numbers, "suggested_category": exactly one of "Achievement", "Deliverable", "Task", "Meeting", "Appreciation"}.'
    }];
    const text = await callClaude({ system, messages, maxTokens: 300 });
    res.json(parseJsonLoose(text));
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Full process: one-page summary + themed sections for the PDF portfolio
app.post('/api/process', async (req, res) => {
  try {
    const { entriesText, segment } = req.body;
    if (!entriesText) return res.status(400).json({ error: 'entriesText is required' });
    const frame = segment === 'freelance'
      ? 'This is for a freelancer/consultant building a client-facing proof-of-work portfolio.'
      : 'This is for a corporate employee preparing a portfolio for an appraisal or promotion conversation.';
    const system = 'You turn a raw work log into a professional portfolio. Reply with ONLY a JSON object, no other text, no markdown fences.';
    const messages = [{ role: 'user', content:
      `${frame}\n\nRaw log:\n${entriesText}\n\n` +
      'Some lines include "EVIDENCE (verbatim...)" — exact text from a real screenshot. Quote these EXACTLY when used, with attribution. Never invent a quote or attribute one to someone not named.\n\n' +
      'Reply with ONLY this JSON object: {' +
      '"summary": a punchy specific 250-400 word first-person summary grouped by theme (not chronological), weaving in 1-2 verbatim EVIDENCE quotes if available, ' +
      '"slides": array of 4-6 {"title": string, "bullets": array of 3-5 short punchy bullets, each under 15 words}. First = overview, last = forward-looking "what\'s next". If 2+ EVIDENCE quotes exist, include one section titled like "In their words" whose bullets are the verbatim quotes with attribution.' +
      '}'
    }];
    const text = await callClaude({ system, messages, maxTokens: 2000 });
    res.json(parseJsonLoose(text));
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Quick resume bullets, available anytime without the full process
app.post('/api/bullets', async (req, res) => {
  try {
    const { entriesText } = req.body;
    if (!entriesText) return res.status(400).json({ error: 'entriesText is required' });
    const system = 'You write resume bullets from a work log. Reply with ONLY a JSON object, no other text.';
    const messages = [{ role: 'user', content:
      `Work log:\n${entriesText}\n\n` +
      'Reply with ONLY this JSON object: {"bullets": array of 3-6 ATS-friendly resume bullets, each under 20 words, starting with a strong verb, quantified where the log supports it}.'
    }];
    const text = await callClaude({ system, messages, maxTokens: 500 });
    res.json(parseJsonLoose(text));
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Chat over the logged work
app.post('/api/chat', async (req, res) => {
  try {
    const { entriesText, history } = req.body;
    if (!entriesText || !Array.isArray(history) || !history.length) {
      return res.status(400).json({ error: 'entriesText and history are required' });
    }
    const system = `You answer questions about a person's logged work history, to help them prep for appraisals, interviews or client updates. Here is their raw log:\n${entriesText}\n\nAnswer concisely and specifically. If the log doesn't have enough info, say so plainly rather than inventing details.`;
    const text = await callClaude({ system, messages: history, maxTokens: 600 });
    res.json({ reply: text });
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pramaan server running at http://localhost:${PORT}`));
