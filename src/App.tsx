import React, { useState, useEffect, useCallback } from 'react';
import { Menu, ArrowUp, Info, HelpCircle, X, ExternalLink, Mic, MessageSquare, Volume2, Loader2, Cpu, Key, Sun, Moon } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import MicButton from './components/MicButton';
import AddMedia from './components/AddMedia';
import Waveform from './components/Waveform';
import VoiceCircle from './components/VoiceCircle';
import { Conversation, Message } from './types';

// Firebase imports
import { db } from './lib/firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query } from 'firebase/firestore';
import AuthForm from './components/AuthForm';

export interface CustomUser {
  email: string;
}

const LANGUAGES = [
  { code: 'auto', label: '🌐 Auto-Detect Voice & Dialect' },
  
  // -- NORTH AMERICA --
  { code: 'en-US', label: '🇺🇸 United States - English' },
  { code: 'es-US', label: '🇺🇸 United States - Español' },
  { code: 'en-CA', label: '🇨🇦 Canada - English' },
  { code: 'fr-CA', label: '🇨🇦 Canada - Français' },
  { code: 'es-MX', label: '🇲🇽 Mexico - Español' },
  { code: 'es-CR', label: '🇨🇷 Costa Rica - Español' },
  { code: 'es-CU', label: '🇨🇺 Cuba - Español' },
  { code: 'es-DO', label: '🇩🇴 Dominican Republic - Español' },
  { code: 'es-SV', label: '🇸🇻 El Salvador - Español' },
  { code: 'es-GT', label: '🇬🇹 Guatemala - Español' },
  { code: 'es-HN', label: '🇭🇳 Honduras - Español' },
  { code: 'es-NI', label: '🇳🇮 Nicaragua - Español' },
  { code: 'es-PA', label: '🇵🇦 Panama - Español' },
  { code: 'en-JM', label: '🇯🇲 Jamaica - English' },
  { code: 'en-BS', label: '🇧🇸 Bahamas - English' },
  { code: 'en-BB', label: '🇧🇧 Barbados - English' },
  { code: 'en-TT', label: '🇹🇹 Trinidad & Tobago - English' },
  { code: 'en-BZ', label: '🇧🇿 Belize - English' },
  { code: 'ht-HT', label: '🇭🇹 Haiti - Kreyòl / French' },
  { code: 'en-AG', label: '🇦🇬 Antigua & Barbuda - English' },
  { code: 'en-DM', label: '🇩🇲 Dominica - English' },
  { code: 'en-GD', label: '🇬🇩 Grenada - English' },
  { code: 'en-KN', label: '🇰🇳 Saint Kitts & Nevis - English' },
  { code: 'en-LC', label: '🇱🇨 Saint Lucia - English' },
  { code: 'en-VC', label: '🇻🇨 Saint Vincent - English' },

  // -- SOUTH AMERICA --
  { code: 'pt-BR', label: '🇧🇷 Brazil - Português' },
  { code: 'es-AR', label: '🇦🇷 Argentina - Español' },
  { code: 'es-CO', label: '🇨🇴 Colombia - Español' },
  { code: 'es-PE', label: '🇵🇪 Peru - Español' },
  { code: 'es-CL', label: '🇨🇱 Chile - Español' },
  { code: 'es-VE', label: '🇻🇪 Venezuela - Español' },
  { code: 'es-EC', label: '🇪🇨 Ecuador - Español' },
  { code: 'es-BO', label: '🇧🇴 Bolivia - Español' },
  { code: 'es-PY', label: '🇵🇾 Paraguay - Español' },
  { code: 'es-UY', label: '🇺🇾 Uruguay - Español' },
  { code: 'en-GY', label: '🇬🇾 Guyana - English' },
  { code: 'nl-SR', label: '🇸🇷 Suriname - Nederlands' },

  // -- EUROPE --
  { code: 'en-GB', label: '🇬🇧 United Kingdom - English' },
  { code: 'fr-FR', label: '🇫🇷 France - Français' },
  { code: 'de-DE', label: '🇩🇪 Germany - Deutsch' },
  { code: 'it-IT', label: '🇮🇹 Italy - Italiano' },
  { code: 'es-ES', label: '🇪🇸 Spain - Español' },
  { code: 'ca-ES', label: '🇪🇸 Spain - Català' },
  { code: 'nl-NL', label: '🇳🇱 Netherlands - Nederlands' },
  { code: 'pt-PT', label: '🇵🇹 Portugal - Português' },
  { code: 'ru-RU', label: '🇷🇺 Russia - Русский' },
  { code: 'da-DK', label: '🇩🇰 Denmark - Dansk' },
  { code: 'sv-SE', label: '🇸🇪 Sweden - Svenska' },
  { code: 'no-NO', label: '🇳🇴 Norway - Norsk' },
  { code: 'fi-FI', label: '🇫🇮 Finland - Suomi' },
  { code: 'is-IS', label: '🇮🇸 Iceland - Íslenska' },
  { code: 'uk-UA', label: '🇺🇦 Ukraine - Українська' },
  { code: 'pl-PL', label: '🇵🇱 Poland - Polski' },
  { code: 'tr-TR', label: '🇹🇷 Turkey - Türkçe' },
  { code: 'el-GR', label: '🇬🇷 Greece - Ελληνικά' },
  { code: 'cs-CZ', label: '🇨🇿 Czechia - Čeština' },
  { code: 'hu-HU', label: '🇭🇺 Hungary - Magyar' },
  { code: 'ro-RO', label: '🇷🇴 Romania - Română' },
  { code: 'bg-BG', label: '🇧🇬 Bulgaria - Български' },
  { code: 'hr-HR', label: '🇭🇷 Croatia - Hrvatski' },
  { code: 'sr-RS', label: '🇷🇸 Serbia - Српски' },
  { code: 'sk-SK', label: '🇸🇰 Slovakia - Slovenčina' },
  { code: 'sl-SI', label: '🇸🇮 Slovenia - Slovenščina' },
  { code: 'et-EE', label: '🇪🇪 Estonia - Eesti' },
  { code: 'lv-LV', label: '🇱🇻 Latvia - Latviešu' },
  { code: 'lt-LT', label: '🇱🇹 Lithuania - Lietuvių' },
  { code: 'mt-MT', label: '🇲🇹 Malta - Malti' },
  { code: 'sq-AL', label: '🇦🇱 Albania - Shqip' },
  { code: 'mk-MK', label: '🇲🇰 North Macedonia - Македонски' },
  { code: 'bs-BA', label: '🇧🇦 Bosnia - Bosanski' },
  { code: 'be-BY', label: '🇧🇾 Belarus - Беларуская' },
  { code: 'ga-IE', label: '🇮🇪 Ireland - Gaeilge' },
  { code: 'la-VA', label: '🇻🇦 Vatican City - Latina' },
  { code: 'lb-LU', label: '🇱🇺 Luxembourg - Lëtzebuergesch' },
  { code: 'de-LI', label: '🇱🇮 Liechtenstein - Deutsch' },
  { code: 'it-SM', label: '🇸🇲 San Marino - Italiano' },
  { code: 'ca-AD', label: '🇦🇩 Andorra - Català' },
  { code: 'fr-MC', label: '🇲🇨 Monaco - Français' },
  { code: 'sq-XK', label: '🇽🇰 Kosovo - Shqip' },
  { code: 'ro-MD', label: '🇲🇩 Moldova - Română' },
  { code: 'nl-BE', label: '🇧🇪 Belgium - Nederlands' },
  { code: 'fr-BE', label: '🇧🇪 Belgium - Français' },
  { code: 'de-CH', label: '🇨🇭 Switzerland - Deutsch' },
  { code: 'fr-CH', label: '🇨🇭 Switzerland - Français' },

  // -- AFRICA --
  { code: 'en-ZA', label: '🇿🇦 South Africa - English' },
  { code: 'af-ZA', label: '🇿🇦 South Africa - Afrikaans' },
  { code: 'zu-ZA', label: '🇿🇦 South Africa - isiZulu' },
  { code: 'xh-ZA', label: '🇿🇦 South Africa - isiXhosa' },
  { code: 'sw-KE', label: '🇰🇪 Kenya - Kiswahili' },
  { code: 'sw-TZ', label: '🇹🇿 Tanzania - Kiswahili' },
  { code: 'en-NG', label: '🇳🇬 Nigeria - English' },
  { code: 'yo-NG', label: '🇳🇬 Nigeria - Yorùbá' },
  { code: 'ig-NG', label: '🇳🇬 Nigeria - Igbo' },
  { code: 'ha-NG', label: '🇳🇬 Nigeria - Hausa' },
  { code: 'fr-SN', label: '🇸🇳 Senegal - Français' },
  { code: 'fr-CI', label: '🇨🇮 Ivory Coast - Français' },
  { code: 'fr-CM', label: '🇨🇲 Cameroon - Français' },
  { code: 'pt-AO', label: '🇦🇴 Angola - Português' },
  { code: 'pt-MZ', label: '🇲🇿 Mozambique - Português' },
  { code: 'en-GH', label: '🇬🇭 Ghana - English' },
  { code: 'am-ET', label: '🇪🇹 Ethiopia - Amharic' },
  { code: 'so-SO', label: '🇸🇴 Somalia - Somali' },
  { code: 'en-UG', label: '🇺🇬 Uganda - English' },
  { code: 'fr-CD', label: '🇨🇩 DR Congo - Français' },
  { code: 'rw-RW', label: '🇷🇼 Rwanda - Kinyarwanda' },
  { code: 'mg-MG', label: '🇲🇬 Madagascar - Malagasy' },
  { code: 'en-ZW', label: '🇿🇼 Zimbabwe - English' },
  { code: 'en-ZM', label: '🇿🇲 Zambia - English' },
  { code: 'en-MW', label: '🇲🇼 Malawi - English' },
  { code: 'en-LR', label: '🇲🇼 Liberia - English' },
  { code: 'en-SL', label: '🇸🇱 Sierra Leone - English' },
  { code: 'en-GM', label: '🇬🇲 Gambia - English' },
  { code: 'fr-GN', label: '🇬🇳 Guinea - Français' },
  { code: 'pt-GW', label: '🇬🇼 Guinea-Bissau - Português' },
  { code: 'fr-GQ', label: '🇬🇶 Equatorial Guinea - Français' },
  { code: 'fr-GA', label: '🇬🇦 Gabon - Français' },
  { code: 'fr-CG', label: '🇨🇬 Congo Rep. - Français' },
  { code: 'fr-CF', label: '🇨🇫 Central African Rep. - Français' },
  { code: 'fr-TD', label: '🇹🇩 Chad - Français' },
  { code: 'fr-NE', label: '🇳🇪 Niger - Français' },
  { code: 'fr-ML', label: '🇲🇱 Mali - Français' },
  { code: 'fr-BF', label: '🇧🇫 Burkina Faso - Français' },
  { code: 'fr-TG', label: '🇹🇬 Togo - Français' },
  { code: 'fr-BJ', label: '🇧🇯 Benin - Français' },
  { code: 'en-SS', label: '🇸🇸 South Sudan - English' },
  { code: 'en-ER', label: '🇪🇷 Eritrea - English' },
  { code: 'dj-DJ', label: '🇩🇯 Djibouti - French / Arabic' },
  { code: 'fr-BI', label: '🇧🇮 Burundi - Français' },
  { code: 'en-LS', label: '🇱🇸 Lesotho - English' },
  { code: 'en-SZ', label: '🇸🇿 Eswatini - English' },
  { code: 'en-BW', label: '🇧🇼 Botswana - English' },
  { code: 'en-NA', label: '🇳🇦 Namibia - English' },
  { code: 'pt-CV', label: '🇨🇻 Cabo Verde - Português' },
  { code: 'fr-KM', label: '🇰🇲 Comoros - Français' },
  { code: 'en-MU', label: '🇲🇺 Mauritius - English' },
  { code: 'fr-SC', label: '🇸🇨 Seychelles - Français' },
  { code: 'pt-ST', label: '🇸🇹 São Tomé - Português' },

  // -- ASIA --
  { code: 'zh-CN', label: '🇨🇳 China - 中文 (简体)' },
  { code: 'zh-TW', label: '🇹🇼 Taiwan - 中文 (繁體)' },
  { code: 'zh-HK', label: '🇭🇰 Hong Kong - 中文 (粵語)' },
  { code: 'ja-JP', label: '🇯🇵 Japan - 日本語' },
  { code: 'ko-KR', label: '🇰🇷 South Korea - 한국어' },
  { code: 'hi-IN', label: '🇮🇳 India - हिन्दी' },
  { code: 'en-IN', label: '🇮🇳 India - English' },
  { code: 'ta-IN', label: '🇮🇳 India - தமிழ்' },
  { code: 'te-IN', label: '🇮🇳 India - తెలుగు' },
  { code: 'mr-IN', label: '🇮🇳 India - मराठी' },
  { code: 'bn-IN', label: '🇮🇳 India - বাংলা' },
  { code: 'gu-IN', label: '🇮🇳 India - ગુજરાતી' },
  { code: 'kn-IN', label: '🇮🇳 India - ಕನ್ನಡ' },
  { code: 'ml-IN', label: '🇮🇳 India - മലയാളം' },
  { code: 'pa-IN', label: '🇮🇳 India - ਪੰਜਾਬੀ' },
  { code: 'ur-PK', label: '🇵🇰 Pakistan - اردو' },
  { code: 'bn-BD', label: '🇧🇩 Bangladesh - বাংলা' },
  { code: 'th-TH', label: '🇹🇭 Thailand - ภาษาไทย' },
  { code: 'id-ID', label: '🇮🇩 Indonesia - Bahasa Indonesia' },
  { code: 'vi-VN', label: '🇻🇳 Vietnam - Tiếng Việt' },
  { code: 'fil-PH', label: '🇵🇭 Philippines - Filipino' },
  { code: 'ms-MY', label: '🇲🇾 Malaysia - Bahasa Melayu' },
  { code: 'en-SG', label: '🇸🇬 Singapore - English' },
  { code: 'my-MM', label: '🇲🇲 Myanmar - Burmese' },
  { code: 'km-KH', label: '🇰🇭 Cambodia - Khmer' },
  { code: 'lo-LA', label: '🇱🇦 Laos - Lao' },
  { code: 'si-LK', label: '🇱🇰 Sri Lanka - Sinhala' },
  { code: 'ne-NP', label: '🇳🇵 Nepal - Nepali' },
  { code: 'dz-BT', label: '🇧🇹 Bhutan - Dzongkha' },
  { code: 'dv-MV', label: '🇲🇻 Maldives - Dhivehi' },
  { code: 'mn-MN', label: '🇲🇳 Mongolia - Mongolian' },
  { code: 'kk-KZ', label: '🇰🇿 Kazakhstan - Kazakh' },
  { code: 'uz-UZ', label: '🇺🇿 Uzbekistan - Uzbek' },
  { code: 'ky-KG', label: '🇰🇬 Kyrgyzstan - Kyrgyz' },
  { code: 'tg-TJ', label: '🇹🇯 Tajikistan - Tajik' },
  { code: 'tk-TM', label: '🇹🇲 Turkmenistan - Turkmen' },
  { code: 'hy-AM', label: '🇦🇲 Armenia - Armenian' },
  { code: 'az-AZ', label: '🇦🇿 Azerbaijan - Azerbaijani' },
  { code: 'ka-GE', label: '🇬🇪 Georgia - Georgian' },
  { code: 'tl-TL', label: '🇹🇱 Timor-Leste - Tetum' },
  { code: 'kp-KP', label: '🇰🇵 North Korea - Korean' },

  // -- MIDDLE EAST --
  { code: 'ar-AE', label: '🇦🇪 UAE - العربية' },
  { code: 'ar-SA', label: '🇸🇦 Saudi Arabia - العربية' },
  { code: 'ar-EG', label: '🇪🇬 Egypt - العربية' },
  { code: 'ar-IQ', label: '🇮🇶 Iraq - العربية' },
  { code: 'ar-MA', label: '🇲🇦 Morocco - العربية' },
  { code: 'ar-DZ', label: '🇩🇿 Algeria - العربية' },
  { code: 'ar-TN', label: '🇹🇳 Tunisia - العربية' },
  { code: 'ar-YE', label: '🇾🇪 Yemen - العربية' },
  { code: 'ar-OM', label: '🇴🇲 Oman - العربية' },
  { code: 'ar-QA', label: '🇶🇦 Qatar - العربية' },
  { code: 'ar-BH', label: '🇧🇭 Bahrain - العربية' },
  { code: 'ar-KW', label: '🇰🇼 Kuwait - العربية' },
  { code: 'ar-JO', label: '🇯🇴 Jordan - العربية' },
  { code: 'ar-LB', label: '🇱🇧 Lebanon - العربية' },
  { code: 'ar-SY', label: '🇸🇾 Syria - العربية' },
  { code: 'ar-LY', label: '🇱🇾 Libya - العربية' },
  { code: 'ar-SD', label: '🇸🇩 Sudan - العربية' },
  { code: 'ar-PS', label: '🇵🇸 Palestine - العربية' },
  { code: 'he-IL', label: '🇮🇱 Israel - עברית' },
  { code: 'fa-IR', label: '🇮🇷 Iran - فارسی' },

  // -- OCEANIA --
  { code: 'en-AU', label: '🇦🇺 Australia - English' },
  { code: 'en-NZ', label: '🇳🇿 New Zealand - English' },
  { code: 'mi-NZ', label: '🇳🇿 New Zealand - Te Reo Māori' },
  { code: 'en-FJ', label: '🇫🇯 Fiji - English' },
  { code: 'en-PG', label: '🇵🇬 Papua New Guinea - English' },
  { code: 'en-SB', label: '🇸🇧 Solomon Islands - English' },
  { code: 'en-VU', label: '🇻🇺 Vanuatu - English' },
  { code: 'en-WS', label: '🇼🇸 Samoa - English' },
  { code: 'en-TO', label: '🇹🇴 Tonga - English' },
  { code: 'en-FM', label: '🇫🇲 Micronesia - English' },
  { code: 'en-MH', label: '🇲🇭 Marshall Islands - English' },
  { code: 'en-PW', label: '🇵🇼 Palau - English' },
  { code: 'en-KI', label: '🇰🇮 Kiribati - English' },
  { code: 'en-NR', label: '🇳🇷 Nauru - English' },
  { code: 'en-TV', label: '🇹🇻 Tuvalu - English' },

  // -- GREENLAND / ARCTIC --
  { code: 'kl-GL', label: '🇬🇱 Greenland - Kalaallisut' },
];

