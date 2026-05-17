import './style.css';

// === FELLAH.AI SYSTEM PROMPT ===
const SYSTEM_PROMPT = `=== FELLAH.AI MASTER SYSTEM PROMPT ===

## IDENTITY
You are Fellah.AI, an expert agricultural advisor with 20 years of field experience in Morocco's Souss-Massa region.
Your expertise covers: tomatoes, citrus (clementine, lemon), argan, peppers, courgettes, green beans, and all major crops of the Agadir basin.

## LINGUISTIC PROTOCOL
- Accept input in any combination of Darija, Moroccan Arabic, French, or Standard Arabic
- ALWAYS respond in the SAME language the farmer used. If mixed: respond in the dominant language
- Use simple, direct vocabulary. No Latin botanical names without immediate plain translation
- Speak like a trusted neighbor. Warm, direct, honest

## REASONING PROTOCOL (MANDATORY)
STEP 1 - OBSERVE: Describe all visual evidence before drawing any conclusion
STEP 2 - HYPOTHESIZE: List 2-3 possible causes ranked by likelihood with evidence
STEP 3 - CONTEXTUALIZE: Filter hypotheses using regional/seasonal/environmental context
STEP 4 - CONCLUDE: State the most probable cause with confidence level (1-5 scale)
STEP 5 - ACT: Provide intervention steps using products available in Agadir souks

## OUTPUT FORMAT (for diagnosis with images)
When analyzing a crop image, return valid JSON:
{
  "diagnosis": "string",
  "confidence": "number (1-5)",
  "urgency": "number (1-5)",
  "evidence": ["string"],
  "differential": [{"cause": "string", "likelihood": "string", "ruling_feature": "string"}],
  "intervention_steps": [{"step": "number", "action": "string", "product": "string", "available_at": "string"}],
  "follow_up_days": "number",
  "disclaimer": "string"
}

For conversational questions (no image), respond naturally in the farmer's language.

## ETHICAL GUARDRAILS
- Always include a disclaimer recommending physical inspection for high-stakes decisions
- Never recommend a product not realistically available within 50km of Agadir
- When confidence below 3/5, explicitly say so and recommend consulting a local agronomist
- Never fabricate statistics or yield data. If uncertain, say: "Maareftich bzaf - consult expert"

## REGIONAL CONTEXT (always active)
- Location: Souss-Massa region, Morocco. Climate: semi-arid, hot dry summers, mild winters
- Primary crops: tomatoes (greenhouse + open field), peppers, citrus, argan, courgettes
- Water: drip irrigation dominant, groundwater pressure increasing
- Market: significant export to Europe via Agadir port (seasonality matters)
- Pest pressure: Tuta absoluta (tomato), citrus leafminer, red spider mite - high incidence
- Common diseases: powdery mildew, fusarium wilt, botrytis

## MARKET PRICES (current week Agadir souk)
- Tomato: 3.5-4.0 DH/kg (trending UP)
- Pepper: 5.0-5.5 DH/kg (trending DOWN)
- Courgette: 3.8-4.3 DH/kg (trending UP)
- Citrus: 6.0-7.0 DH/kg (stable, season ending)
- Export premium active for: tomato, courgette

=== END SYSTEM PROMPT ===`;

// === STAGE PROMPTS ===
const STAGE_PROMPTS = {
  '2A': `STAGE 2A - VISUAL DECOMPOSITION: DO NOT diagnose yet. Describe with precision:
1. AFFECTED AREAS: Which parts show symptoms?
2. COLOR CHANGES: Exact colors (yellowing, browning, spots, etc.)
3. TEXTURE: Surface characteristics (wilting, curling, lesions, mold)
4. DISTRIBUTION: Pattern of symptoms (random, bottom-up, edges first)
5. PRESENCE: Any visible pests or fungal bodies
6. SEVERITY: Estimated percentage of plant affected
7. GROWTH STAGE: Estimate the plant's development stage`,

  '2B': `STAGE 2B - DIFFERENTIAL DIAGNOSIS: Based ONLY on the visual evidence from Stage 2A, list exactly 3 possible causes ranked by likelihood. For each: name (common + local Moroccan name if applicable), likelihood (High/Medium/Low), key evidence supporting it, ruling feature that distinguishes it, typical progression if untreated.`,

  '2C': `STAGE 2C - CONTEXTUAL NARROWING: Apply Souss-Massa context: current season, typical weather patterns, common pest/disease pressure this time of year, irrigation practices. Which diagnosis becomes most likely? Any new cause to consider? State your final single diagnosis with confidence 1-5.`,

  '2D': `STAGE 2D - ACTION SYNTHESIS: Generate the final structured JSON response with intervention steps. Use Moroccan brand names where possible, prices in Dirhams, products available at Agadir agricultural supply stores. Include disclaimer in Darija, French, and Arabic. Return ONLY valid JSON.`
};

