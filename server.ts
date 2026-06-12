import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";

const geminiClient = process.env.GEMINI_API_KEY ? new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// Helper function for web search results
async function fetchWebSearchResults(query: string): Promise<string> {
  try {
    console.log(`[SEARCH] Querying DuckDuckGo HTML search for: "${query}"`);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    
    if (!res.ok) {
      throw new Error(`DuckDuckGo returned HTTP error ${res.status}`);
    }
    
    const html = await res.text();
    const results: Array<{ title: string; link: string; snippet: string }> = [];
    
    // Extract search results from the raw HTML code securely without adding cheerio
    const blockRegex = /<div class="result results_links results_links_deep web-result[^"]*">([\s\S]*?)<\/div>\s*<\/div>/gi;
    let match;
    let rank = 1;
    
    while ((match = blockRegex.exec(html)) !== null && rank <= 5) {
      const block = match[1];
      const titleLinkMatch = block.match(/<a class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
      
      if (titleLinkMatch) {
        let link = titleLinkMatch[1];
        if (link.includes("uddg=")) {
          const uMatch = link.match(/uddg=([^&]+)/i);
          if (uMatch) link = decodeURIComponent(uMatch[1]);
        }
        
        const title = titleLinkMatch[2].replace(/<[^>]+>/g, "").trim();
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";
        
        if (title && link) {
          results.push({ title, link, snippet });
          rank++;
        }
      }
    }
    
    if (results.length === 0) {
      // Keyless API search abstract fallback
      const fallbackRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
      if (fallbackRes.ok) {
        const json = await fallbackRes.json();
        if (json.AbstractText) {
          return `### Abstract Search Result:\n\n**Title**: ${json.Heading || query}\n**Abstract**: ${json.AbstractText}\n**Source**: ${json.AbstractURL || ""}`;
        }
      }
      return "No active key-free search matches could be established.";
    }
    
    let formatted = `### Google & Web Search Results:\n\n`;
    results.forEach((r, idx) => {
      formatted += `**[${idx + 1}]** [${r.title}](${r.link})\n> ${r.snippet}\n\n`;
    });
    return formatted;
  } catch (err: any) {
    console.error("fetchWebSearchResults execution failed:", err);
    return `Web search failed: ${err.message || err}`;
  }
}
// Helper function to retry Gemini API calls
async function generateContentWithRetry(model: string, contents: any[], config: any, retries = 3): Promise<any> {
    throw new Error("Gemini API is disabled.");
}

// Helper function to inspect and look up on custom URLs
async function scrapeUrlContent(url: string): Promise<string> {
  try {
    console.log(`[SCRAPER] Loading page elements for URL: "${url}"`);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!res.ok) {
      return `Failed to inspect URL content (HTTP error status ${res.status})`;
    }
    
    const html = await res.text();
    
    // Strip script, style, iframe metadata and get clean text
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<head[\s\S]*?<\/head>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ") // Remove all HTML tag templates
      .replace(/\s+/g, " ")     // Compress spaces
      .trim();
      
    if (text.length > 3000) {
      text = text.substring(0, 3000) + "... [truncated page context]";
    }
    
    return text || "Empty webpage content received.";
  } catch (err: any) {
    console.error("scrapeUrlContent execution failed:", err);
    return `Web page inspection failed: ${err.message || err}`;
  }
}

// Caching structure for nodemailer Ethereal test accounts to make reset PIN generation instant
let cachedTestAccount: any = null;

async function getEtherealTransporter() {
  if (cachedTestAccount) {
    return nodemailer.createTransport({
      host: cachedTestAccount.smtp.host,
      port: cachedTestAccount.smtp.port,
      secure: cachedTestAccount.smtp.secure,
      auth: {
        user: cachedTestAccount.user,
        pass: cachedTestAccount.pass
      }
    });
  }
  
  console.log("[MAIL] Pre-provisioning secure Ethereal sandbox keyless account...");
  cachedTestAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: cachedTestAccount.smtp.host,
    port: cachedTestAccount.smtp.port,
    secure: cachedTestAccount.smtp.secure,
    auth: {
      user: cachedTestAccount.user,
      pass: cachedTestAccount.pass
    }
  });
}

function detectLanguageBackend(text: string): string {
  if (!text) return 'en';
  const clean = text.toLowerCase();
  
  // Scripts - High confidence
  if (/[\u0600-\u06FF]/.test(clean)) return 'ar';
  if (/[\u4e00-\u9fa5]/.test(clean)) return 'zh';
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(clean)) return 'ja';
  
  // Rule-based is too fragile/error-prone (caused false positives for German). 
  // Return 'en' as default, Gemini AI will naturally detect language from prompt.
  return 'en';
}

