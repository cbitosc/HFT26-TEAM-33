/**
 * Emergency SOS Alarm and Buzzer
 * Uses Android native hardware tone generator and vibrator via MeshPlugin
 * alongside the Web Audio API synthesizer. Operates 100% offline without Wi-Fi.
 */
import { registerPlugin, Capacitor } from '@capacitor/core';

interface MeshAudioPlugin {
  startSiren(): Promise<void>;
  stopSiren(): Promise<void>;
}

const MeshAudio = registerPlugin<MeshAudioPlugin>('Mesh');

let audioCtx: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let sirenInterval: number | null = null;
let vibrationInterval: number | null = null;
let isPlaying = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playSosAlarm(): void {
  if (isPlaying) return;
  isPlaying = true;

  // 1. Android Native Hardware Alarm & Vibrator (works 100% offline without Wi-Fi)
  if (Capacitor.isNativePlatform()) {
    MeshAudio.startSiren().catch((err) => console.warn('Native siren start failed:', err));
  }

  // 2. Web Audio API alarm
  try {
    const ctx = getAudioContext();

    oscillator = ctx.createOscillator();
    gainNode = ctx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.85, ctx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();

    // Toggle frequency every 250ms for aggressive warble siren
    let high = false;
    sirenInterval = window.setInterval(() => {
      if (!oscillator || !ctx) return;
      high = !high;
      const freq = high ? 1200 : 880;
      oscillator.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
    }, 250);
  } catch (err) {
    console.warn('AudioContext alarm error:', err);
  }

  // Mobile haptic vibration fallback
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([500, 150, 500, 150, 800]);
      vibrationInterval = window.setInterval(() => {
        navigator.vibrate([500, 150, 500, 150, 800]);
      }, 2200);
    }
  } catch (err) {
    console.warn('Vibration error:', err);
  }
}

export function stopSosAlarm(): void {
  isPlaying = false;

  // 1. Stop Native Hardware Alarm
  if (Capacitor.isNativePlatform()) {
    MeshAudio.stopSiren().catch(() => {});
  }

  // 2. Stop Web Audio
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }

  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }

  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(0);
    }
  } catch {}

  try {
    if (oscillator) {
      oscillator.stop();
      oscillator.disconnect();
      oscillator = null;
    }
    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }
  } catch (err) {
    console.warn('Stop alarm error:', err);
  }
}

export function isAlarmActive(): boolean {
  return isPlaying;
}
