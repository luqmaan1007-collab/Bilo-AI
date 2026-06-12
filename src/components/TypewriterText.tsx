import React, { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number; // ms per character
  onComplete?: () => void;
  className?: string;
  renderFormatted?: boolean;
}

export default function TypewriterText({
  text,
  speed = 8,
  onComplete,
  className = '',
  renderFormatted = false
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const textRef = useRef(text);
  const indexRef = useRef(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    // If the text actually changes (or is a new system prompt), restart
    textRef.current = text;
    setDisplayedText('');
    setIsTypingComplete(false);
    indexRef.current = 0;

    if (timerRef.current) clearInterval(timerRef.current);

    // Snappy typewriter loop
    timerRef.current = setInterval(() => {
      const fullText = textRef.current;
      const currentIndex = indexRef.current;

      if (currentIndex < fullText.length) {
        // Handle chunks or characters
        const nextChar = fullText.charAt(currentIndex);
        setDisplayedText((prev) => prev + nextChar);
        indexRef.current = currentIndex + 1;
      } else {
        clearInterval(timerRef.current);
        setIsTypingComplete(true);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text, speed]);

  // If clicked, finish typing instantly for a smooth user experience
  const handleFastForward = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayedText(text);
    setIsTypingComplete(true);
    if (onComplete) onComplete();
  };

  return (
    <div 
      className={`relative inline-block cursor-pointer select-text ${className}`}
      onClick={!isTypingComplete ? handleFastForward : undefined}
      title={!isTypingComplete ? "Click to instantly complete text typing" : undefined}
    >
      <span>{displayedText}</span>
      {!isTypingComplete && (
        <span className="inline-block w-1.5 h-3 bg-cyan-400 ml-0.5 animate-pulse rounded-xs" style={{ verticalAlign: 'middle' }} />
      )}
    </div>
  );
}
