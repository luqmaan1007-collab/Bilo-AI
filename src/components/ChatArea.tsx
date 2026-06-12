import React, { useEffect, useRef, useState } from 'react';
import { 
  Flame, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  User, 
  Bot, 
  Terminal,
  Clock,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Message } from '../types';
import ImageGeneratorPlaceholder from './ImageGeneratorPlaceholder';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  isGeneratingImage: boolean;
  grokMode: 'fun_rebel' | 'normal_witty';
  speechLang?: string;
}

// Compact helper to render custom lightweight markdown formatting
function FormattedContent({ content }: { content: string }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Convert rich formatted code blocks, lists, and headers elegantly
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3.5 text-xs text-slate-705 dark:text-slate-300 leading-relaxed font-sans w-full min-w-0">
      {parts.map((part, idx) => {
        // Code block matching
        if (part.startsWith('```')) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : 'code';
          const codeText = match ? match[2].trim() : part.slice(3, -3).trim();
          const blockId = `code-${idx}`;

          return (
            <div key={idx} className="my-3 w-full max-w-full overflow-hidden rounded-xl border border-[#dee5ec] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-900 shadow-2xs font-mono flex flex-col min-w-0">
              <div className="flex items-center justify-between border-b border-[#e9eff4] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 h-[25px] sm:px-3.5 sm:py-2 text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium select-none">
                <div className="flex items-center gap-1 min-w-0">
                  <Terminal size={10} className="text-cyan-500 shrink-0" />
                  <span className="uppercase tracking-wider font-semibold truncate text-[95%]">{lang || 'terminal'}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(codeText, blockId)}
                  className="flex items-center gap-1 text-[9px] text-slate-450 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 font-semibold uppercase tracking-wider bg-white/70 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-700 transition-all shadow-3xs shrink-0 select-none"
                  title="Copy snippet"
                >
                  {copiedId === blockId ? (
                    <>
                      <Check size={10} className="text-emerald-500 shrink-0" />
                      <span className="text-emerald-500 font-bold">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy size={10} className="shrink-0" />
                      <span>COPY</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="w-full max-w-full overflow-x-auto p-2.5 sm:p-4 text-[9.5px] sm:text-[11px] leading-relaxed text-slate-850 dark:text-slate-200 bg-white/30 dark:bg-slate-900/30 font-mono scrollbar-thin">
                <code className="block whitespace-pre">{codeText}</code>
              </pre>
            </div>
          );
        }

        // Standard text formatting line-by-line helper for sub-headers and elements
        const lines = part.split('\n');
        return (
          <div key={idx} className="space-y-2">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return null;

              // Headings matching (### Header)
              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={lIdx} className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-3 mb-1.5 tracking-tight font-display uppercase border-l-2 border-cyan-400 dark:border-cyan-500 pl-2">
                    {trimmed.replace('### ', '')}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={lIdx} className="text-sm font-semibold text-slate-950 dark:text-slate-50 mt-4 mb-2 tracking-tight font-display">
                    {trimmed.replace('## ', '')}
                  </h3>
                );
              }

              // Bullet lists (- or * item)
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const text = trimmed.slice(2);
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                    <p className="flex-1">{text}</p>
                  </div>
                );
              }

              // Numbered lists (e.g. 1. item)
              const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="font-mono text-[10px] font-bold text-slate-300 mt-0.5">{numMatch[1]}</span>
                    <p className="flex-1">{numMatch[2]}</p>
                  </div>
                );
              }

              // Bold items matching (**text**)
              if (trimmed.includes('**')) {
                const segments = trimmed.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={lIdx}>
                    {segments.map((seg, sIdx) => {
                      if (seg.startsWith('**') && seg.endsWith('**')) {
                        return <strong key={sIdx} className="font-semibold text-slate-900">{seg.slice(2, -2)}</strong>;
                      }
                      return seg;
                    })}
                  </p>
                );
              }

              return <p key={lIdx}>{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function AnimatedMarkdownMessage({ content, onComplete }: { content: string; onComplete: () => void }) {
  const [displayedText, setDisplayedText] = React.useState("");
  const indexRef = React.useRef(0);
  const timerRef = React.useRef<any>(null);

  React.useEffect(() => {
    indexRef.current = 0;
    setDisplayedText("");
    
    const speed = content.length > 300 ? 4 : content.length > 100 ? 8 : 12;

    timerRef.current = setInterval(() => {
      if (indexRef.current < content.length) {
        indexRef.current += 1;
        setDisplayedText(content.slice(0, indexRef.current));
      } else {
        clearInterval(timerRef.current);
        onComplete();
      }
    }, speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [content]);

  const skip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayedText(content);
    onComplete();
  };

  return (
    <div onClick={skip} className="cursor-pointer select-text relative" title="Click to skip typing animation">
      <FormattedContent content={displayedText} />
      {displayedText.length < content.length && (
        <span className="inline-block w-1.5 h-3 bg-cyan-400 ml-0.5 animate-pulse rounded-xs" style={{ verticalAlign: 'middle' }} />
      )}
    </div>
  );
}

function detectLanguage(text: string): string {
  const clean = text.toLowerCase();
  // Danish / Greenland / Scandinavian
  if (/\b(og|i|jeg|det|at|en|den|til|med|på|for|at|af|der|om|hvad|hvem|hvorfor|grønland|kalaallit|glacis|nuuk|iserit|meeqqat)\b/.test(clean)) return 'da-DK';
  // French
  if (/\b(le|la|les|et|un|une|en|que|est|dans|pour|qui|ce|dans|sur|avec|nous|vous|pourquoi|comment|bonjour|merci)\b/.test(clean)) return 'fr-FR';
  // Spanish
  if (/\b(el|la|los|las|y|un|una|en|que|es|en|por|para|con|nosotros|vosotros|por|como|gracias|hola|amigo)\b/.test(clean)) return 'es-ES';
  // German
  if (/\b(der|die|das|und|ist|ein|eine|in|zu|haben|werden|von|mit|auf|für|was|wer|warum|hallo|danke)\b/.test(clean)) return 'de-DE';
  // Italian
  if (/\b(il|la|i|gli|le|e|un|una|in|che|di|da|per|con|su|perché|come|grazie|ciao)\b/.test(clean)) return 'it-IT';
  // Portuguese
  if (/\b(o|a|os|as|e|um|uma|em|que|é|de|para|com|por|como|obrigado|oi|bom)\b/.test(clean)) return 'pt-BR';
  // Dutch
  if (/\b(de|het|een|en|is|in|van|met|voor|op|te|die|dat|wat|hoe|waarom|dank)\b/.test(clean)) return 'nl-NL';
  // Russian
  if (/[а-яА-Я]/.test(text)) return 'ru-RU';
  // Arabic
  if (/[\u0600-\u06FF]/.test(text)) return 'ar-AE';
  // Chinese
  if (/[\u4e00-\u9fa5]/.test(text)) return 'zh-CN';
  // Japanese
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja-JP';
  // Korean
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko-KR';
  
  return 'en-US';
}

export default function ChatArea({ messages, isLoading, isGeneratingImage, grokMode, speechLang = 'auto' }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [activeSpeechText, setActiveSpeechText] = useState<string | null>(null);
  const [speechSynthesisSupported, setSpeechSynthesisSupported] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [typedMessageIds, setTypedMessageIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    messages.forEach((m) => {
      initial[m.id] = true;
    });
    return initial;
  });

  useEffect(() => {
    const nextTyped = { ...typedMessageIds };
    let changed = false;
    messages.forEach((m) => {
      // Automatically treat any user message or existing parsed messages as typed
      if (m.role === 'user' && !nextTyped[m.id]) {
        nextTyped[m.id] = true;
        changed = true;
      }
    });
    if (changed) {
      setTypedMessageIds(nextTyped);
    }
  }, [messages]);

  useEffect(() => {
    // Check SpeechSynthesis availability
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setSpeechSynthesisSupported(true);
    }
  }, []);

  // Safe scroll-to-bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const stopActiveSpeech = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current = null;
      } catch (e) {
        console.warn(e);
      }
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn(e);
      }
    }
    setActiveSpeechText(null);
  };

  // Handle TTS Speaking
  const speakMessage = async (text: string) => {
    if (activeSpeechText === text) {
      stopActiveSpeech();
      return;
    }

    stopActiveSpeech();

    const cleanText = text.replace(/(```[\s\S]*?```)/g, '').replace(/[\*\#\`\_]/g, '');

    const triggerLocalSpeak = () => {
      if (!speechSynthesisSupported) return;
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const autoLang = speechLang !== 'auto' ? speechLang : detectLanguage(cleanText);
      utterance.lang = autoLang;

      const availableVoices = window.speechSynthesis.getVoices();
      const langPrefix = autoLang.substring(0, 2).toLowerCase();
      
      // Scoring function to evaluate the quality of a voice as a "Deep Male Voice" matching the dialect
      const scoreVoice = (v: SpeechSynthesisVoice, targetLangPrefix: string) => {
        let score = 0;
        const name = v.name.toLowerCase();
        const lang = v.lang.toLowerCase();
        
        // Matching language gets a massive boost
        if (lang.startsWith(targetLangPrefix)) {
          score += 1000;
        } else if (lang.startsWith('en')) {
          score += 100; // English fallback is second choice
        }
        
        // Explicit premium/neural quality markers
        if (name.includes('premium') || name.includes('natural') || name.includes('neural') || name.includes('enhanced')) {
          score += 200;
        }
        if (name.includes('google') || name.includes('apple') || name.includes('microsoft') || name.includes('siri')) {
          score += 50;
        }
        
        // Explicit keyword weightings for deep male voices
        const primaryKeywords = ['onyx', 'daniel', 'david', 'george', 'grok', 'vape', 'rjs', 'sfg', 'fis', 'iom', 'male', 'masculin', 'masculino', 'hombre', 'homme', 'guy', 'father', 'man', 'mr'];
        for (const kw of primaryKeywords) {
          if (name.includes(kw)) {
            score += 250;
            break;
          }
        }
        
        const secondaryKeywords = ['alex', 'steve', 'richard', 'thomas', 'james', 'mark', 'carlos', 'pablo', 'manuel', 'javier', 'julien', 'pierre', 'hugo', 'filip', 'paul', 'stefan'];
        for (const kw of secondaryKeywords) {
          if (name.includes(kw)) {
            score += 100;
            break;
          }
        }
        
        // Negative penalty for explicitly female names/markers to guarantee no female voices are chosen
        const femaleKeywords = ['female', 'samantha', 'zira', 'hazel', 'susan', 'karen', 'rachel', 'moira', 'tessa', 'veena', 'clara', 'fiona', 'victoria', 'siri', 'whisper', 'sara', 'anna', 'melina', 'hazel', 'en-us-x-sfg#female', 'en-us-x-iom#female', 'en-gb-x-rjs#female', 'en-gb-x-fis#female', 'google us english female'];
        for (const kw of femaleKeywords) {
          if (name.includes(kw)) {
            score -= 1000;
          }
        }
        
        return score;
      };

      // Sort voices by evaluated deep male priority score
      const scoredVoices = [...availableVoices]
        .map(v => ({ voice: v, score: scoreVoice(v, langPrefix) }))
        .sort((a, b) => b.score - a.score);

      let selectedVoice: SpeechSynthesisVoice | null = null;
      if (scoredVoices.length > 0 && scoredVoices[0].score > -500) {
        selectedVoice = scoredVoices[0].voice;
        console.log(`[TTS_Fallback_Chat] Selected high-scoring male/native voice: ${selectedVoice.name} (Score: ${scoredVoices[0].score}, Lang: ${selectedVoice.lang})`);
      } else if (availableVoices.length > 0) {
        selectedVoice = availableVoices[0];
        console.log(`[TTS_Fallback_Chat] No high quality male matching voice matched. Using absolute system fallback: ${selectedVoice.name}`);
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.rate = 0.82; 
      utterance.pitch = 0.55;

      utterance.onend = () => setActiveSpeechText(null);
      utterance.onerror = () => setActiveSpeechText(null);

      setActiveSpeechText(text);
      window.speechSynthesis.speak(utterance);
    };

    // Attempt premium deep manly cloud audio playback
    try {
      const audioUrl = `/api/tts?text=${encodeURIComponent(cleanText)}`;
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setActiveSpeechText(text);
      };

      audio.onended = () => {
        setActiveSpeechText(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        console.warn("[TTS] Premium cloud audio playback failed, falling back to local SpeechSynthesis");
        audioRef.current = null;
        triggerLocalSpeak();
      };

      await audio.play();
    } catch (err) {
      console.warn("[TTS] Failed to execute premium cloud play, using local fallback:", err);
      audioRef.current = null;
      triggerLocalSpeak();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-2 py-4 sm:px-4 md:px-8 space-y-4 sm:space-y-6">
      {messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center py-16 text-center max-w-lg mx-auto">
          {/* Glacier icon centerpiece */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-white dark:bg-slate-900 border border-[#dee8f0] dark:border-slate-800 shadow-2xs mb-6">
            <div className="h-6 w-6 bg-gradient-to-br from-[#bad6ef] to-[#edf4fc] dark:from-cyan-950 dark:to-slate-800 rounded-md transform rotate-45 animate-pulse" />
            <div className="absolute top-3 right-3 h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
          </div>

          <h2 className="font-display text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
            How can I help you today?
          </h2>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 leading-relaxed max-w-sm">
            Ask me anything with real voice input and immersive speech feedback.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-2.5 w-full">
            <div className="rounded-xl border border-[#eaf1f7] dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-left hover:border-cyan-100 dark:hover:border-cyan-800 hover:shadow-2xs transition-all duration-200">
              <span className="block text-[10px] font-mono tracking-wider font-semibold text-cyan-500 uppercase">General Help</span>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-405 leading-snug">"Explain quantum computing in extremely simple terms."</p>
            </div>
            <div className="rounded-xl border border-[#eaf1f7] dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-left hover:border-cyan-100 dark:hover:border-cyan-800 hover:shadow-2xs transition-all duration-200">
              <span className="block text-[10px] font-mono tracking-wider font-semibold text-emerald-500 uppercase">Drafting</span>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-405 leading-snug">"Help me write a warm message to check in with a close friend."</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSpeaking = activeSpeechText === msg.content;

            return (
              <div
                key={msg.id}
                className={`flex gap-4 items-start w-full min-w-0 ${isUser ? 'justify-center sm:justify-end' : 'justify-start'} animate-fade-in`}
              >
                {/* Assistant avatar icon */}
                {!isUser && (
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#e1eaf3] dark:border-slate-800 shadow-3xs ${
                    grokMode === 'fun_rebel' ? 'bg-[#fffbeb] dark:bg-[#fffbeb]/10' : 'bg-[#f0f7fe] dark:bg-[#f0f7fe]/10'
                  }`}>
                    {grokMode === 'fun_rebel' ? (
                      <Flame size={14} className="text-amber-500 animate-pulse" />
                    ) : (
                      <Sparkles size={14} className="text-cyan-500" />
                    )}
                  </div>
                )}

                {/* Bubble */}
                <div className={`group relative rounded-2xl px-2.5 py-2 sm:px-4 sm:py-3.5 border overflow-hidden break-words min-w-0 transition-all duration-200 ${
                  isUser
                    ? 'max-w-[75%] bg-[#ecf3f8] dark:bg-slate-800 border-[#dfebf3] dark:border-slate-700 text-slate-800 dark:text-slate-100'
                    : 'w-full max-w-[75%] sm:max-w-[45%] bg-white dark:bg-slate-900 border-[#eef4f8] dark:border-slate-800 text-slate-700 dark:text-slate-200 shadow-3xs mx-auto'
                }`}>
                  {!isUser && msg.id === messages[messages.length - 1]?.id && !typedMessageIds[msg.id] ? (
                    <AnimatedMarkdownMessage
                      content={msg.content}
                      onComplete={() => {
                        setTypedMessageIds((prev) => ({ ...prev, [msg.id]: true }));
                      }}
                    />
                  ) : (
                    <FormattedContent content={msg.content} />
                  )}
                  {msg.fileName && (
                    <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-750 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      <span>📄</span>
                      <span className="truncate">{msg.fileName}</span>
                    </div>
                  )}
                  {msg.image && (
                    <div className="relative group mt-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm max-w-sm">
                      <img
                        src={msg.image}
                        alt="Generated"
                        className="w-full h-auto cursor-pointer object-cover transition-transform duration-500 group-hover:scale-102"
                        referrerPolicy="no-referrer"
                        onClick={() => {
                          const triggerDownload = (imageUrl: string) => {
                            if (imageUrl.startsWith('data:')) {
                              const mime = imageUrl.match(/data:([^;]+);/)?.[1];
                              let ext = 'png';
                              if (mime === 'image/svg+xml') {
                                ext = 'svg';
                              } else if (mime === 'image/jpeg' || mime === 'image/jpg') {
                                ext = 'jpg';
                              }
                              const a = document.createElement('a');
                              a.href = imageUrl;
                              a.download = `agnes-generated-${Date.now()}.${ext}`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                            } else {
                              fetch(imageUrl)
                                .then(res => res.blob())
                                .then(blob => {
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `agnes-generated-${Date.now()}.png`;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  window.URL.revokeObjectURL(url);
                                })
                                .catch(err => console.error("Download failed:", err));
                            }
                          };
                          triggerDownload(msg.image!);
                        }}
                      />
                      <div 
                        onClick={() => {
                          const triggerDownload = (imageUrl: string) => {
                            if (imageUrl.startsWith('data:')) {
                              const mime = imageUrl.match(/data:([^;]+);/)?.[1];
                              let ext = 'png';
                              if (mime === 'image/svg+xml') {
                                ext = 'svg';
                              } else if (mime === 'image/jpeg' || mime === 'image/jpg') {
                                ext = 'jpg';
                              }
                              const a = document.createElement('a');
                              a.href = imageUrl;
                              a.download = `agnes-generated-${Date.now()}.${ext}`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                            } else {
                              fetch(imageUrl)
                                .then(res => res.blob())
                                .then(blob => {
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `agnes-generated-${Date.now()}.png`;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  window.URL.revokeObjectURL(url);
                                })
                                .catch(err => console.error("Download failed:", err));
                            }
                          };
                          triggerDownload(msg.image!);
                        }}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center cursor-pointer"
                      >
                        <div className="bg-slate-900/90 text-white rounded-full p-2.5 shadow-md flex items-center justify-center border border-white/20 transition-all scale-90 group-hover:scale-100 duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="animate-bounce">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                        </div>
                        <span className="mt-2 text-white font-sans text-[11px] font-semibold tracking-wide drop-shadow-sm select-none">
                          Download Image
                        </span>
                      </div>
                    </div>
                  )}

                   {/* Tiny timestamp & Voice utility rail */}
                  <div className="mt-2.5 flex items-center justify-between gap-2.5 border-t border-slate-100/60 pt-1.5 text-[9px] font-mono text-slate-400">
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock size={9} />
                      {msg.timestamp}
                    </span>

                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          setCopiedMessageId(msg.id);
                          setTimeout(() => setCopiedMessageId(null), 2000);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                        title="Copy entire response"
                      >
                        {copiedMessageId === msg.id ? (
                          <>
                            <Check size={9} className="text-emerald-500" />
                            <span className="text-emerald-500 font-bold uppercase text-[8px] sm:text-[9px]">COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy size={9} />
                            <span className="uppercase text-[8px] sm:text-[9px] font-medium">
                              <span className="hidden sm:inline">COPY RESPONSE</span>
                              <span className="sm:hidden">COPY</span>
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* User Avatar */}
                {isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-100 dark:border-slate-800 bg-[#f7fafc] dark:bg-slate-850 text-slate-400 dark:text-slate-500">
                    <User size={13} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Assistant Generation indicator */}
          {(isLoading || isGeneratingImage) && (
            <div className="flex gap-4 items-start justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-3xs">
                {isGeneratingImage ? (
                  <div className="text-cyan-500 animate-spin duration-[2000ms]">
                    <Sparkles size={14} />
                  </div>
                ) : (
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </div>

              {isGeneratingImage ? (
                <ImageGeneratorPlaceholder />
              ) : (
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#eef4f8] dark:border-slate-800 px-4 py-3.5 shadow-3xs text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-[#64748b] dark:text-slate-400">
                    <span>THINKING</span>
                    <div className="flex gap-0.5 mt-0.5">
                      <span className="h-1 w-1 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="h-1 w-1 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '300ms' }} />
                      <span className="h-1 w-1 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '600ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
