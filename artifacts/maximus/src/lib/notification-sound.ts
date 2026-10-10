const SOUND_PREFERENCE_KEY = 'maximus-notification-sound-enabled';

export function isNotificationSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, String(enabled));
  } catch {
    // A blocked localStorage must not prevent notifications from working.
  }
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return null;
  audioContext ??= new window.AudioContext();
  return audioContext;
}

export function prepareNotificationSound(): void {
  try {
    const context = getAudioContext();
    if (context?.state === 'suspended') void context.resume().catch(() => undefined);
  } catch {
    // Browsers may deny audio until the next user gesture.
  }
}

export async function playNotificationSound(force = false): Promise<boolean> {
  if (!force && !isNotificationSoundEnabled()) return false;

  try {
    const context = getAudioContext();
    if (!context) return false;
    if (context.state === 'suspended') await context.resume();

    const startAt = context.currentTime;
    [660, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const toneStart = startAt + index * 0.16;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, toneStart);
      gain.gain.setValueAtTime(0.0001, toneStart);
      gain.gain.exponentialRampToValueAtTime(0.18, toneStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.14);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(toneStart);
      oscillator.stop(toneStart + 0.15);
    });

    return true;
  } catch {
    return false;
  }
}
