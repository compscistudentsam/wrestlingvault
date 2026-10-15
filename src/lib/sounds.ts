let context: AudioContext | undefined;
/** Original synthesised mechanical ticks; no downloaded sound assets. */
export function playTick(enabled: boolean, wheel = false) {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    const audio = context;
    void audio
      .resume()
      .then(() => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = 'triangle';
        const now = audio.currentTime;
        oscillator.frequency.setValueAtTime(wheel ? 1100 : 700, now);
        oscillator.frequency.exponentialRampToValueAtTime(130, now + 0.035);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
      })
      .catch(() => {});
  } catch {
    /* Audio is optional when a device is unavailable. */
  }
}
