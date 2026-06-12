import React, { useState, useRef } from 'react';
import { Plus, Camera, Image as ImageIcon, X } from 'lucide-react';

interface AddMediaProps {
  onCapture: (imageDataUrl: string) => void;
  disabled?: boolean;
}

export default function AddMedia({ onCapture, disabled }: AddMediaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    setIsOpen(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      alert("Camera access denied.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      onCapture(imageDataUrl);
      
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsOpen(false);
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onCapture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
          disabled ? 'bg-slate-100 text-slate-350 cursor-not-allowed' : 'bg-slate-50 text-slate-500 hover:bg-cyan-50 hover:text-cyan-600'
        }`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        title="Add Picture"
      >
        <Plus size={20} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-xl shadow-lg border border-slate-200 p-1 z-50">
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
            onClick={startCamera}
          >
            <Camera size={16} />
            Camera
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon size={16} />
            Gallery
          </button>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {isCameraActive && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl aspect-[3/4] bg-slate-900 border border-slate-700 shadow-2xl">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              autoPlay
            />
            <button
              type="button"
              className="absolute bottom-6 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95"
              onClick={capturePhoto}
              title="Capture Photo"
            >
              <div className="h-10 w-10 rounded-full bg-white border-2 border-black" />
            </button>
            <button
              type="button"
              className="absolute top-4 right-4 text-white"
              onClick={() => {
                const stream = videoRef.current?.srcObject as MediaStream;
                stream?.getTracks().forEach(track => track.stop());
                setIsCameraActive(false);
              }}
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