function getLocalizedGreetingPhrase(lang: string): string {
  const normalized = lang.split('-')[0].toLowerCase();
  switch (normalized) {
    case 'es':
      return "start conversations with '¿En qué te puedo ayudar hoy?' or '¿Cómo te puedo ayudar hoy?'";
    case 'fr':
      return "start conversations with 'Comment puis-je vous aider aujourd'hui ?' or 'De quoi avez-vous besoin aujourd'hui ?'";
    case 'de':
      return "start conversations with 'Wie kann ich dir heute helfen?' or 'Was brauchst du heute Hilfe?'";
    case 'it':
      return "start conversations with 'Come posso aiutarti oggi?' or 'Di cosa hai bisogno oggi?'";
    case 'pt':
      return "start conversations with 'Como posso ajudar você hoje?' or 'Do que você precisa de ajuda hoje?'";
    case 'da':
      return "start conversations with 'Hvordan kan jeg hjælpe dig i dag?' or 'Hvad har du brug for hjælp til i dag?'";
    case 'kl':
      return "start conversations with 'Ullumi qanoq ikiorsinnaavakkit?' or 'Suna pillugu ikiorsinnaavakkit?'";
    case 'zh':
      return "start conversations with '今天有什么我可以帮你的吗？' or '今天你需要什么帮助？'";
    case 'ja':
      return "start conversations with '今日はどのようなお手伝いをしましょうか？' or '今日は何が必要ですか？'";
    case 'ar':
      return "start conversations with 'كيف يمكنني مساعدتك اليوم؟' or 'ما الذي تحتاج المساعدة فيه اليوم؟'";
    default:
      return "start conversations with 'How can I help you today?' or 'What do you need help with today?'";
  }
}

