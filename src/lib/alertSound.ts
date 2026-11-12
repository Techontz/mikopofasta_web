"use client";

/**
 * A short two-note chime for new messages and notifications, synthesised with the Web Audio API (no sound file).
 * Browsers only allow sound after the user has interacted with the page, so the audio context is created on the first
 * click or key press; until then a chime is silently skipped. The preference is kept per browser ("mf-alert-sound").
 */
let context: AudioContext | null = null;
let armed = false;

const STORAGE_KEY = "mf-alert-sound";

function unlock(): void {
  try {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtor && !context) {
      context = new AudioCtor();
    }
    void context?.resume();
  } catch {
    context = null;
  }
}

/** Arm the chime: call once from a client component; it waits for the first user gesture. */
export function armAlertSound(): void {
  if (armed || typeof window === "undefined") {
    return;
  }
  armed = true;
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

export function alertSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setAlertSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Private mode / blocked storage: the default (on) applies.
  }
}

export function playAlertSound(): void {
  if (!context || context.state !== "running" || !alertSoundEnabled()) {
    return;
  }
  const start = context.currentTime;
  [880, 1320].forEach((frequency, index) => {
    const oscillator = context!.createOscillator();
    const gain = context!.createGain();
    const at = start + index * 0.16;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
    oscillator.connect(gain).connect(context!.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.32);
  });
}
