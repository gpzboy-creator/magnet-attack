class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private pitchJitter(baseFreq: number, variance = 0.08): number {
    return baseFreq * (1 + (Math.random() * 2 - 1) * variance);
  }

  /**
   * Crisp DSLR camera shutter click + flash pop
   */
  playShoot() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Shutter blade click 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(this.pitchJitter(880, 0.05), now);
    osc1.frequency.exponentialRampToValueAtTime(220, now + 0.035);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.035);

    // Shutter curtain click 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(this.pitchJitter(640, 0.06), now + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(140, now + 0.09);
    gain2.gain.setValueAtTime(0.16, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.09);
  }

  playDash() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(this.pitchJitter(220, 0.06), now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Sound of photo flash lighting up the dancers
   */
  playHit() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.pitchJitter(520, 0.08), now);
    osc.frequency.exponentialRampToValueAtTime(1040, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * High-tech / instant magnet printer ejection whirr + magnet snap!
   */
  playMagnetPrint() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Printer motor whirr
    const motor = ctx.createOscillator();
    const motorGain = ctx.createGain();
    motor.type = 'sawtooth';
    motor.frequency.setValueAtTime(420, now);
    motor.frequency.linearRampToValueAtTime(680, now + 0.12);
    motorGain.gain.setValueAtTime(0.08, now);
    motorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    motor.connect(motorGain);
    motorGain.connect(ctx.destination);
    motor.start(now);
    motor.stop(now + 0.14);

    // Magnetic "snap" onto frame/board
    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snap.type = 'sine';
    snap.frequency.setValueAtTime(840, now + 0.11);
    snap.frequency.exponentialRampToValueAtTime(320, now + 0.18);
    snapGain.gain.setValueAtTime(0.15, now + 0.11);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    snap.connect(snapGain);
    snapGain.connect(ctx.destination);
    snap.start(now + 0.11);
    snap.stop(now + 0.18);
  }

  /**
   * Guillotine magnet cutter: crisp mechanical snip & paper trim ("קלאק-קלאק!")
   */
  playMagnetCutter() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Metal blade slice
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + 0.07);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    // Mechanical guillotine clack
    const clack = ctx.createOscillator();
    const clackGain = ctx.createGain();
    clack.type = 'triangle';
    clack.frequency.setValueAtTime(320, now + 0.02);
    clack.frequency.exponentialRampToValueAtTime(120, now + 0.09);
    clackGain.gain.setValueAtTime(0.2, now + 0.02);
    clackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    clack.connect(clackGain);
    clackGain.connect(ctx.destination);
    clack.start(now + 0.02);
    clack.stop(now + 0.09);
  }

  /**
   * Magnetic board stick: sharp magnetic snap ("טאק!")
   */
  playBoardStick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snap.type = 'sine';
    snap.frequency.setValueAtTime(980, now);
    snap.frequency.exponentialRampToValueAtTime(240, now + 0.08);
    snapGain.gain.setValueAtTime(0.22, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    snap.connect(snapGain);
    snapGain.connect(ctx.destination);
    snap.start(now);
    snap.stop(now + 0.08);
  }

  /**
   * Guest takes their magnet from the easel board: soft metallic detachment pop + happy chime ("טינג-פופ!")
   */
  playMagnetPickup() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);

    [1046.5, 1318.5].forEach((freq, idx) => {
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(freq, now + 0.05 + idx * 0.06);
      bellGain.gain.setValueAtTime(0.12, now + 0.05 + idx * 0.06);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05 + idx * 0.06 + 0.22);
      bell.connect(bellGain);
      bellGain.connect(ctx.destination);
      bell.start(now + 0.05 + idx * 0.06);
      bell.stop(now + 0.05 + idx * 0.06 + 0.22);
    });
  }

  /**
   * Wedding Guest celebratory reaction when receiving souvenir magnet!
   */
  playKill() {
    this.playMagnetPrint();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Joyful chime (G5 -> C6)
    [784, 1046].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + 0.12 + idx * 0.07);
      gain.gain.setValueAtTime(0.12, now + 0.12 + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12 + idx * 0.07 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 0.12 + idx * 0.07);
      osc.stop(now + 0.12 + idx * 0.07 + 0.18);
    });
  }

  /**
   * Gentle, cheerful dancefloor nudge/bump (no damage!)
   */
  playDanceBump() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playHurt() {
    this.playDanceBump();
  }

  /**
   * Guest calls out for a photo: "צלם אותי!" / waves hands
   */
  playTelegraph() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.15);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Joyful combo chime as more magnets are printed in a row
   */
  playComboChime(combo: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const baseFreqs = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const pitch = baseFreqs[Math.min(baseFreqs.length - 1, Math.max(0, combo - 1))];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, now);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playFanfare(victory: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Cheerful Jewish wedding celebratory progression (Freylekhs / Mazel Tov cadence!)
    const notes = victory
      ? [392, 440, 523, 659, 784] // G4, A4, C5, E5, G5
      : [440, 392, 349, 293];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.16, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.28);
    });
  }
}

export const sound = new SoundEngine();