function getLanguageName(code: string): string {
  if (!code || code === 'auto') return "English";
  const normalized = code.toLowerCase();
  if (normalized.startsWith('es')) return "Spanish";
  if (normalized.startsWith('fr')) return "French";
  if (normalized.startsWith('de')) return "German";
  if (normalized.startsWith('it')) return "Italian";
  if (normalized.startsWith('pt')) return "Portuguese";
  if (normalized.startsWith('tr')) return "Turkish";
  if (normalized.startsWith('ja')) return "Japanese";
  if (normalized.startsWith('zh')) return "Chinese";
  if (normalized.startsWith('ko')) return "Korean";
  if (normalized.startsWith('ar')) return "Arabic";
  if (normalized.startsWith('ru')) return "Russian";
  if (normalized.startsWith('so')) return "Somali";
  if (normalized.startsWith('hi')) return "Hindi";
  if (normalized.startsWith('uk')) return "Ukrainian";
  if (normalized.startsWith('pl')) return "Polish";
  if (normalized.startsWith('el')) return "Greek";
  if (normalized.startsWith('cs')) return "Czech";
  if (normalized.startsWith('hu')) return "Hungarian";
  if (normalized.startsWith('ro')) return "Romanian";
  if (normalized.startsWith('nl')) return "Dutch";
  if (normalized.startsWith('sv')) return "Swedish";
  if (normalized.startsWith('no')) return "Norwegian";
  if (normalized.startsWith('fi')) return "Finnish";
  if (normalized.startsWith('vi')) return "Vietnamese";
  if (normalized.startsWith('th')) return "Thai";
  if (normalized.startsWith('id')) return "Indonesian";
  if (normalized.startsWith('da')) return "Danish";
  const base = code.split('-')[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// Helper function for smart fallback ChatBot that uses key-free free public APIs or rule-based NLP bots
async function runOfflineBotFallback(promptText: string, language?: string): Promise<string> {
  const clean = promptText.toLowerCase().trim();
  let lang = language && language !== 'auto' ? language.split('-')[0].toLowerCase() : detectLanguageBackend(promptText);

  // Simple language-aware responses
  const greetings: Record<string, string> = {
    en: "I'm sorry, I'm finding it difficult to process your request at the moment.",
    es: "Lo siento, me está costando procesar tu solicitud en este momento.",
    fr: "Je suis désolé, j'ai du mal à traiter votre demande pour le moment.",
    de: "Es tut mir leid, ich habe derzeit Schwierigkeiten, deine Anfrage zu bearbeiten.",
    so: "Waan ka xumahay, way igu adagtahay inaan habeeyo codsigaaga hadda.",
    zh: "很抱歉，我现在处理您的请求有困难。",
    ar: "أعتذر، أجد صعوبة في معالجة طلبك في الوقت الحالي."
  };

  return greetings[lang] || greetings['en'];
}

async function retryGeminiCall<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.message?.includes("429") || error.message?.includes("quota"))) {
      console.warn(`[GEMINI] 429 Error/Quota limit hit. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryGeminiCall(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

function generatePolishedSvgFallback(prompt: string): string {
  const clean = prompt.trim();
  const lower = clean.toLowerCase();
  
  // Decide gradients and shapes based on category
  let gradientStart = "#1e1e38";
  let gradientEnd = "#0f0f1b";
  let accentColor = "#06b6d4"; // Cyan-500
  let categoryName = "Abstract Conceptualization";
  let graphicSvg = "";
  
  if (lower.match(/space|galaxy|planet|star|universe|rocket|moon|sun|astronaut/)) {
    gradientStart = "#111827"; // Slate dark
    gradientEnd = "#311042";   // Cosmic violet
    accentColor = "#a855f7";   // Purple-500
    categoryName = "Cosmic Exploration Mapping";
    // Retro Planet drawing
    graphicSvg = `
      <!-- Planets & Stars -->
      <g opacity="0.8">
        <circle cx="120" cy="100" r="1.5" fill="#ffffff" opacity="0.6"/>
        <circle cx="380" cy="150" r="2" fill="#ffffff" opacity="0.9" filter="blur(1px)"/>
        <circle cx="200" cy="350" r="1" fill="#ffffff" opacity="0.4"/>
        <circle cx="420" cy="80" r="2.5" fill="#ffffff" opacity="0.8"/>
        <circle cx="80" cy="280" r="1.5" fill="#ffffff" opacity="0.5"/>
      </g>
      <g transform="translate(256, 220)">
        <ellipse cx="0" cy="0" rx="140" ry="30" fill="none" stroke="${accentColor}" stroke-width="4" opacity="0.7" transform="rotate(-15)" />
        <ellipse cx="0" cy="0" rx="160" ry="36" fill="none" stroke="#22d3ee" stroke-width="2" opacity="0.4" transform="rotate(-15)" stroke-dasharray="8 4" />
        <circle cx="0" cy="0" r="70" fill="url(#planetGrad)" filter="url(#glowFilter)"/>
        <circle cx="0" cy="0" r="69" fill="url(#planetGleam)" opacity="0.8"/>
        <ellipse cx="0" cy="0" rx="140" ry="30" fill="none" stroke="${accentColor}" stroke-width="4" opacity="1" transform="rotate(-15)" stroke-dasharray="140 140" />
      </g>
      <defs>
        <radialGradient id="planetGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#ec4899" />
          <stop offset="60%" stop-color="#3b0764" />
          <stop offset="100%" stop-color="#0f051d" />
        </radialGradient>
        <radialGradient id="planetGleam" cx="30%" cy="30%" r="40%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
    `;
  } else if (lower.match(/tree|nature|forest|flower|plant|garden|ocean|beach|sea|water|river|lake|leaf/)) {
    gradientStart = "#064e3b"; // Forest dark green
    gradientEnd = "#022c22";   // Deepest green
    accentColor = "#34d399";   // Emerald-400
    categoryName = "Ecosystem & Organic Vector";
    graphicSvg = `
      <!-- Concentric Aura -->
      <circle cx="256" cy="220" r="120" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.1" />
      <circle cx="256" cy="220" r="100" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.2" stroke-dasharray="5 5" />
      <circle cx="256" cy="220" r="80" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.3" />
      <!-- Stylized Sacred Lotus/Leaf -->
      <g transform="translate(256, 220) scale(1.1)">
        <!-- Back leaves -->
        <path d="M0,0 C-40,-50 -60,-10 0,60 C60,-10 40,-50 0,0" fill="url(#organicGrad)" opacity="0.4" />
        <path d="M0,10 C-60,-20 -50,-60 0,-10 C50,-60 60,-20 0,10" fill="url(#organicGrad2)" opacity="0.5" />
        <!-- Center Lotus -->
        <path d="M0,-30 C-30,-70 -30,0 0,20 C30,0 30,-70 0,-30" fill="url(#lotusCenter)" filter="url(#glowFilter)"/>
        <!-- Fine golden stems -->
        <path d="M0,20 L0,50" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
      </g>
      <defs>
        <linearGradient id="organicGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10b981"/>
          <stop offset="100%" stop-color="#047857"/>
        </linearGradient>
        <linearGradient id="organicGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#6ee7b7"/>
          <stop offset="100%" stop-color="#065f46"/>
        </linearGradient>
        <linearGradient id="lotusCenter" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fb7185"/>
          <stop offset="100%" stop-color="#db2777"/>
        </linearGradient>
      </defs>
    `;
  } else if (lower.match(/tech|ai|robot|futuristic|cyber|code|computer|digital|matrix|neon|circuit|system/)) {
    gradientStart = "#090d16"; // Shadow black
    gradientEnd = "#0c1524";   // Deep digital slate
    accentColor = "#22d3ee";   // Cyan-450
    categoryName = "Cybernetic System Interface";
    graphicSvg = `
      <g transform="translate(256, 210)">
        <!-- Central glowing core -->
        <circle cx="0" cy="0" r="60" fill="url(#techCore)" filter="url(#glowFilter)"/>
        <!-- Circuit grids -->
        <line x1="-120" y1="0" x2="120" y2="0" stroke="${accentColor}" stroke-width="2" opacity="0.4" />
        <line x1="0" y1="-120" x2="0" y2="120" stroke="${accentColor}" stroke-width="2" opacity="0.4" />
        <!-- Diagonal circuitry -->
        <line x1="-80" y1="-80" x2="80" y2="80" stroke="${accentColor}" stroke-width="1.5" opacity="0.25" stroke-dasharray="4 2"/>
        <line x1="80" y1="-80" x2="-80" y2="80" stroke="${accentColor}" stroke-width="1.5" opacity="0.25" stroke-dasharray="4 2"/>
        <!-- Ring system -->
        <circle cx="0" cy="0" r="90" fill="none" stroke="#60a5fa" stroke-width="2" opacity="0.3" stroke-dasharray="12 6" />
        <circle cx="0" cy="0" r="110" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.15" />
        <!-- Node points -->
        <circle cx="-80" cy="0" r="5" fill="#60a5fa" />
        <circle cx="80" cy="0" r="5" fill="#60a5fa" />
        <circle cx="0" cy="-80" r="5" fill="#22d3ee" />
        <circle cx="0" cy="80" r="5" fill="#22d3ee" />
        <rect x="-45" y="-45" width="90" height="90" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.6" transform="rotate(45)" />
      </g>
      <defs>
        <radialGradient id="techCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="1"/>
          <stop offset="70%" stop-color="#1d4ed8" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
        </radialGradient>
      </defs>
    `;
  } else if (lower.match(/cat|dog|animal|panda|lion|bird|wolf|bear|dragon|fox|horse|fish|shark/)) {
    gradientStart = "#2d1b10"; // Fur warm charcoal
    gradientEnd = "#0f0804";   // Deep espresso obsidian
    accentColor = "#f97316";   // Orange-500
    categoryName = "Minimalist Animal Silhouette";
    graphicSvg = `
      <!-- Sun Backing -->
      <circle cx="256" cy="220" r="110" fill="url(#sunGrad)" opacity="0.8"/>
      <g transform="translate(256, 210) scale(1.1)">
        <!-- Beautiful minimalist animal profile representation (Abstract Origami Fox/Wolf) -->
        <polygon points="0,-60 -40,10 -15,20" fill="#ea580c" opacity="0.9"/>
        <polygon points="0,-60 40,10 15,20" fill="#ea580c" opacity="0.75"/>
        <polygon points="0,-60 0,30 -15,20" fill="#f97316" filter="url(#glowFilter)"/>
        <polygon points="0,-60 0,30 15,20" fill="#ffedd5" />
        <!-- Ears -->
        <polygon points="-15,-50 -35,-85 -5,-62" fill="#ea580c" />
        <polygon points="15,-50 35,-85 5,-62" fill="#c2410c" />
        <polygon points="-15,-50 -25,-75 -10,-55" fill="#ffedd5" />
        <!-- Nose Tip -->
        <polygon points="0,25 -5,35 5,35" fill="#0f172a" />
      </g>
      <defs>
        <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#7c2d12" stop-opacity="0"/>
        </linearGradient>
      </defs>
    `;
  } else if (lower.match(/person|woman|man|face|portrait|girl|boy|lady|guy|model|couple|human/)) {
    gradientStart = "#1e1b4b"; // Dark royal blue
    gradientEnd = "#030712";   // Rich black
    accentColor = "#ec4899";   // Pink-500
    categoryName = "Fine Art Human Silhouette";
    graphicSvg = `
      <!-- Halo background rings -->
      <circle cx="256" cy="210" r="110" fill="none" stroke="#db2777" stroke-width="1.5" opacity="0.25" />
      <circle cx="256" cy="210" r="95" fill="none" stroke="#f472b6" stroke-width="1" stroke-dasharray="12 4" opacity="0.15" />
      <g transform="translate(256, 210)">
        <!-- Elegant vector profile art -->
        <path d="M-60,70 C-50,20 -40,-40 0,-50 C30,-58 45,-30 40,0 C36,30 50,45 35,55 C20,65 15,40 5,45 C-10,50 -15,65 -30,68 Z" fill="url(#silhouetteGrad)" filter="url(#glowFilter)"/>
        <path d="M-55,70 C-45,22 -35,-38 0,-48 C25,-55 40,-28 35,0 C32,28 44,42 31,51 C18,60 12,38 2,42 C-11,47 -16,62 -28,65 Z" fill="#ffffff" opacity="0.9" />
        <circle cx="15" cy="-20" r="6" fill="#fb7185" />
      </g>
      <defs>
        <linearGradient id="silhouetteGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ec4899" />
          <stop offset="100%" stop-color="#4f46e5" />
        </linearGradient>
      </defs>
    `;
  } else {
    // Abstract general visual design
    gradientStart = "#1e1b4b"; // Dark cosmic blue
    gradientEnd = "#090514";   // Obsidian
    accentColor = "#818cf8";   // Indigo-400
    categoryName = "Stellar Abstract Blueprint";
    graphicSvg = `
      <!-- Sacred Geometry -->
      <g transform="translate(256, 210)" opacity="0.8">
        <circle cx="0" cy="0" r="90" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.4" />
        <circle cx="0" cy="0" r="70" fill="url(#indigoAura)" filter="url(#glowFilter)" />
        <circle cx="0" cy="0" r="50" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity="0.6" stroke-dasharray="3 3"/>
        <!-- Golden ratio spiral representation or overlapping polygon -->
        <rect x="-45" y="-45" width="90" height="90" fill="none" stroke="#c084fc" stroke-width="2" opacity="0.6" transform="rotate(0)"/>
        <rect x="-45" y="-45" width="90" height="90" fill="none" stroke="#c084fc" stroke-width="1" opacity="0.3" transform="rotate(30)"/>
        <rect x="-45" y="-45" width="90" height="90" fill="none" stroke="#c084fc" stroke-width="1" opacity="0.3" transform="rotate(60)"/>
        <polygon points="0,-100 86,50 -86,50" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.5" />
      </g>
      <defs>
        <radialGradient id="indigoAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#4338ca" stop-opacity="0"/>
        </radialGradient>
      </defs>
    `;
  }

  // Sanitize prompt for SVG inclusion
  const xmlSafePrompt = clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  // Truncate safely
  const displayName = xmlSafePrompt.length > 36 ? xmlSafePrompt.substring(0, 33) + "..." : xmlSafePrompt;

  const fullSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
      <!-- Definitions & Filters -->
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${gradientStart}" />
          <stop offset="100%" stop-color="${gradientEnd}" />
        </linearGradient>
        <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02" />
        </linearGradient>
      </defs>

      <!-- Frame Card Shadow / BG -->
      <rect x="0" y="0" width="512" height="512" rx="40" fill="url(#bgGrad)" />
      
      <!-- Ambient Outer Glow Grid -->
      <rect x="15" y="15" width="482" height="482" rx="28" fill="none" stroke="white" stroke-opacity="0.04" stroke-width="2" />
      
      <g stroke="white" stroke-width="0.5" opacity="0.07">
        <!-- Radial alignment grids -->
        <line x1="256" y1="40" x2="256" y2="472" />
        <line x1="40" y1="256" x2="472" y2="256" />
        <circle cx="256" cy="256" r="180" fill="none" stroke-dasharray="2 6"/>
        <circle cx="256" cy="256" r="100" fill="none" stroke-dasharray="2 6"/>
      </g>

      <!-- Category Tag Header (Top Left Context) -->
      <g transform="translate(40, 48)">
        <rect x="0" y="0" width="195" height="24" rx="12" fill="white" fill-opacity="0.05" stroke="white" stroke-opacity="0.1" stroke-width="1" />
        <circle cx="12" cy="12" r="4" fill="${accentColor}" />
        <text x="24" y="15.5" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" font-size="9" font-weight="700" fill="#94a3b8" letter-spacing="1">${categoryName.toUpperCase()}</text>
      </g>
      
      <!-- Code Label Status Tag (Top Right Context) -->
      <g transform="translate(372, 48)">
        <rect x="0" y="0" width="100" height="24" rx="12" fill="white" fill-opacity="0.05" stroke="white" stroke-opacity="0.1" stroke-width="1" />
        <text x="50" y="15.5" text-anchor="middle" font-family="monospace, 'JetBrains Mono', Courier" font-size="9" font-weight="700" fill="${accentColor}" letter-spacing="1">VEC_2.0_SAFE</text>
      </g>

      <!-- Graphics Injected Here -->
      ${graphicSvg}

      <!-- Bottom metadata frame -->
      <g transform="translate(40, 412)">
        <!-- Box backing -->
        <rect x="0" y="0" width="432" height="60" rx="16" fill="url(#metalGrad)" stroke="white" stroke-opacity="0.08" stroke-width="1.5" />
        <!-- Glowing left bar -->
        <rect x="0" y="0" width="6" height="60" rx="3" fill="${accentColor}" />
        
        <!-- Prompt text -->
        <text x="24" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" font-size="13" font-weight="800" fill="#ffffff" letter-spacing="-0.3">"${displayName}"</text>
        
        <!-- Offline generation credits -->
        <text x="24" y="44" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" font-size="9.5" font-weight="500" fill="#64748b">Procedural synthesis engine</text>
        
        <!-- Compass/Crosshair graphic on the right -->
        <g transform="translate(396, 30)" stroke="white" stroke-width="1" stroke-opacity="0.4" fill="none">
          <circle cx="0" cy="0" r="10" />
          <line x1="-14" y1="0" x2="14" y2="0" />
          <line x1="0" y1="-14" x2="0" y2="14" />
        </g>
      </g>
    </svg>
  `;

  return Buffer.from(fullSvg.trim()).toString('base64');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoint for chat
  app.post("/api/chat", async (req, res) => {
    const startTime = Date.now();
    let lastUserMsg = "";
    let language = "auto";
    try {
      const { messages, model, language: bodyLanguage } = req.body;
      if (bodyLanguage) {
        language = bodyLanguage;
      }

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages array is required" });
      }

      const lastMessageObj = messages[messages.length - 1];
      lastUserMsg = lastMessageObj?.content || "";
      
      const targetLanguage = getLanguageName(language);
      const agnesMessages = [
        {
          role: "system",
          content: `You are Agnes, a world-class, globally-ranked multilingual NLP engine. 
          
          CRITICAL INSTRUCTIONS:
          1. Comprehend user input perfectly, regardless of what language it is written in (Spanish, Japanese, Arabic, Vietnamese, French, etc.).
          2. Conduct deep Natural Language Processing (NLP) analysis on the input.
          3. You MUST formulate your final output entirely in the requested target language: "${targetLanguage}".
          
          Format your output with clear headers evaluating:
          - Detected Input Language
          - Sentiment Analysis (Positive, Negative, Neutral with confidence)
          - Core Named Entities (People, Places, Organizations, or key concepts)
          - Executive Summary of Intent
          
          If the user is just having a regular conversation, greeting you, speaking casually, or conversing via voice, respond naturally and conversationally in the requested target language ("${targetLanguage}") instead of using analytical templates.`
        },
        ...messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      ];
      
      // Determine which Agnes AI client to use: environment key
      const apiKey = process.env.AGNES_API_KEY;
      const activeClient = apiKey ? new OpenAI({
         apiKey: apiKey,
         baseURL: "https://apihub.agnes-ai.com/v1"
      }) : null;
      
      const { openRouterKey } = req.body;
      const openRouterApiKey = openRouterKey || process.env.OPENROUTER_API_KEY;

      let reply: string;
      let imageUrl: string | undefined = undefined;

      const cleanPrompt = lastUserMsg.toLowerCase().trim();
      const isImageRequest = 
        cleanPrompt.includes("generate a picture") || 
        cleanPrompt.includes("generate an image") ||
        cleanPrompt.includes("make a picture") ||
        cleanPrompt.includes("please draw") ||
        cleanPrompt.includes("create an image") ||
        cleanPrompt.includes("create a picture") ||
        cleanPrompt.includes("draw me") ||
        cleanPrompt.includes("draw a") ||
        cleanPrompt.includes("photo of") ||
        cleanPrompt.includes("picture of") ||
        cleanPrompt.includes("image of") ||
        cleanPrompt.startsWith("draw ") ||
        cleanPrompt.startsWith("paint ") ||
        cleanPrompt.startsWith("generate ") ||
        cleanPrompt.startsWith("create ") ||
        ((cleanPrompt.endsWith("image") || cleanPrompt.endsWith("picture") || cleanPrompt.endsWith("photo") || cleanPrompt.endsWith("drawing")) &&
         !cleanPrompt.includes("how to") && !cleanPrompt.includes("why"));

      // Attempt online generation
      if (isImageRequest) {
        if (openRouterApiKey) {
          try {
            console.log(`[OPENROUTER-IMAGE] User requested an image. Invoking gpt-3.5-turbo via OpenRouter to dynamically generate highly-detailed custom raw SVG XML...`);
            const openRouterClient = new OpenAI({
              apiKey: openRouterApiKey.trim(),
              baseURL: "https://openrouter.ai/api/v1",
              defaultHeaders: {
                "HTTP-Referer": "https://ai.studio/build",
                "X-Title": "AI Studio GPT-3.5-Turbo Image Generation",
              }
            });

            const imagePrompt = `You are an elite vector artist and professional SVG designer.
Generate a gorgeous, high-fidelity, creative raw XML SVG code representing the user's graphic design prompt: "${lastUserMsg}".
GUIDELINES:
1. Output ONLY a valid, standard, raw XML SVG structure. It must begin with "<svg " or "<svg\\n" and end with "</svg>".
2. Do not wrap the SVG code in markdown backticks or blockquotes. Do not write any explanations, markdown annotations, comments, introduction, or warnings. Output ONLY raw SVG code.
3. Incorporate beautiful gradients, shadows, vibrant colors, clean shapes, curves, and elegant layered elements to make it look like a stunning modern graphic artwork.
4. Set viewBox="0 0 512 512" and ensure there is a solid color background rect (e.g. <rect width="100%" height="100%" fill="#0a0a1a" />) so it is a fully rendered painting.`;

            const response = await openRouterClient.chat.completions.create({
              model: "openai/gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: imagePrompt
                },
                {
                  role: "user",
                  content: `Create a gorgeous SVG vector art image matching this prompt exactly: "${lastUserMsg}"`
                }
              ],
            });

            let svgContent = response.choices?.[0]?.message?.content || "";
            
            // Clean up any potential markdown wrapping (e.g. ```xml or ```svg or ```)
            svgContent = svgContent.replace(/```(?:xml|svg)?/gi, "").trim();
            
            // Extract the SVG content precisely
            const svgStartIdx = svgContent.indexOf("<svg");
            const svgEndIdx = svgContent.lastIndexOf("</svg>");
            if (svgStartIdx !== -1 && svgEndIdx !== -1) {
              svgContent = svgContent.substring(svgStartIdx, svgEndIdx + 6);
            }

            if (svgContent.includes("<svg") && svgContent.includes("</svg>")) {
              const svgBase64 = Buffer.from(svgContent, "utf-8").toString("base64");
              imageUrl = `data:image/svg+xml;base64,${svgBase64}`;
              reply = `🎨 **Dynamic Masterpiece Created by gpt-3.5-turbo via OpenRouter**\n\nI have successfully designed and painted a stunning, fully-custom raw vector artwork matching: "${lastUserMsg}".`;
            } else {
              throw new Error("No valid XML SVG block returned from OpenRouter gpt-3.5-turbo");
            }
          } catch (error: any) {
            console.warn("[CHAT] GPT-3.5 Image generation rate limited or failed. Triggering backup vector fallback...", error);
            const svgBase64 = generatePolishedSvgFallback(lastUserMsg);
            imageUrl = `data:image/svg+xml;base64,${svgBase64}`;
            reply = `🎨 **Bespoke Artwork Constructed for "${lastUserMsg}" (Fallback)**\n\nI have successfully procedurally mapped, styled, and rendered a clean high-fidelity vector illustration matching your prompt.`;
          }
        } else {
          console.log("[CHAT] No OpenRouter API key found for image generation. Returning fallback vector art.");
          const svgBase64 = generatePolishedSvgFallback(lastUserMsg);
          imageUrl = `data:image/svg+xml;base64,${svgBase64}`;
          reply = `🎨 **Bespoke Artwork Constructed for "${lastUserMsg}"**\n\nI have successfully procedurally mapped, styled, and rendered a gorgeous high-fidelity vector illustration matching your prompt.`;
        }
      } else {
        // Text generation
        let targetModel = model;
        if (!targetModel || targetModel === 'agnes-default' || targetModel.startsWith('agnes-') || targetModel.startsWith('meta-llama')) {
          targetModel = 'openai/gpt-3.5-turbo';
        }

        if (targetModel && targetModel !== 'agnes-2.0-flash') {
          if (!openRouterApiKey) {
            reply = `🔑 **OpenRouter API Key Missing**\n\nPlease configure your **OPENROUTER_API_KEY** in your app settings to query **${targetModel}**!`;
          } else {
            try {
              console.log(`[OPENROUTER] Querying OpenRouter OpenAI model: ${targetModel}`);
              const openRouterClient = new OpenAI({
                apiKey: openRouterApiKey.trim(),
                baseURL: "https://openrouter.ai/api/v1",
                defaultHeaders: {
                  "HTTP-Referer": "https://ai.studio/build",
                  "X-Title": "AI Studio Deep Manly Voice Assistant",
                }
              });

              const targetLanguage = getLanguageName(language);
              const formattedMessages = [
                {
                  role: "system",
                  content: `You are an extremely capable, helpful AI assistant powered by the ${targetModel} model on OpenRouter. 
                  You are fully fluent in all world languages. Formulate your final response completely and naturally in the style, grammar, and vocabulary of the requested target language: "${targetLanguage}".
                  Make sure to write your response to be easily spoken in a deep, manly, authoritative voice.`
                },
                ...messages.map((m: any) => ({
                  role: m.role === 'assistant' ? 'assistant' : 'user',
                  content: m.content
                }))
              ];

              const completion = await openRouterClient.chat.completions.create({
                model: targetModel,
                messages: formattedMessages as any,
              });

              reply = completion.choices?.[0]?.message?.content || `OpenRouter model ${targetModel} did not return any output.`;
            } catch (error: any) {
              console.error("[OPENROUTER-CHAT] OpenRouter execution failed:", error);
              reply = `❌ **OpenRouter OpenAI Execution Failed**\n\nFailed to invoke model **${targetModel}**:\n\n\`${error.message || "Unknown error"}\`\n\nPlease double check your api key and model quota.`;
            }
          }
        } else {
          // Default Gemini/Llama fallback flow
          if (geminiClient) {
            try {
              const candidateModel = "gemini-2.0-flash";
              console.log(`[GEMINI-CHAT] Using Gemini AI for fallback generation... Model: ${candidateModel}`);
              const response = await retryGeminiCall(() => geminiClient.models.generateContent({
                model: candidateModel,
                contents: messages.map((m: any) => ({
                  role: m.role === 'assistant' ? 'model' : 'user',
                  parts: [{ text: m.content }]
                })),
              }));
              reply = response.candidates?.[0]?.content?.parts?.[0]?.text || "No response received from Gemini AI.";
            } catch (error: any) {
              console.warn("[CHAT] Online fallback Chat Generation failed, trying local fallback:", error);
              // Call offline fallback bot response
              const localResponse = await runOfflineBotFallback(lastUserMsg, language);
              reply = `🌍 **Local Backup Active**\n\n${localResponse}`;
            }
          } else {
            // No client configured
            console.warn("[CHAT] No client configured. Triggering backup local NLP bot.");
            const localResponse = await runOfflineBotFallback(lastUserMsg, language);
            reply = `🌍 **Local Bot Online**\n\n${localResponse}`;
          }
        }
      }
      
      // Ensure response time is exactly 2 to 3 seconds
      const elapsed = Date.now() - startTime;
      const targetDuration = 200; // Reduced delay to 200ms
      if (elapsed < targetDuration) {
        await new Promise(resolve => setTimeout(resolve, targetDuration - elapsed));
      }

      res.json({ reply, imageUrl });
    } catch (error: any) {
      console.error("[CHAT] Overall critical failure:", error);
      res.status(500).json({ error: error.message || "Internal server error during processing." });
    }
  });



  // API endpoint for Text-to-Speech (Deep Manly Authoritative Voice)
  app.all("/api/tts", async (req: express.Request, res: express.Response) => {
    try {
      const text = (req.method === "POST" ? req.body.text : req.query.text) as string || "";

      if (!text || !text.trim()) {
        return res.status(400).json({ error: "text parameter is required" });
      }

      const cleanText = text.replace(/[\*\#\`\_]/g, '');

      // 1. ElevenLabs TTS removed

      // 2. OpenAI TTS removed
      // 3. ElevenLabs TTS removed

      // 4. Fallback: Return a 200 JSON indicating local speech synthesis is required (stops female voice streaming)
      console.log(`[TTS] No keys configured for premium cloud TTS. Returning fallback instruction to use local male browser synthesis.`);
      return res.status(200).json({
        fallback: true,
        message: "No premium cloud keys found. Directing browser to synthesize local voice."
      });
    } catch (e: any) {
      console.error("[TTS] Exception during TTS processing:", e);
      return res.status(500).json({ error: e.message || "Internal server error during TTS synthesis.", fallback: true });
    }
  });

  // Verification Code Storage for Forgot Password workflow
  const resetCodes = new Map<string, { code: string; expires: number }>();

  // API endpoint to send a password reset verification code
  app.post("/api/send-code", async (req: express.Request, res: express.Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email address is required" });
      }

      const cleanEmail = email.trim().toLowerCase();
      // Generate a 6-digit random code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Store in memory with 10 minutes expiry
      resetCodes.set(cleanEmail, {
        code,
        expires: Date.now() + 10 * 60 * 1000
      });

      console.log(`[AUTH] Generated reset code ${code} for user ${cleanEmail}`);

      let sent = false;
      let debugUrl: string | null = null;
      let sentViaFormSubmit = false;

      // 1. FormSubmit.co Keyless AJAX Email API Integration (Real inbox send without an API key)
      try {
        console.log(`[MAIL] Dispatching password reset keyless email code to ${cleanEmail} via FormSubmit...`);
        const formSubmitRes = await fetch(`https://formsubmit.co/ajax/${cleanEmail}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            _subject: `Secure AI Assistant - Password Reset PIN (${code})`,
            message: `Hello,\n\nYou have requested a password reset code for your Secure AI Assistant account.\n\nYour 6-digit verification PIN is: ${code}\n\nThis PIN will remain fully active for 10 minutes.\n\nIf you did not request this code, please secure your account immediately.`,
            _captcha: "false"
          })
        });

        if (formSubmitRes.ok) {
          const responseBody = await formSubmitRes.json();
          if (responseBody.success === "true" || responseBody.success === true) {
            console.log(`[MAIL] FormSubmit successfully dispatched keyless verification email to ${cleanEmail}!`);
            sentViaFormSubmit = true;
            sent = true;
          }
        }
      } catch (e) {
        console.warn("[MAIL] FormSubmit non-authenticated dispatch failed or rate-limitation hit:", e);
      }

      // 2. Fallback SMTP config
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || `"Secure AI Assistant" <noreply@aiassistant.dev>`;

      // 3. Fallback Resend API key
      const resendKey = process.env.RESEND_API_KEY;

      if (!sent && resendKey) {
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM || "AI Assistant <onboarding@resend.dev>",
              to: [cleanEmail],
              subject: "AI Assistant Security Reset Code",
              html: `
                <div style="font-family: sans-serif; padding: 24px; color: #1e293b; line-height: 1.6; max-width: 480px; border: 1px solid #e2e8f0; border-radius: 16px;">
                  <h2 style="color: #0f172a; margin-bottom: 8px;">Reset Your Password</h2>
                  <p>Here is your 6-digit security verification code configured to allow resetting your AI Assistant account password:</p>
                  <div style="background-color: #f1f5f9; padding: 16px; border-radius: 12px; text-align: center; font-size: 24px; font-weight: bold; color: #0f172a; margin: 18px 0;">
                    ${code}
                  </div>
                  <p style="font-size: 11px; color: #94a3b8; margin-top: 24px;">Configured by your AI Assistant security team. The verification code is active for 10 minutes.</p>
                </div>
              `
            })
          });
          if (response.ok) {
            sent = true;
          } else {
            console.error("Resend API rejected transmission:", await response.text());
          }
        } catch (resendErr) {
          console.error("Resend exception:", resendErr);
        }
      } else if (!sent && smtpHost && smtpUser && smtpPass) {
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass
            }
          });

          await transporter.sendMail({
            from: smtpFrom,
            to: cleanEmail,
            subject: "Your password reset verification code",
            text: `Your reset code is: ${code}`,
            html: `
              <div style="font-family: sans-serif; padding: 24px; color: #1e293b; line-height: 1.6; max-width: 480px; border: 1px solid #e2e8f0; border-radius: 16px;">
                <h2 style="color: #0f172a; margin-bottom: 8px;">Reset Your Password</h2>
                <p>Welcome! Here is your 6-digit security verification code configured to allow resetting your AI Assistant account password:</p>
                <div style="background-color: #f1f5f9; padding: 16px; border-radius: 12px; text-align: center; font-size: 24px; font-weight: bold; color: #0f172a; margin: 18px 0;">
                  ${code}
                </div>
                <p style="font-size: 11px; color: #94a3b8; margin-top: 24px;">Configured by your AI Assistant security team. The verification code is active for 10 minutes.</p>
              </div>
            `
          });
          sent = true;
        } catch (smtpErr) {
          console.error("SMTP transmission exception:", smtpErr);
        }
      }

      // Ethereal developer sandbox (pre-cached, instantly available fallback)
      if (!sent) {
          console.error("[AUTH] Email dispatch failed: No production SMTP or RESEND credentials configured.");
          return res.status(500).json({ error: "Failed to dispatch email verification code. Please configure production mail settings." });
      }

      return res.json({ 
        success: true, 
        message: "Verification code sent successfully.", 
        debugUrl,
        sentViaFormSubmit
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Internal server error during email dispatch." });
    }
  });

  // API endpoint to verify code is valid and matching
  app.post("/api/verify-code", async (req: express.Request, res: express.Response) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: "Email and verification code are required" });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanCode = code.trim();

      const record = resetCodes.get(cleanEmail);
      if (!record) {
        return res.status(400).json({ error: "No active verification request found for this email address." });
      }

      if (record.expires < Date.now()) {
        resetCodes.delete(cleanEmail);
        return res.status(400).json({ error: "Your security verification code has expired. Please request a new one." });
      }

      if (record.code !== cleanCode) {
        return res.status(400).json({ error: "Invalid verification code. Please check your spelling and try again." });
      }

      // Matches! Clean up code
      resetCodes.delete(cleanEmail);
      return res.json({ success: true, message: "Verification successful!" });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Internal server error during verification check." });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Assistant server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
