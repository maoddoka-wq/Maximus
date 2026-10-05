const SOUND_PREFERENCE_KEY = 'maximus-notification-sound-enabled';

export function isNotificationSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_PREFERENCE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    if (enabled) window.localStorage.setItem(SOUND_PREFERENCE_KEY, 'true');
    else window.localStorage.removeItem(SOUND_PREFERENCE_KEY);
  } catch {
    // A blocked localStorage must not prevent the notification page from working.
  }
}

let audioContext: AudioContext | null = null;

export async function playNotificationSound(force = false): Promise<boolean> {
  if (!force && !isNotificationSoundEnabled()) return false;
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return false;

  try {
    audioContext ??= new window.AudioContext();
    if (audioContext.state === 'suspended') await audioContext.resume();

    const startAt = audioContext.currentTime;
    [660, 880].forEach((frequency, index) => {
      const oscillator = audioContext!.createOscillator();
      const gain = audioContext!.createGain();
      const toneStart = startAt + index * 0.16;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, toneStart);
      gain.gain.setValueAtTime(0.0001, toneStart);
      gain.gain.exponentialRampToValueAtTime(0.09, toneStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.14);
      oscillator.connect(gain);
      gain.connect(audioContext!.destination);
      oscillator.start(toneStart);
      oscillator.stop(toneStart + 0.15);
    });

    return true;
  } catch {
    return false;
  }
}