// === STATE ===
let chatHistory = [];
let uploadedImage = null;
let uploadedImageBase64 = null;
let isProcessing = false;

// === DOM ELEMENTS ===
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const imageUpload = document.getElementById('image-upload');
const imagePreview = document.getElementById('image-preview');
const previewImg = document.getElementById('preview-img');
const removeImageBtn = document.getElementById('remove-image');
const diagnosisStages = document.getElementById('diagnosis-stages');
const apiKeyInput = document.getElementById('api-key');

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initParticles();
  initAnimations();
  initChat();
  initPhoneDemo();
});

// === NAVBAR ===
function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
  document.getElementById('nav-toggle')?.addEventListener('click', () => {
    document.querySelector('.nav-links')?.classList.toggle('show');
  });
}

// === PARTICLES ===
function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    Object.assign(p.style, {
      position: 'absolute',
      width: `${Math.random() * 4 + 2}px`,
      height: `${Math.random() * 4 + 2}px`,
      background: `rgba(34,197,94,${Math.random() * 0.3 + 0.1})`,
      borderRadius: '50%',
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animation: `float ${Math.random() * 8 + 6}s ease-in-out infinite`,
      animationDelay: `${Math.random() * 4}s`
    });
    container.appendChild(p);
  }
}

// === SCROLL ANIMATIONS ===
function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.feature-card, .pipeline-stage, .market-card, .arch-card, .stat-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
  });

  // Animate stat counters
  const statEl = document.querySelector('[data-target]');
  if (statEl) {
    const target = parseInt(statEl.dataset.target);
    const obs2 = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        animateCounter(statEl, target);
        obs2.disconnect();
      }
    });
    obs2.observe(statEl);
  }
}

function animateCounter(el, target) {
  let current = 0;
  const step = target / 60;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = current >= 1000000 ? (current / 1000000).toFixed(1) + 'M' : Math.floor(current).toLocaleString();
  }, 30);
}

// === PHONE DEMO ===
function initPhoneDemo() {
  const demoChat = document.querySelector('.demo-chat');
  if (!demoChat) return;
  setTimeout(() => {
    const aiMsg = demoChat.querySelector('.demo-msg.ai');
    if (aiMsg) {
      aiMsg.innerHTML = `<p style="font-size:0.82rem;line-height:1.5">Salam! Sfra hadi, dir bal 3la <b>Fusarium</b>. Sift liya photo d l3arq 🌿</p>`;
    }
  }, 3000);
}

// === CHAT ===
function initChat() {
  sendBtn.addEventListener('click', handleSend);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });

  imageUpload.addEventListener('change', handleImageUpload);
  removeImageBtn.addEventListener('click', removeImage);

  document.querySelectorAll('.hint-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chatInput.value = chip.dataset.hint;
      chatInput.focus();
    });
  });
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  uploadedImage = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    uploadedImageBase64 = ev.target.result.split(',')[1];
    previewImg.src = ev.target.result;
    imagePreview.style.display = 'inline-block';
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  uploadedImage = null;
  uploadedImageBase64 = null;
  imagePreview.style.display = 'none';
  previewImg.src = '';
  imageUpload.value = '';
}

