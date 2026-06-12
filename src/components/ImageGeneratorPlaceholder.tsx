import React, { useState, useEffect } from 'react';
import { Sparkles, Image as ImageIcon } from 'lucide-react';

export default function ImageGeneratorPlaceholder() {
  const [step, setStep] = useState(0);
  const steps = [
    "Analyzing prompt semantics...",
    "Sampling latent noise canvas...",
    "Diffusing rich neural shapes...",
    "Applying style & lighting tensors...",
    "Refining high-resolution details...",
    "Polishing final custom artifact..."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-950 p-6 flex flex-col items-center justify-center text-center shadow-md relative overflow-hidden aspect-square w-full max-w-xs sm:max-w-sm">
      {/* Background radial soft lights */}
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-indigo-500/5 to-purple-500/15 opacity-80 animate-pulse" />
      <div className="absolute top-[30%] left-[30%] -translate-x-[30%] -translate-y-[30%] w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-[30%] right-[30%] translate-x-[30%] translate-y-[30%] w-36 h-36 bg-purple-500/10 rounded-full blur-2xl animate-pulse" />
      
      {/* Ring Loader */}
      <div className="relative z-10 flex items-center justify-center mb-5">
        <div className="absolute inset-x-0 inset-y-0 rounded-full border-2 border-cyan-500/20 animate-ping duration-[3000ms]" />
        <div className="h-16 w-16 rounded-full border-2 border-t-cyan-400 border-r-indigo-500 border-b-purple-500 border-l-slate-800 animate-spin flex items-center justify-center shadow-lg bg-slate-900">
          <ImageIcon size={22} className="text-cyan-400 animate-pulse" />
        </div>
        <div className="absolute -top-1 -right-1">
          <Sparkles size={16} className="text-purple-400 animate-bounce" />
        </div>
      </div>

      {/* Progress Message */}
      <div className="relative z-10 space-y-2 mt-1">
        <h4 className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold text-cyan-400/90">
          AI IMAGE ENGINE
        </h4>
        <p className="text-xs text-slate-100 font-medium h-5 flex items-center justify-center">
          {steps[step]}
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all duration-500 ${
                idx <= step ? 'w-4 bg-cyan-400' : 'w-1 bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
