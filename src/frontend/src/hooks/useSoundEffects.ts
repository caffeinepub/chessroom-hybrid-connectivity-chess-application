// Sound effects hook using Web Audio API (no external files needed)
import { useCallback, useRef, useState } from "react";

// Module-level audio context (singleton)
let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    if (_audioCtx.state === "suspended") {
      _audioCtx.resume();
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

function playToneImmediate(
  soundEnabled: boolean,
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gainValue = 0.3,
  delay = 0,
) {
  if (!soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
    gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(
      gainValue,
      ctx.currentTime + delay + 0.01,
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + delay + duration,
    );
    oscillator.start(ctx.currentTime + delay);
    oscillator.stop(ctx.currentTime + delay + duration);
  } catch {
    // ignore audio errors
  }
}

export function useSoundEffects() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("chessroom_sound") !== "false";
  });

  // Use ref so callbacks always have fresh value without re-creating
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const playMove = useCallback(() => {
    playToneImmediate(soundEnabledRef.current, 800, 0.05, "sine", 0.2);
  }, []);

  const playCapture = useCallback(() => {
    playToneImmediate(soundEnabledRef.current, 400, 0.1, "sawtooth", 0.25);
    playToneImmediate(
      soundEnabledRef.current,
      300,
      0.08,
      "sawtooth",
      0.2,
      0.05,
    );
  }, []);

  const playCheck = useCallback(() => {
    playToneImmediate(soundEnabledRef.current, 1200, 0.2, "sine", 0.3);
    playToneImmediate(soundEnabledRef.current, 600, 0.2, "sine", 0.25, 0.05);
  }, []);

  const playWin = useCallback(() => {
    playToneImmediate(soundEnabledRef.current, 523.25, 0.2, "sine", 0.3, 0);
    playToneImmediate(soundEnabledRef.current, 659.25, 0.2, "sine", 0.3, 0.15);
    playToneImmediate(soundEnabledRef.current, 783.99, 0.35, "sine", 0.35, 0.3);
  }, []);

  const playLose = useCallback(() => {
    playToneImmediate(soundEnabledRef.current, 783.99, 0.2, "sine", 0.3, 0);
    playToneImmediate(soundEnabledRef.current, 659.25, 0.2, "sine", 0.3, 0.15);
    playToneImmediate(soundEnabledRef.current, 523.25, 0.35, "sine", 0.3, 0.3);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundEnabledRef.current = next;
      localStorage.setItem("chessroom_sound", next ? "true" : "false");
      return next;
    });
  }, []);

  return {
    playMove,
    playCapture,
    playCheck,
    playWin,
    playLose,
    soundEnabled,
    toggleSound,
  };
}