export const getInitialGreeting = (langCode: string): string => {
  const norm = (langCode || 'auto').split('-')[0].toLowerCase();
  switch (norm) {
    case 'es':
      return "¡Hola! ¿En qué te puedo ayudar hoy? 🌟";
    case 'fr':
      return "Bonjour ! Comment puis-je vous aider aujourd'hui ? 🌟";
    case 'de':
      return "Hallo! Wie kann ich dir heute helfen? 🌟";
    case 'it':
      return "Ciao! Come posso aiutarti oggi? 🌟";
    case 'pt':
      return "Olá! Como posso ajudar você hoje? 🌟";
    case 'da':
      return "Hej! Hvordan kan jeg hjælpe dig i dag? 🌟";
    case 'kl':
      return "Aluu! Ullumi qanoq ikiorsinnaavakkit? 🌟";
    case 'zh':
      return "你好！今天有什么我可以帮你的吗？ 🌟";
    case 'ja':
      return "こんにちは！今日はどのようなお手伝いをしましょうか？ 🌟";
    case 'ar':
      return "مرحباً! كيف يمكنني مساعدتك اليوم؟ 🌟";
    default:
      return "Hello! How can I help you today? 🌟";
  }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const [speechLang, setSpeechLang] = useState<string>('auto');

  const [activeModel, setActiveModel] = useState<string>(() => {
    const cached = localStorage.getItem('agnes_active_model');
    return (!cached || cached === 'agnes-default' || cached.startsWith('agnes-')) ? 'openai/gpt-3.5-turbo' : cached;
  });
  const [customModelInput, setCustomModelInput] = useState<string>(() => {
    return localStorage.getItem('agnes_custom_model') || '';
  });
  const [openRouterKeyOverride, setOpenRouterKeyOverride] = useState<string>(() => {
    return localStorage.getItem('agnes_or_key_override') || '';
  });
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const storedEmail = localStorage.getItem('bilo_custom_user');
      if (storedEmail) {
        const key = `bilo_cached_convos_${storedEmail.toLowerCase().trim()}`;
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : [];
      }
    } catch (e) {
      console.warn("Cached convo reading failed:", e);
    }
    return [];
  });

  const [activeId, setActiveId] = useState<string>(() => {
    try {
      const storedEmail = localStorage.getItem('bilo_custom_user');
      if (storedEmail) {
        const key = `bilo_active_id_${storedEmail.toLowerCase().trim()}`;
        return localStorage.getItem(key) || '';
      }
    } catch {}
    return '';
  });

  const [inputValue, setInputValue] = useState<string>(() => {
    try {
      const storedEmail = localStorage.getItem('bilo_custom_user');
      if (storedEmail) {
        const key = `bilo_draft_input_${storedEmail.toLowerCase().trim()}`;
        return localStorage.getItem(key) || '';
      }
    } catch {}
    return '';
  });
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messageCount, setMessageCount] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'text' | 'voice'>('text');
  const [isMicListening, setIsMicListening] = useState<boolean>(false);
  const [globalGrokMode, setGlobalGrokMode] = useState<'fun_rebel' | 'normal_witty'>('normal_witty');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  // Commit real-time cache mutations to local storage for persistent tabs
  useEffect(() => {
    if (currentUser?.email) {
      const email = currentUser.email.toLowerCase().trim();
      try {
        localStorage.setItem(`bilo_cached_convos_${email}`, JSON.stringify(conversations));
        if (activeId) {
          localStorage.setItem(`bilo_active_id_${email}`, activeId);
        }
      } catch (e) {
        console.warn("Cache write failed:", e);
      }
    }
  }, [conversations, activeId, currentUser]);

  // Save unsent draft input field state to local cache as user types
  useEffect(() => {
    if (currentUser?.email) {
      const email = currentUser.email.toLowerCase().trim();
      try {
        localStorage.setItem(`bilo_draft_input_${email}`, inputValue);
      } catch (e) {}
    }
  }, [inputValue, currentUser]);

  useEffect(() => {
    localStorage.setItem('agnes_active_model', activeModel);
    // Sync model selected with the active conversation
    if (currentUser && activeId) {
      const activeObj = conversations.find(c => c.id === activeId);
      if (activeObj && activeObj.modelSelected !== activeModel) {
        const updated = conversations.map(convo => {
          if (convo.id === activeId) {
            const u = { ...convo, modelSelected: activeModel };
            syncConvoToFirestore(currentUser.email, u);
            return u;
          }
          return convo;
        });
        setConversations(updated);
      }
    }
  }, [activeModel, activeId, currentUser]);

  useEffect(() => {
    localStorage.setItem('agnes_custom_model', customModelInput);
  }, [customModelInput]);

  useEffect(() => {
    localStorage.setItem('agnes_or_key_override', openRouterKeyOverride);
  }, [openRouterKeyOverride]);

  // Synchronize dynamic session to load conversations from Firestore
  useEffect(() => {
    const checkSessionAndLoad = async () => {
      const storedEmail = localStorage.getItem('bilo_custom_user');
      if (storedEmail) {
        const cleanEmail = storedEmail.toLowerCase().trim();
        const userDoc = await getDoc(doc(db, 'custom_users', cleanEmail));
        const userData = userDoc.data();
        setCurrentUser({ email: cleanEmail });
        setErrorMessage(null);
        try {
          const userConvosPath = `custom_users/${cleanEmail}/conversations`;
          const q = query(collection(db, userConvosPath));
          const querySnapshot = await getDocs(q);
          const loaded: Conversation[] = [];

          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const rawModel = data.modelSelected;
            const sanitizedModel = (!rawModel || rawModel === 'agnes-default' || rawModel.startsWith('agnes-')) ? 'openai/gpt-3.5-turbo' : rawModel;
            loaded.push({
              id: docSnap.id,
              title: data.title || 'Untitled',
              messages: data.messages || [],
              created_at: data.created_at || new Date().toISOString(),
              grokMode: data.grokMode || 'normal_witty',
              modelSelected: sanitizedModel
            });
          });

          if (loaded.length > 0) {
            // Sort conversations by creation date, newest first
            loaded.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setConversations(loaded);
            
            // Prefer continuing user's previous active selection from cache if present in downloaded docs
            const cachedActive = localStorage.getItem(`bilo_active_id_${cleanEmail}`);
            if (cachedActive && loaded.some(c => c.id === cachedActive)) {
              setActiveId(cachedActive);
              const activeConv = loaded.find(c => c.id === cachedActive);
              if (activeConv?.modelSelected) {
                const rawModel = activeConv.modelSelected;
                setActiveModel((!rawModel || rawModel === 'agnes-default' || rawModel.startsWith('agnes-')) ? 'openai/gpt-3.5-turbo' : rawModel);
              }
            } else {
              setActiveId(loaded[0].id);
              if (loaded[0].modelSelected) {
                const rawModel = loaded[0].modelSelected;
                setActiveModel((!rawModel || rawModel === 'agnes-default' || rawModel.startsWith('agnes-')) ? 'openai/gpt-3.5-turbo' : rawModel);
              }
            }
          } else {
            // Setup default conversation in Firestore for first-time session
            const defaultId = `convo-default-${Date.now()}`;
            const defaultConvo: Conversation = {
              id: defaultId,
              title: 'First Chat Loop',
              messages: [
                {
                  id: 'welcome-msg',
                  role: 'assistant',
                  content: getInitialGreeting(localStorage.getItem('speech_lang') || 'auto'),
                  timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                }
              ],
              created_at: new Date().toISOString(),
              grokMode: 'normal_witty',
              modelSelected: 'openai/gpt-3.5-turbo'
            };
            setConversations([defaultConvo]);
            setActiveId(defaultId);
            await setDoc(doc(db, `custom_users/${cleanEmail}/conversations`, defaultId), defaultConvo);
          }
        } catch (err: any) {
          console.error("Firestore Loading Error:", err);
          // Don't wipe local state on load failures - let user keep working from cache!
          setErrorMessage("Connecting to Firestore database server is slow. Displaying locally buffered dynamic session.");
        }
      } else {
        setCurrentUser(null);
        setConversations([]);
        setActiveId('');
      }
      setAuthChecking(false);
    };

    checkSessionAndLoad();
  }, []);

  const handleAuthSuccess = async () => {
    const storedEmail = localStorage.getItem('bilo_custom_user');
    if (storedEmail) {
      const cleanEmail = storedEmail.toLowerCase().trim();
      setAuthChecking(true);
      setErrorMessage(null);
      setIsSidebarOpen(false); // Ensure the sidebar/conversation panel is closed upon login
      try {
        const userDoc = await getDoc(doc(db, 'custom_users', cleanEmail));
        const userData = userDoc.data();
        setCurrentUser({ email: cleanEmail });

        const userConvosPath = `custom_users/${cleanEmail}/conversations`;
        const q = query(collection(db, userConvosPath));
        const querySnapshot = await getDocs(q);
        const loaded: Conversation[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            title: data.title || 'Untitled',
            messages: data.messages || [],
            created_at: data.created_at || new Date().toISOString(),
            grokMode: data.grokMode || 'normal_witty'
          });
        });

        if (loaded.length > 0) {
          loaded.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setConversations(loaded);
          setActiveId(loaded[0].id);
        } else {
          const defaultId = `convo-default-${Date.now()}`;
          const defaultConvo: Conversation = {
            id: defaultId,
            title: 'First Chat Loop',
            messages: [
              {
                id: 'welcome-msg',
                role: 'assistant',
                content: "Hello! Dynamic Glacier Intelligence is active. How can I help you today?",
                timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
              }
            ],
            created_at: new Date().toISOString(),
            grokMode: 'normal_witty'
          };
          setConversations([defaultConvo]);
          setActiveId(defaultId);
          await setDoc(doc(db, `custom_users/${cleanEmail}/conversations`, defaultId), defaultConvo);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setAuthChecking(false);
      }
    }
  };

  // Sync helpers to easily save conversation state changes to Firestore
  const syncConvoToFirestore = async (email: string, convo: Conversation) => {
    try {
      // Remove any undefined values, as Firestore does not support undefined field values
      const cleanConvo = JSON.parse(JSON.stringify(convo));
      await setDoc(doc(db, `custom_users/${email}/conversations`, convo.id), cleanConvo);
    } catch (err) {
      console.error("Firestore Sync Attempt Failed:", err);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeId);

  // Synchronize global Grok state override
  const handleToggleGrokMode = async (mode: 'fun_rebel' | 'normal_witty') => {
    setGlobalGrokMode(mode);
    
    // Update active conversation's grokMode settings too
    if (activeId) {
      const updated = conversations.map((convo) => {
        if (convo.id === activeId) {
          return { ...convo, grokMode: mode };
        }
        return convo;
      });
      setConversations(updated);
      
      if (currentUser && activeConversation) {
        await syncConvoToFirestore(currentUser.email, { ...activeConversation, grokMode: mode });
      }
    }
  };

  // Start a fresh empty conversation
  const handleNewConversation = async (mode: 'fun_rebel' | 'normal_witty') => {
    if (!currentUser) return;

    const newId = `convo-${Date.now()}`;
    const newConvo: Conversation = {
      id: newId,
      title: `Chat Session ${conversations.length + 1}`,
      messages: [
        {
          id: `start-msg-${Date.now()}`,
          role: 'assistant',
          content: "Hello! What do you need help with today?",
          timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        }
      ],
      created_at: new Date().toISOString(),
      grokMode: mode,
      modelSelected: activeModel
    };

    const nextConvos = [newConvo, ...conversations];
    setConversations(nextConvos);
    setActiveId(newId);
    setIsSidebarOpen(false); // Close sidebar on mobile drawer selection
    setErrorMessage(null);

    await syncConvoToFirestore(currentUser.email, newConvo);
  };

  // Delete specific conversation
  const handleDeleteConversation = async (id: string) => {
    if (!currentUser) return;

    const nextConvos = conversations.filter((c) => c.id !== id);
    try {
      await deleteDoc(doc(db, `custom_users/${currentUser.email}/conversations`, id));
    } catch (err) {
      console.error("Firestore Delete Action Failed:", err);
    }

    if (nextConvos.length === 0) {
      // Re-create default if empty
      const defaultId = `convo-default-${Date.now()}`;
      const defaultConvo: Conversation = {
        id: defaultId,
        title: 'New Log',
        messages: [],
        created_at: new Date().toISOString(),
        grokMode: 'normal_witty'
      };
      setConversations([defaultConvo]);
      setActiveId(defaultId);
      await syncConvoToFirestore(currentUser.email, defaultConvo);
    } else {
      setConversations(nextConvos);
      if (activeId === id) {
        setActiveId(nextConvos[0].id);
        setGlobalGrokMode(nextConvos[0].grokMode || 'normal_witty');
      }
    }
  };

  // Load a conversation
  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    const target = conversations.find((c) => c.id === id);
    if (target) {
      setGlobalGrokMode(target.grokMode || 'normal_witty');
      if (target.modelSelected) {
        const rawModel = target.modelSelected;
        setActiveModel((!rawModel || rawModel === 'agnes-default' || rawModel.startsWith('agnes-')) ? 'openai/gpt-3.5-turbo' : rawModel);
      } else {
        setActiveModel('openai/gpt-3.5-turbo');
      }
    }
    setIsSidebarOpen(false); // Close mobile menu drawer
    setErrorMessage(null);
  };

  // Handle Speech Transcript to textbox
  const handleTranscript = (text: string) => {
    setInputValue((prev) => (prev ? `${prev} ${text}` : text));
  };

  // Run AI request to backend
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const userText = customText || inputValue;
    if (!userText.trim() || isLoading) return;

    if (!customText) {
      setInputValue('');
    }
    setErrorMessage(null);

    const userMessage: Message = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: userText,
      ...(cameraImage && { image: cameraImage }),
      ...(fileName && { fileName: fileName }),
      timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    };

    if (cameraImage) {
      setCameraImage(null);
      setFileName(null);
    }

    // Append user message immediately
    let currentConversation = activeConversation;
    let nextConversations = [...conversations];

    // Auto-create chat if the active one has no messages
    if (!currentConversation) {
      const convoId = `convo-${Date.now()}`;
      currentConversation = {
        id: convoId,
        title: userText.slice(0, 30) + (userText.length > 30 ? '...' : ''),
        messages: [userMessage],
        created_at: new Date().toISOString(),
        grokMode: globalGrokMode
      };
      nextConversations = [currentConversation, ...nextConversations];
      setConversations(nextConversations);
      setActiveId(convoId);
      if (currentUser) {
        await syncConvoToFirestore(currentUser.email, currentConversation);
      }
    } else {
      // Add to current conversation
      const firstUserMsg = currentConversation.messages.length <= 1;
      const updatedMessages = [...currentConversation.messages, userMessage];
      const nextTitle = firstUserMsg 
        ? userText.slice(0, 26) + (userText.length > 26 ? '...' : '') 
        : currentConversation.title;

      const targetId = activeId;
      nextConversations = conversations.map((convo) => {
        if (convo.id === targetId) {
          const updated = {
            ...convo,
            title: nextTitle,
            messages: updatedMessages
          };
          if (currentUser) {
            syncConvoToFirestore(currentUser.email, updated);
          }
          return updated;
        }
        return convo;
      });

      setConversations(nextConversations);
    }

    // Call Backend
    const cleanPrompt = userText.toLowerCase().trim();
    const isImageRequest = 
      cleanPrompt.includes("generate a picture") || 
      cleanPrompt.includes("generate an image") ||
      cleanPrompt.includes("make a picture") ||
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
    if (isImageRequest) setIsGeneratingImage(true);
    setIsLoading(true);
    try {
      const targetId = activeId || currentConversation?.id;
      const payloadMessages = nextConversations.find(c => c.id === targetId)?.messages || [];

      const modelToSend = activeModel === 'custom' ? customModelInput.trim() : activeModel;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: payloadMessages,
          mode: globalGrokMode,
          model: modelToSend,
          openRouterKey: openRouterKeyOverride.trim(),
          language: speechLang
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server processing error occurred.');
      }

      const data = await res.json();
      const aiReply = data.reply;
      const aiImageUrl = data.imageUrl;

      const aiMessage: Message = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        ...(aiImageUrl && { image: aiImageUrl }),
        timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      };

      const finalConvos = nextConversations.map((convo) => {
        const isTarget = convo.id === targetId;
        if (isTarget) {
          const updated = {
            ...convo,
            messages: [...convo.messages, aiMessage]
          };
          if (currentUser) {
            syncConvoToFirestore(currentUser.email, updated);
          }
          return updated;
        }
        return convo;
      });

      setConversations(finalConvos);

      setMessageCount(prev => prev + 1);

      // Trigger text-to-speech event under voice viewMode
      if (viewMode === 'voice') {
        window.dispatchEvent(new CustomEvent('ai-speak', { detail: aiReply }));
      }
    } catch (err: any) {
      console.error('Error in chat:', err);
      setErrorMessage(err.message || 'Error executing AI generation. Please ensure your AGNES_API_KEY is configured in the settings.');
    } finally {
      setIsLoading(false);
      setIsGeneratingImage(false);
    }
  };

  if (authChecking) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#fafcfd] dark:bg-black transition-colors duration-300">
        <Loader2 size={36} className="animate-spin text-cyan-500 mb-3" />
        <span className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold uppercase animate-pulse">
          INITIALIZING_SECURE_LOOP...
        </span>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="relative flex min-h-dvh w-full overflow-hidden bg-[#fafcfd] dark:bg-black transition-colors duration-300">
      
      {/* Drawer Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        grokMode={globalGrokMode}
        onToggleGrokMode={handleToggleGrokMode}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userEmail={currentUser.email || undefined}
        onLogout={() => {
          if (currentUser?.email) {
            const email = currentUser.email.toLowerCase().trim();
            localStorage.removeItem(`bilo_cached_convos_${email}`);
            localStorage.removeItem(`bilo_active_id_${email}`);
            localStorage.removeItem(`bilo_draft_input_${email}`);
          }
          localStorage.removeItem('bilo_custom_user');
          setCurrentUser(null);
          setConversations([]);
          setActiveId('');
          setInputValue('');
        }}
      />

      {/* Main Conversation Canvas with Greenland Absolute White Styles */}
      <div className={`flex flex-1 flex-col transition-all duration-300 ${isSidebarOpen ? 'pl-0 md:pl-76' : 'pl-0'}`}>
        
        {/* Navigation Header - No Brand App Name text label */}
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[#f0f4f7] dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 md:px-8 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-xl p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all duration-200"
              id="btn-hamburger"
              title="Toggle drawer"
            >
              <Menu size={18} />
            </button>
            
            {/* Header left spacer */}
          </div>

          {/* Symmetrical Mode Selectors */}
          <div className="flex bg-[#f1f5f9] dark:bg-slate-800 p-0.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-2xs transition-colors duration-300">
            <button
              onClick={() => setViewMode('text')}
              className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-lg transition-all duration-200 ${
                viewMode === 'text' 
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-3xs font-semibold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Text Mode"
            >
              <MessageSquare size={12} />
              <span>Text Chat</span>
            </button>
            <button
              onClick={() => setViewMode('voice')}
              className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-lg transition-all duration-200 ${
                viewMode === 'voice' 
                  ? 'bg-cyan-500 text-white shadow-3xs font-semibold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Interactive Voice Circle"
            >
              <Mic size={12} />
              <span>Voice Circle</span>
            </button>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="rounded-xl p-2 text-slate-400 hover:text-cyan-500 hover:bg-slate-50/50 dark:hover:bg-slate-850 transition-colors flex items-center justify-center"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              id="btn-toggle-dark-mode"
            >
              {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
            </button>

            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl p-2 text-slate-400 hover:text-cyan-500 hover:bg-slate-50/50 dark:hover:bg-slate-850 transition-colors flex items-center justify-center"
              title="Open Standalone in a New Tab (Fixes Mic/Iframe restrictions)"
              id="btn-open-new-tab"
            >
              <ExternalLink size={18} />
            </a>
            <button
              onClick={() => setShowInfo(true)}
              className="rounded-xl p-2 text-slate-400 hover:text-cyan-500 hover:bg-slate-50/50 dark:hover:bg-slate-850 transition-colors"
              title="Framework Information"
              id="btn-app-info"
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Messaging Container */}
        <main className="flex-1 overflow-hidden flex flex-col relative">
          
          {/* Subtle background abstract glacier design */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35 z-0 flex items-center justify-center">
            <div className="absolute w-[600px] h-[500px] rounded-full bg-radial from-cyan-50/10 via-slate-50/20 to-transparent blur-3xl animate-glacier-pulse" />
          </div>

          {viewMode === 'voice' ? (
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full">
              <VoiceCircle 
                onSendMessage={(text) => handleSendMessage(undefined, text)} 
                isLoading={isLoading}
                systemMessage="Voice Interface State"
                speechLang={speechLang}
              />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto flex flex-col relative z-10">
                {activeConversation ? (
                  <ChatArea
                    messages={activeConversation.messages}
                    isLoading={isLoading}
                    isGeneratingImage={isGeneratingImage}
                    grokMode={globalGrokMode}
                    speechLang={speechLang}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-mono">
                    CREATING_CANVAS...
                  </div>
                )}
              </div>

              {/* Error Message Toast */}
              {errorMessage && (
                <div className="mx-4 md:mx-8 mb-3 p-3.5 rounded-2xl bg-red-50 border border-red-100 shadow-md text-xs text-red-650 flex justify-between items-start gap-4">
                  <p className="leading-relaxed flex-1 font-medium">{errorMessage}</p>
                  <button 
                    onClick={() => setErrorMessage(null)} 
                    className="text-[10px] font-bold text-red-800 uppercase hover:underline shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Mic Waveform Visualization: shows directly contextually over the input area */}
              {isMicListening && (
                <div className="mx-4 md:mx-8 mb-2">
                  <Waveform isListening={isMicListening} />
                </div>
              )}

              {/* Footer Input Board */}
              <footer className="relative z-10 border-t border-[#f0f4f7] dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-4 py-4 md:px-8 transition-colors duration-300">
                


                <form 
                  onSubmit={handleSendMessage} 
                  className="mx-auto flex items-center gap-2.5 w-[95%] md:w-[90%] max-w-[400px]"
                >
                  
                  {/* Mic Input Controller */}
                  <div className="flex gap-2">
                    <AddMedia onCapture={setCameraImage} disabled={isLoading} />
                    <MicButton
                      onTranscript={handleTranscript}
                      onListeningStateChange={setIsMicListening}
                      disabled={isLoading}
                    />
                  </div>

                  {cameraImage && (
                    <div className="relative group">
                      <img src={cameraImage} className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700" alt="Captured" />
                      <button 
                        onClick={() => setCameraImage(null)}
                        className="absolute -top-1 -right-1 bg-slate-900 dark:bg-slate-800 text-white rounded-full p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}

                  {/* Text Input Block */}
                  <div className="relative flex-1 flex items-center bg-white dark:bg-slate-100 border border-slate-200 dark:border-slate-300 focus-within:border-slate-300 dark:focus-within:border-slate-400 focus-within:shadow-md rounded-2xl shadow-sm transition-all duration-200 px-1 min-h-[48px] max-h-[150px]">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={
                        isMicListening 
                          ? "Listening..." 
                          : "Type a message..."
                      }
                      disabled={isLoading}
                      className="w-full bg-transparent px-4 py-3.5 text-sm text-slate-800 dark:text-black placeholder-slate-400 dark:placeholder-slate-505 focus:outline-none resize-none overflow-y-auto"
                      id="chat-input-bar"
                      autoComplete="off"
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
                      }}
                    />

                    {/* Pro features trigger (conditional) */}
                      <label
                        className="mr-2 text-slate-400 hover:text-cyan-500 cursor-pointer"
                        title="Upload file (Up to 10 files)"
                      >
                        <span className="text-xl">+</span>
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              const file = e.target.files[0];
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setCameraImage(event.target?.result as string);
                                setFileName(file.name);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    

                    {/* Submit Action within Input block for layout integrity */}
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isLoading}
                      className={`mr-1 flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 ${
                        inputValue.trim() && !isLoading
                          ? 'bg-black text-white hover:bg-gray-800'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      id="btn-submit-chat"
                    >
                      <ArrowUp size={16} />
                    </button>
                  </div>
                </form>


              </footer>
            </>
          )}

        </main>
      </div>

      {/* Info Modal Backdrop / Dialogue */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 dark:bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-[#dee8f0] dark:border-slate-800 p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowInfo(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg p-1 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              id="btn-close-modal"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div className="h-10 w-10 bg-[#f0f7fe] dark:bg-cyan-950/40 rounded-2xl flex items-center justify-center border border-[#e2effa] dark:border-cyan-900/40">
                <Info size={18} className="text-cyan-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">AI Cognitive System</h3>
                <span className="text-[9px] font-mono tracking-wider font-bold text-slate-400 dark:text-slate-500 uppercase">Architecture: Glacier Intelligence Loop</span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                This beautiful platform features a **Greenland white** layout built using pristine minimalist slate-blue borders, transparent gloss overlays, and high-contrast styling.
              </p>
              <p>
                **Core Capabilities:**
              </p>
              <ul className="space-y-1.5 pl-2">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>**Voice Recognition (Microphone):** Translates spoken voice input recursively in the browser, powered by a gorgeous HTML5 canvas audio orbit.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>**Voice TTS Synthesis:** Built-in speech synthesis allows you to listen to AI responses dynamically.</span>
                </li>
              </ul>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setShowInfo(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold tracking-wide transition-colors"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