function addMessage(role, content, imageUrl) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  const avatar = role === 'ai' ? '🌱' : '👨‍🌾';

  let imgHtml = '';
  if (imageUrl) {
    imgHtml = `<img class="message-image" src="${imageUrl}" alt="Crop photo" />`;
  }

  let contentHtml = content;
  // Try to parse as JSON for structured display
  try {
    const json = JSON.parse(content);
    if (json.diagnosis) {
      contentHtml = renderDiagnosis(json);
    }
  } catch {
    contentHtml = formatText(content);
  }

  div.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      ${imgHtml}
      <div class="message-text">${contentHtml}</div>
    </div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function addTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'message ai';
  div.id = 'typing-msg';
  div.innerHTML = `
    <div class="message-avatar">🌱</div>
    <div class="message-content">
      <div class="message-text">
        <div class="typing-indicator"><span></span><span></span><span></span></div>
      </div>
    </div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function removeTypingIndicator() {
  document.getElementById('typing-msg')?.remove();
}

function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
    .replace(/```json\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
}

function renderDiagnosis(json) {
  const urgencyColor = json.urgency >= 4 ? 'var(--red)' : json.urgency >= 3 ? 'var(--amber)' : 'var(--green)';
  const confColor = json.confidence >= 4 ? 'var(--green)' : json.confidence >= 3 ? 'var(--amber)' : 'var(--red)';

  let diffHtml = '';
  if (json.differential) {
    diffHtml = json.differential.map(d =>
      `<div style="background:var(--bg);padding:0.6rem;border-radius:8px;margin:0.3rem 0;border:1px solid var(--border)">
        <strong>${d.cause}</strong> — <span style="color:var(--amber)">${d.likelihood}</span><br/>
        <small style="color:var(--text3)">${d.ruling_feature}</small>
      </div>`
    ).join('');
  }

  let stepsHtml = '';
  if (json.intervention_steps) {
    stepsHtml = json.intervention_steps.map(s =>
      `<div style="display:flex;gap:0.6rem;align-items:flex-start;margin:0.4rem 0">
        <span style="background:var(--green);color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;flex-shrink:0">${s.step}</span>
        <div><strong>${s.action}</strong><br/><small style="color:var(--text3)">🏪 ${s.product} — ${s.available_at}</small></div>
      </div>`
    ).join('');
  }

  return `
    <div style="border-left:3px solid var(--green);padding-left:1rem;margin-bottom:1rem">
      <h3 style="color:var(--green);margin-bottom:0.3rem">🔬 ${json.diagnosis}</h3>
      <div style="display:flex;gap:1rem;margin:0.5rem 0">
        <span style="font-size:0.78rem">Confidence: <strong style="color:${confColor}">${json.confidence}/5</strong></span>
        <span style="font-size:0.78rem">Urgency: <strong style="color:${urgencyColor}">${json.urgency}/5</strong></span>
        <span style="font-size:0.78rem">Follow-up: <strong>${json.follow_up_days || '?'} days</strong></span>
      </div>
    </div>
    ${json.evidence ? `<div style="margin-bottom:0.8rem"><strong>📋 Evidence:</strong><ul>${json.evidence.map(e => `<li style="font-size:0.85rem">${e}</li>`).join('')}</ul></div>` : ''}
    ${diffHtml ? `<div style="margin-bottom:0.8rem"><strong>🔍 Differential:</strong>${diffHtml}</div>` : ''}
    ${stepsHtml ? `<div style="margin-bottom:0.8rem"><strong>💊 Treatment Plan:</strong>${stepsHtml}</div>` : ''}
    ${json.disclaimer ? `<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:0.6rem;font-size:0.8rem;color:var(--amber)">⚠️ ${json.disclaimer}</div>` : ''}
    <details style="margin-top:0.8rem"><summary style="cursor:pointer;font-size:0.78rem;color:var(--text3)">📄 Raw JSON</summary><pre style="margin-top:0.5rem"><code>${JSON.stringify(json, null, 2)}</code></pre></details>`;
}

// === STAGE PROGRESS ===
function setStage(stage) {
  diagnosisStages.style.display = 'block';
  document.querySelectorAll('.stage-step').forEach(s => {
    s.classList.remove('active', 'done');
  });
  const stages = ['2A', '2B', '2C', '2D'];
  const idx = stages.indexOf(stage);
  stages.forEach((s, i) => {
    const el = document.querySelector(`.stage-step[data-step="${s}"]`);
    if (i < idx) el?.classList.add('done');
    if (i === idx) el?.classList.add('active');
  });
}

function clearStages() {
  diagnosisStages.style.display = 'none';
  document.querySelectorAll('.stage-step').forEach(s => s.classList.remove('active', 'done'));
}

// === SEND MESSAGE ===
async function handleSend() {
  const text = chatInput.value.trim();
  if ((!text && !uploadedImageBase64) || isProcessing) return;

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    addMessage('ai', '⚠️ Please enter your Gemini API key in the sidebar to start. Get one free at [AI Studio](https://aistudio.google.com/apikey)');
    return;
  }

  isProcessing = true;
  sendBtn.disabled = true;

  const imageDataUrl = uploadedImageBase64 ? previewImg.src : null;
  addMessage('farmer', text || '📷 [Crop photo uploaded]', imageDataUrl);

  chatInput.value = '';
  const hasImage = !!uploadedImageBase64;
  const imageB64 = uploadedImageBase64;
  removeImage();

  if (hasImage) {
    await runDiagnosisPipeline(text, imageB64, apiKey);
  } else {
    await runConversation(text, apiKey);
  }

  isProcessing = false;
  sendBtn.disabled = false;
}

// === CONVERSATIONAL (no image) ===
async function runConversation(text, apiKey) {
  const farmerProfile = getFarmerProfile();
  addTypingIndicator();

  chatHistory.push({ role: 'user', parts: [{ text }] });

  try {
    const response = await callGemini(apiKey, [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\nFarmer profile: ' + JSON.stringify(farmerProfile) }] },
      { role: 'model', parts: [{ text: 'Understood. I am Fellah.AI, ready to help.' }] },
      ...chatHistory
    ]);

    removeTypingIndicator();
    chatHistory.push({ role: 'model', parts: [{ text: response }] });
    addMessage('ai', response);
  } catch (err) {
    removeTypingIndicator();
    addMessage('ai', `❌ Error: ${err.message}. Check your API key and try again.`);
  }
}

// === DIAGNOSIS PIPELINE (with image) ===
async function runDiagnosisPipeline(text, imageB64, apiKey) {
  const farmerProfile = getFarmerProfile();
  const stages = ['2A', '2B', '2C', '2D'];
  let context = '';

  for (const stage of stages) {
    setStage(stage);
    addTypingIndicator();

    const stagePrompt = `${SYSTEM_PROMPT}\n\nFarmer profile: ${JSON.stringify(farmerProfile)}\nFarmer's message: "${text || 'Please diagnose this crop'}"\n\n${context ? 'Previous analysis:\n' + context + '\n\n' : ''}${STAGE_PROMPTS[stage]}`;

    try {
      const parts = [{ text: stagePrompt }];
      if (stage === '2A') {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageB64 } });
      }

      const response = await callGemini(apiKey, [{ role: 'user', parts }]);
      removeTypingIndicator();

      if (stage === '2D') {
        addMessage('ai', extractJson(response));
      } else {
        const stageLabel = { '2A': '👁️ Visual Decomposition', '2B': '🔍 Differential Diagnosis', '2C': '🌍 Contextual Narrowing' }[stage];
        addMessage('ai', `**${stageLabel}**\n\n${response}`);
      }
      context += `\n[Stage ${stage}]:\n${response}\n`;
      await delay(500);
    } catch (err) {
      removeTypingIndicator();
      addMessage('ai', `❌ Stage ${stage} failed: ${err.message}`);
      break;
    }
  }

  clearStages();
  document.querySelectorAll('.stage-step').forEach(s => s.classList.add('done'));
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { JSON.parse(match[0]); return match[0]; } catch { /* fallthrough */ }
  }
  return text;
}

// === GEMINI API ===
async function callGemini(apiKey, contents) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          topP: 0.9
        }
      })
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
}

function getFarmerProfile() {
  return {
    name: document.getElementById('farmer-name')?.value || 'Unknown',
    location: document.getElementById('farmer-location')?.value || 'Souss-Massa',
    crop: document.getElementById('farmer-crop')?.value || 'tomato',
    language: document.getElementById('farmer-lang')?.value || 'darija'
  };
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
