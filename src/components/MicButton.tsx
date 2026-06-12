import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle, ExternalLink } from 'lucide-react';

interface MicButtonProps {
  onTranscript: (text: string) => void;
  onListeningStateChange: (listening: boolean) => void;
  disabled?: boolean;
}

// Ensure TypeScript is happy with standard Web Speech API declarations
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
};

export default function MicButton({
  onTranscript,
  onListeningStateChange,
  disabled = false
}: MicButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<React.ReactNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<any>(null);

  const onTranscriptRef = useRef(onTranscript);
  const onListeningStateChangeRef = useRef(onListeningStateChange);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onListeningStateChangeRef.current = onListeningStateChange;
  }, [onListeningStateChange]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    // Check for speech recognition compatibility
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        onListeningStateChangeRef.current(true);
        setErrorMessage(null);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
      };

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript.trim()) {
          onTranscriptRef.current(finalTranscript.trim());
        }

        // Reset silence timeout - if they pause for 2.0 seconds, automatically stop to keep things tidy!
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          console.log("[MicButton] Silence elapsed. Turning off microphone.");
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (e) {
              console.warn(e);
            }
          }
        }, 2000);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        if (event.error === 'not-allowed') {
          setErrorMessage('Permission denied. Please allow microphone access.');
        } else if (event.error === 'service-not-allowed') {
          setErrorMessage(
            <div className="space-y-1.5 text-left text-[10.5px]">
              <span className="font-bold text-amber-900 block">🛑 Browser Sandbox Restriction</span>
              <span>Google Speech Recognition is restricted inside this preview iframe.</span>
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-[9.5px] transition-all"
              >
                <ExternalLink size={9.5} />
                <span>Open in New Tab ↗️</span>
              </a>
            </div>
          );
        } else if (event.error === 'aborted') {
          console.warn('Speech recognition was aborted.');
        } else if (event.error !== 'no-speech') {
          setErrorMessage(`Speech error: ${event.error}`);
        }
        setIsListening(false);
        onListeningStateChangeRef.current(false);
      };

      rec.onend = () => {
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        setIsListening(false);
        onListeningStateChangeRef.current(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListen = () => {
    if (disabled) return;

    if (!recognitionRef.current) {
      setErrorMessage('Speech recognition is not supported in this browser. Please try Chrome, Edge or Safari.');
      // Simulate listener briefly for animation joy so the user still sees feedback
      setIsListening(true);
      onListeningStateChangeRef.current(true);
      setTimeout(() => {
        setIsListening(false);
        onListeningStateChangeRef.current(false);
        onTranscriptRef.current('Speech input simulated: The glacier of Greenland is melting silently.');
      }, 3500);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
        try {
          recognitionRef.current.abort();
          setTimeout(() => {
            try {
              recognitionRef.current.start();
            } catch (retryErr) {
              console.error(retryErr);
            }
          }, 200);
        } catch {}
      }
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleListen}
        disabled={disabled}
        className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-300 active:scale-95 ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white shadow-md shadow-red-100 animate-pulse'
            : 'bg-[#fafcfd] hover:bg-slate-50 border-[#dee8f0] text-slate-500 hover:text-cyan-500 hover:border-cyan-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isListening ? 'Stop listening' : 'Start voice input (microphone)'}
        id="btn-voice-input"
      >
        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>

      {errorMessage && (
        <div className="absolute bottom-14 right-0 w-64 z-50 rounded-xl bg-white border border-red-100 p-2.5 shadow-xl flex items-start gap-2 animate-fade-in">
          <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-[10px] font-medium text-slate-700 leading-normal">{errorMessage}</div>
            <button 
              onClick={() => setErrorMessage(null)} 
              className="mt-1 text-[9px] font-semibold text-cyan-600 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
