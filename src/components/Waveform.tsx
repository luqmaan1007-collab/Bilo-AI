import { useEffect, useRef } from 'react';

interface WaveformProps {
  isListening: boolean;
}

export default function Waveform({ isListening }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Clear with very transparent white to create a slight motion blur trail
      ctx.clearRect(0, 0, width, height);

      const targetAmplitude = isListening ? 25 : 3;
      const speed = isListening ? 0.08 : 0.02;
      phase += speed;

      // Draw 3 layers of beautiful icy lines
      const waveConfigs = [
        { color: 'rgba(196, 218, 235, 0.45)', frequency: 0.015, amplitude: targetAmplitude * 0.9, shift: 0 },
        { color: 'rgba(135, 180, 215, 0.3)', frequency: 0.025, amplitude: targetAmplitude * 0.7, shift: Math.PI / 2 },
        { color: 'rgba(215, 230, 245, 0.65)', frequency: 0.01, amplitude: targetAmplitude * 0.4, shift: Math.PI }
      ];

      waveConfigs.forEach((config) => {
        ctx.beginPath();
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 1.5;

        for (let x = 0; x < width; x++) {
          // Fade amplitude at edges (sine envelope)
          const envelope = Math.sin((x / width) * Math.PI);
          const y = height / 2 + Math.sin(x * config.frequency + phase + config.shift) * config.amplitude * envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [isListening]);

  return (
    <div className="relative w-full h-12 bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100/80">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      {isListening && (
        <div className="absolute top-2 right-3 flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-full border border-[#e3edf6] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
          <span className="text-[10px] font-mono font-medium tracking-tight text-slate-500">LISTENING</span>
        </div>
      )}
    </div>
  );
}
