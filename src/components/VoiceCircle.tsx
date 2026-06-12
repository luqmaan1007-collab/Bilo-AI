import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Loader2, MessageSquare, X, ExternalLink } from 'lucide-react';
import TypewriterText from './TypewriterText';

interface VoiceCircleProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  systemMessage: string;
  speechLang?: string;
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

export default function VoiceCircle({ onSendMessage, isLoading, speechLang = 'auto' }: VoiceCircleProps) {
  const [isListening, setIsListening] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<React.ReactNode | null>(null);
  const [autoListenAfterSpeech, setAutoListenAfterSpeech] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('auto_listen_after_speech');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const toggleAutoListen = () => {
    const newVal = !autoListenAfterSpeech;
    setAutoListenAfterSpeech(newVal);
    try {
      localStorage.setItem('auto_listen_after_speech', String(newVal));
    } catch (e) {
      console.error(e);
    }
  };
  const recognitionRef = useRef<any>(null);
  const pulseScaleRef = useRef<number>(1);
  const requestRef = useRef<number>(0);

  const isRecognitionActiveRef = useRef(false);
  const transcriptRef = useRef('');
  const onSendMessageRef = useRef(onSendMessage);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const silenceTimeoutRef = useRef<any>(null);
  const isInternalAbortRef = useRef(false);
  const isSpeakingRef = useRef(false);

  // Sync refs safely to avoid closure staleness and redundant event reconstructions
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    onSendMessageRef.current = onSendMessage;
  }, [onSendMessage]);

  // Load and subscribe to system SpeechSynthesis voices asynchronously to ensure early cache
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        try {
          const list = window.speechSynthesis.getVoices();
          setVoices(list || []);
        } catch (e) {
          console.warn("Error preloading voices:", e);
        }
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Canvas ref for a gorgeous circular voice pulse animation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setRecognitionSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = speechLang === 'auto' ? (navigator.language || 'en-US') : speechLang;

      rec.onstart = () => {
        setIsListening(true);
        isRecognitionActiveRef.current = true;
        setErrorMessage(null);
        setTranscript('');
        transcriptRef.current = '';
        // If speaking, stop speaking when user starts talking
        stopActiveSpeech();
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
      };

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += trans;
          } else {
            interimTranscript += trans;
          }
        }
        
        const fullTranscript = (finalTranscript || interimTranscript || '').trim();
        if (fullTranscript) {
          setTranscript(fullTranscript);
          transcriptRef.current = fullTranscript;
        }

        // Reset silence timeout - if they pause for 1.5 seconds, automatically process the question!
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          console.log("[VoiceCircle] Silence detected. Stopping mic to process message...");
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (e) {
              console.warn(e);
            }
          }
        }, 1500);
      };

      rec.onerror = (event: any) => {
        console.error('Mic Error Full Event:', JSON.stringify(event));
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        const error = event.error || 'Unknown error';
        console.error('Mic Error Property:', error);
        
        if (error === 'not-allowed') {
          setErrorMessage(
            'Microphone access denied. Please click the "Camera/Mic" icon in your browser address bar to allow microphone access, then try again.'
          );
        } else if (error === 'service-not-allowed') {
          setErrorMessage(
            <div className="space-y-2">
              <p>Google Speech Recognition is blocked or restricted in this container preview window.</p>
              <p className="font-semibold text-amber-905">💡 Solution: Open the application in a Standalone New Tab where speech input works flawlessly!</p>
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-[11px] shadow-xs transition-all focus:ring-1 focus:ring-cyan-400 select-none cursor-pointer"
                id="link-error-new-tab"
              >
                <ExternalLink size={12} />
                <span>Open in Standalone New Tab ↗️</span>
              </a>
            </div>
          );
        } else if (error !== 'no-speech' && error !== 'aborted' && error !== 'audio-capture') {
          setErrorMessage(`Microphone system error: ${error}`);
        }
        setIsListening(false);
        isRecognitionActiveRef.current = false;
      };

      rec.onend = () => {
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        setIsListening(false);
        isRecognitionActiveRef.current = false;
        
        if (isInternalAbortRef.current) {
          isInternalAbortRef.current = false;
          setTranscript('');
          transcriptRef.current = '';
          return;
        }

        const currentVal = transcriptRef.current;
        if (currentVal.trim()) {
          setTranscript('');
          transcriptRef.current = '';
          onSendMessageRef.current(currentVal);
        }
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Sync chosen speech language dynamically with active speech recognition instance
  useEffect(() => {
    if (recognitionRef.current) {
      const activeLang = speechLang === 'auto' ? (navigator.language || 'en-US') : speechLang;
      recognitionRef.current.lang = activeLang;
      console.log(`[VoiceCircle] SpeechRecognition updated language parameter to: ${activeLang}`);
    }
  }, [speechLang]);

  const stopActiveSpeech = () => {
    isSpeakingRef.current = false;
    isInternalAbortRef.current = false;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current = null;
      } catch (e) {
        console.warn("Error pausing active sound play:", e);
      }
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn("Error resetting local speech engine:", e);
      }
    }
    setSpeakingText(null);
  };

  // Local offline speech synthesiser backup with deep male voice selection
  const triggerLocalSpeak = (textToSpeak: string) => {
    if (!window.speechSynthesis) {
      console.warn("Speech synthesis is not supported on this device/browser.");
      return;
    }

    isSpeakingRef.current = true;
    isInternalAbortRef.current = true;
    setSpeakingText(textToSpeak); // Set immediately to block mic from restarting in render cycles

    // Explicitly shut down speech recognition before speaking starts to prevent hearing own voice
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.warn("Error stopping mic before speaking:", e);
      }
    }
    setIsListening(false);
    isRecognitionActiveRef.current = false;
    
    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn("Reset speechSynthesis failed:", e);
    }
    
    const cleanText = textToSpeak.replace(/[\*\#\`\_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;
    
    // Auto-detect or use defined language code
    const langCode = speechLang !== 'auto' ? speechLang : detectLanguage(textToSpeak);
    utterance.lang = langCode;
    console.log(`[TTS_Fallback] Local speech lang assigned: ${utterance.lang}`);

    const availableVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    const langPrefix = langCode.substring(0, 2).toLowerCase();
    
    // Scoring function to evaluate the quality of a voice as a "Deep Male Voice" matching the dialect
    const scoreVoice = (v: SpeechSynthesisVoice, targetLang: string) => {
      let score = 0;
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      
      // Matching exact language gets main boost
      if (lang === targetLang) {
        score += 1000;
      } else if (lang.startsWith(targetLang.substring(0, 2))) {
        score += 500; // Partial language match
      } else if (lang.startsWith('en')) {
        score += 100; // English fallback
      }
      
      // Explicit premium/neural quality indicators
      if (name.includes('premium') || name.includes('natural') || name.includes('neural') || name.includes('enhanced')) {
        score += 200;
      }
      if (name.includes('google') || name.includes('apple') || name.includes('microsoft') || name.includes('siri')) {
        score += 50;
      }

      // Explicit keyword weightings for deep male/manly voices
      const primaryKeywords = ['onyx', 'daniel', 'david', 'george', 'grok', 'vape', 'rjs', 'sfg', 'fis', 'iom', 'male', 'masculin', 'masculino', 'hombre', 'homme', 'guy', 'father', 'man', 'mr'];
      for (const kw of primaryKeywords) {
        if (name.includes(kw)) {
          score += 300;
          break;
        }
      }
      
      const secondaryKeywords = ['alex', 'steve', 'richard', 'thomas', 'james', 'mark', 'carlos', 'pablo', 'manuel', 'javier', 'julien', 'pierre', 'hugo', 'filip', 'paul', 'stefan'];
      for (const kw of secondaryKeywords) {
        if (name.includes(kw)) {
          score += 150;
          break;
        }
      }
      
      // Negative penalty for explicitly female names/markers to guarantee no female voices are chosen
      const femaleKeywords = ['female', 'samantha', 'zira', 'hazel', 'susan', 'karen', 'rachel', 'moira', 'tessa', 'veena', 'clara', 'fiona', 'victoria', 'siri', 'whisper', 'sara', 'anna', 'melina', 'hazel', 'en-us-x-sfg#female', 'en-us-x-iom#female', 'en-gb-x-rjs#female', 'en-gb-x-fis#female', 'google us english female'];
      for (const kw of femaleKeywords) {
        if (name.includes(kw)) {
          score -= 1500;
        }
      }
      
      return score;
    };

    // Sort voices by evaluated deep male priority score
    const scoredVoices = [...availableVoices]
      .map(v => ({ voice: v, score: scoreVoice(v, langCode) }))
      .sort((a, b) => b.score - a.score);

    let selectedVoice: SpeechSynthesisVoice | null = null;
    if (scoredVoices.length > 0 && scoredVoices[0].score > -500) {
      selectedVoice = scoredVoices[0].voice;
      console.log(`[TTS_Fallback] Selected high-scoring male/native voice: ${selectedVoice.name} (Score: ${scoredVoices[0].score}, Lang: ${selectedVoice.lang})`);
    } else if (availableVoices.length > 0) {
      selectedVoice = availableVoices[0];
      console.log(`[TTS_Fallback] No high quality male matching voice matched. Using absolute system fallback: ${selectedVoice.name}`);
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Deepen the synthesized pitch and set a measured speech pacing rate (deep manly voice pitch)
    utterance.pitch = 0.55; 
    utterance.rate = 0.85;  // Slightly measured pacing sounds authoritative
 
    utterance.onstart = () => {
      isSpeakingRef.current = true;
    };
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return; // Guard against stale dangling utterance events
      setSpeakingText(null);
      utteranceRef.current = null;
      isSpeakingRef.current = false;
      // 1.2-second delay before restarting listening if automated reply-listen is enabled
      if (autoListenAfterSpeech) {
        setTimeout(() => {
          if (utteranceRef.current === null && !isSpeakingRef.current) {
            startListeningHelper();
          }
        }, 1200);
      }
    };
    utterance.onerror = (err) => {
      console.error("SpeechSynthesisUtterance Error:", err);
      if (utteranceRef.current !== utterance) return; // Guard against stale dangling utterance events
      setSpeakingText(null);
      utteranceRef.current = null;
      isSpeakingRef.current = false;
      if (autoListenAfterSpeech) {
        setTimeout(() => {
          if (utteranceRef.current === null && !isSpeakingRef.current) {
            startListeningHelper();
          }
        }, 1200);
      }
    };
 
    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Failed to run speak()", e);
    }
  };
 
  // API synthesis trigger via Premium Deep Manly TTS
  const triggerSpeak = async (textToSpeak: string) => {
    stopActiveSpeech();
 
    isSpeakingRef.current = true;
    isInternalAbortRef.current = true;
    setSpeakingText(textToSpeak); // Set immediately to block mic from restarting in render cycles
 
    // Explicitly shut down speech recognition before speaking starts to prevent hearing own voice
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.warn("Error stopping mic before speaking:", e);
      }
    }
    setIsListening(false);
    isRecognitionActiveRef.current = false;
    
    try {
      const cleanText = textToSpeak.replace(/[\*\#\`\_]/g, '');
      const audioUrl = `/api/tts?text=${encodeURIComponent(cleanText)}`;
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
 
      audio.onplay = () => {
        isSpeakingRef.current = true;
      };
 
      audio.onended = () => {
        if (audioRef.current !== audio) return; // Guard against stale dangling audio events
        setSpeakingText(null);
        audioRef.current = null;
        isSpeakingRef.current = false;
        // 1.2-second delay before restarting listening if automated reply-listen is enabled
        if (autoListenAfterSpeech) {
          setTimeout(() => {
            if (audioRef.current === null && !isSpeakingRef.current) {
              startListeningHelper();
            }
          }, 1200);
        }
      };
 
      audio.onerror = () => {
        if (audioRef.current !== audio) return; // Guard against stale dangling audio events
        console.warn("[TTS] Premium Cloud audio stream unavailable; transitioning seamlessly to local voice emulation.");
        audioRef.current = null;
        isSpeakingRef.current = false;
        triggerLocalSpeak(textToSpeak);
      };
 
      await audio.play();
    } catch (err) {
      console.warn("[TTS] Premium Cloud TTS call failed, executing local offline fallback:", err);
      audioRef.current = null;
      isSpeakingRef.current = false;
      triggerLocalSpeak(textToSpeak);
    }
  };
 
  // Expose triggers with explicit permission wrapper to resolve permission prompt issues
  const startListeningHelper = async () => {
    // Absolutely do NOT start listening if AI is speaking or loading
    if (isSpeakingRef.current || speakingText || isLoading) {
      console.log("[VoiceCircle] Blocked startListeningHelper() because AI is currently talking or loading.");
      return;
    }
 
    if (!recognitionRef.current) {
      // Simulation / friendly fallback
      setIsListening(true);
      setTranscript("Checking Greenland white temperature...");
      setTimeout(() => {
        setIsListening(false);
        onSendMessageRef.current("Hi, tell me about Greenland!");
      }, 2500);
      return;
    }
 
    if (isRecognitionActiveRef.current) {
      console.log("SpeechRecognition session already active; skipping redundant start call.");
      return;
    }
 
    try {
      recognitionRef.current.start();
    } catch (err: any) {
      const isAlreadyStarted = err.name === 'DOMException' || 
                             err.name === 'InvalidStateError' || 
                             (err.message && err.message.toLowerCase().includes('already started'));
      if (isAlreadyStarted) {
        console.log("SpeechRecognition already started; ignoring start exception safely.");
        return;
      }
      console.warn("SpeechRecognition start exception:", err);
      
      // Clean restart loop if not already running, but only if not speaking or loading
      try {
        recognitionRef.current.abort();
      } catch (abortErr) {
        console.error("Clean abort failed:", abortErr);
      }
      
      setTimeout(() => {
        try {
          if (!isRecognitionActiveRef.current && !speakingText && !isLoading && !isSpeakingRef.current) {
            recognitionRef.current.start();
          }
        } catch (retryErr: any) {
          if (retryErr.name === 'DOMException' && retryErr.message.includes('already started')) {
             console.warn("Retry start already started; ignoring.");
             return;
          }
          console.error("Delayed start retry failed:", retryErr);
        }
      }, 300);
    }
  };

  const toggleMic = () => {
    // SECURITY/WORKAROUND: Unlock Text-To-Speech engine on user manual click gesture context
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.resume();
        const silentUtterance = new SpeechSynthesisUtterance("");
        window.speechSynthesis.speak(silentUtterance);
      } catch (e) {
        console.warn("Silence speaking failed or unsupported:", e);
      }
    }

    if (isListening || isRecognitionActiveRef.current) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Stop error:", e);
        }
      } else {
        setIsListening(false);
      }
    } else {
      stopActiveSpeech();
      startListeningHelper();
    }
  };

  // Speak incoming AI answers automatically in Voice Mode
  // We monitor the global speech triggers. Let's make sure the parent App hook can call TTS as well.
  useEffect(() => {
    const handleVoiceResponse = (e: CustomEvent) => {
      const resp = e.detail;
      if (resp) {
        triggerSpeak(resp);
      }
    };
    window.addEventListener('ai-speak', handleVoiceResponse as any);
    return () => {
      window.removeEventListener('ai-speak', handleVoiceResponse as any);
      stopActiveSpeech();
    };
  }, []);

  // Canvas visualization loop for Greenland White sphere
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let angle = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Calculate dynamic base radius based on voice activity
      let baseRadius = 100;
      if (isListening) {
        baseRadius = 104 + Math.sin(angle * 6) * 12;
      } else if (speakingText) {
        baseRadius = 105 + Math.sin(angle * 12) * 16;
      } else if (isLoading) {
        baseRadius = 96 + Math.sin(angle * 3) * 5;
      }

      angle += 0.05;

      // 1. Draw outermost glowing wave
      ctx.beginPath();
      const outerGlow = ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, baseRadius * 1.6);
      outerGlow.addColorStop(0, 'rgba(215, 235, 250, 0.4)');
      outerGlow.addColorStop(0.5, 'rgba(164, 204, 236, 0.25)');
      outerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = outerGlow;
      ctx.arc(cx, cy, baseRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 2. Beautiful circular orbital ring elements represent voice frequency limits
      ctx.strokeStyle = 'rgba(156, 198, 235, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating dashed satellite particles
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([15, 80]);
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius - 12, angle, angle + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Central main polished white orb representing glacier aesthetics
      const baseGradient = ctx.createRadialGradient(cx - 20, cy - 20, baseRadius * 0.1, cx, cy, baseRadius);
      baseGradient.addColorStop(0, '#ffffff');
      baseGradient.addColorStop(0.7, '#f4faff');
      baseGradient.addColorStop(1, '#e3edf6');

      ctx.beginPath();
      ctx.fillStyle = baseGradient;
      ctx.shadowColor = 'rgba(156, 198, 235, 0.25)';
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;
      ctx.arc(cx, cy, baseRadius - 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // reset shadow
      ctx.shadowOffsetY = 0;

      frameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameId);
  }, [isListening, speakingText, isLoading]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 px-4 md:px-12 text-center max-w-2xl mx-auto w-full">
      
      {/* Visual Header */}
      <div className="mb-4">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-50/70 border border-cyan-100/60 text-[10px] font-mono font-bold text-cyan-505 tracking-wider uppercase">
          {isListening ? "Listening..." : speakingText ? "Talking..." : isLoading ? "Thinking..." : "Idle Voice Interface"}
        </span>
      </div>

      {/* Main Interactive Circle */}
      <div className="relative w-76 h-76 max-w-full flex items-center justify-center">
        
        {/* Visual canvas orb */}
        <canvas 
          ref={canvasRef} 
          width={320} 
          height={320}
          className="absolute inset-0 w-full h-full cursor-pointer select-none"
          onClick={toggleMic}
        />

        {/* Center icon / action switch */}
        <button
          onClick={toggleMic}
          className={`absolute z-10 flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 shadow-md ${
            isListening 
              ? 'bg-red-500 text-white hover:bg-red-600 scale-105' 
              : speakingText
              ? 'bg-cyan-500 text-white hover:bg-cyan-600 scale-102'
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-[#dee8f0] hover:scale-105'
          }`}
          title="Click circle to speak to AI"
          id="btn-voice-circle-toggle"
        >
          {isListening ? (
            <div className="flex items-center gap-0.5">
              <span className="h-3 w-1 bg-white rounded-full animate-voice-wave" style={{ animationDelay: '0s' }} />
              <span className="h-4.5 w-1 bg-white rounded-full animate-voice-wave" style={{ animationDelay: '0.15s' }} />
              <span className="h-3.5 w-1 bg-white rounded-full animate-voice-wave" style={{ animationDelay: '0.3s' }} />
            </div>
          ) : speakingText ? (
            <Volume2 size={28} className="animate-bounce" />
          ) : isLoading ? (
            <Loader2 size={26} className="animate-spin text-cyan-500" />
          ) : (
            <Mic size={26} className="text-cyan-500" />
          )}
        </button>
      </div>

      {/* Transcript feedback Box */}
      <div className="mt-8 min-h-20 max-w-md bg-white border border-[#edf3f8] px-5 py-4 rounded-2xl shadow-3xs w-full">
        {isListening ? (
          <div className="space-y-1">
            <span className="text-[9px] font-mono text-slate-400 tracking-wider">YOUR SPEECH TRANSCRIPT</span>
            <p className="text-xs text-slate-705 italic">
              {transcript || "Speak now, listening carefully..."}
            </p>
          </div>
        ) : speakingText ? (
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-[9px] font-mono text-cyan-500 tracking-wider">
              <Sparkles size={8} />
              <span>AI SPEECH FEEDBACK</span>
            </div>
            <div className="text-xs text-slate-700 font-medium line-clamp-4 leading-relaxed">
              <TypewriterText text={speakingText} speed={10} />
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-2 gap-1.5">
            <Loader2 size={16} className="animate-spin text-cyan-300" />
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Processing vocal query...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs py-2">
            <MessageSquare size={13} className="text-slate-350" />
            <span>Tap the Greenland sphere to speak to AI Assistant.</span>
          </div>
        )}
      </div>

      {/* Auto-Listen Toggle Switch */}
      <div className="mt-4 flex items-center justify-between gap-4 max-w-md w-full bg-slate-50/50 border border-slate-200/50 px-4 py-2.5 rounded-xl text-xs transition-colors hover:bg-slate-50">
        <span className="text-slate-500 font-medium font-sans animate-fade-in">Auto-listening (Hands-free mode)</span>
        <button
          onClick={toggleAutoListen}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
            autoListenAfterSpeech ? 'bg-cyan-500' : 'bg-slate-300'
          }`}
          title="Toggle whether AI will automatically start listening after speaking"
          id="btn-auto-listen-toggle"
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
              autoListenAfterSpeech ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Error State */}
      {errorMessage && (
        <div className="mt-6 text-xs px-4 py-3.5 rounded-xl border text-left leading-relaxed bg-amber-50/90 border-amber-100 text-amber-800 shadow-3xs flex items-start justify-between gap-3 w-full max-w-md">
          <div className="min-w-0">
            <strong className="text-amber-900 block mb-1 font-bold">🎙️ Voice Assistance Info:</strong>
            <p className="text-[11px] leading-relaxed select-text">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-amber-600 hover:text-amber-900 bg-amber-100/50 hover:bg-amber-100 p-1 rounded-lg transition-all shrink-0 select-none"
            aria-label="Dismiss error message"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Help message */}
      <div className="mt-4 flex items-center gap-1.5 text-slate-400">
        <span className="text-[10px] font-mono">SPEECH_API_LOOP // CONTINUOUS FEEDBACK</span>
      </div>
    </div>
  );
}
