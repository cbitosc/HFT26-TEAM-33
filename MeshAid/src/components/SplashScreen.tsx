import React, { useRef, useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Attempt play in case autoplay is delayed
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Autoplay may be restricted in some environments; fallback gracefully
      });
    }

    // Safety fallback timeout in case onEnded doesn't fire
    const safetyTimeout = setTimeout(() => {
      onFinish();
    }, 4500);

    return () => clearTimeout(safetyTimeout);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden select-none">
      {/* 9:16 container matching the mobile app dimensions */}
      <div className="w-full max-w-md h-full aspect-[9/16] max-h-screen relative flex items-center justify-center overflow-hidden bg-black shadow-2xl border-x border-[#272B34]">
        <video
          ref={videoRef}
          src="/assets/aistudio/intro_658d12b5.mp4"
          autoPlay
          muted
          playsInline
          controls={false}
          onEnded={onFinish}
          onError={onFinish}
          className="w-full h-full object-cover"
        />

        {/* Accessible skip tap button */}
        <button
          type="button"
          onClick={onFinish}
          className="absolute bottom-6 right-6 px-3 py-1 bg-black/70 hover:bg-black/90 text-white/80 hover:text-white rounded-full text-xs backdrop-blur-md border border-white/20 transition-opacity opacity-80 hover:opacity-100 cursor-pointer shadow-lg"
          aria-label="Skip intro video"
        >
          Skip
        </button>
      </div>
    </div>
  );
};
