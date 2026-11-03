// High-fidelity Chess Sound Effects Engine
// Powered by pre-buffered Web Audio API with zero latency
// Features authentic, crisp, natural acoustic wooden chess piece sounds

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.buffers = {};
    this.loading = {};
    this.tokenTimestamps = new Map();
    this.lastPlayTime = 0;

    this.soundPaths = {
      capture: '/assets/sounds/capture.mp3',
      move: '/assets/sounds/move.mp3',
      check: '/assets/sounds/check.mp3',
      castle: '/assets/sounds/castle.mp3',
      gameEnd: '/assets/sounds/game-end.mp3',
      notify: '/assets/sounds/notify.mp3'
    };

    // Auto-init on script load and unlock on first user gesture
    if (typeof window !== 'undefined') {
      this.init();
      const unlockAudio = () => {
        this.resumeAudio();
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });
      window.addEventListener('keydown', unlockAudio, { passive: true, once: true });
    }
  }

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    this.preloadAll();
  }

  resumeAudio() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  preloadAll() {
    Object.keys(this.soundPaths).forEach((name) => {
      this.loadSound(name);
    });
  }

  async loadSound(name) {
    if (this.buffers[name] || this.loading[name]) return this.buffers[name];
    const path = this.soundPaths[name];
    if (!path) return null;

    this.loading[name] = true;
    try {
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      if (this.ctx) {
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.buffers[name] = audioBuffer;
        return audioBuffer;
      }
    } catch (err) {
      console.warn(`Audio preload notice for ${name}:`, err);
    } finally {
      this.loading[name] = false;
    }
    return null;
  }

  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Play audio buffer through Web Audio API with HTML5 Audio fallback
  async _playBuffer(name, gainVal = 1.0) {
    this.init();
    this.resumeAudio();

    if (this.ctx && this.buffers[name]) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[name];

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(gainVal, this.ctx.currentTime);

        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        source.start(0);
        return;
      } catch (e) {
        console.warn('WebAudio play error:', e);
      }
    }

    // Direct HTML5 Audio fallback
    const path = this.soundPaths[name];
    if (path) {
      try {
        const audio = new Audio(path);
        audio.volume = Math.min(1, Math.max(0, gainVal));
        audio.play().catch(() => {});
      } catch (err) {
        console.warn('HTML5 Audio fallback error:', err);
      }
    }
  }

  _scheduleOrPlay(name, token, gainVal = 1.0) {
    if (!this.enabled) return;
    const now = Date.now();

    // 1. Token deduplication: ensures every move plays exactly once
    if (token) {
      const cleanToken = String(token).trim();
      if (!this.tokenTimestamps) {
        this.tokenTimestamps = new Map();
      }
      const lastTokenTime = this.tokenTimestamps.get(cleanToken);
      if (lastTokenTime && (now - lastTokenTime < 3500)) {
        // Prevent duplicate sound for the exact same move token within 3.5 seconds
        return;
      }
      this.tokenTimestamps.set(cleanToken, now);

      // Clean up old tokens (>10 seconds)
      if (this.tokenTimestamps.size > 150) {
        for (const [k, t] of this.tokenTimestamps.entries()) {
          if (now - t > 10000) this.tokenTimestamps.delete(k);
        }
      }
    }

    // 2. Minimum interval between distinct move sounds:
    // If a rapid sequence occurs (e.g. an opponent move immediately followed by our premove),
    // schedule it with a tiny acoustic gap (45ms) so neither move is dropped or muffled.
    const MIN_INTERVAL = 45;
    const timeSinceLast = now - this.lastPlayTime;

    if (timeSinceLast < MIN_INTERVAL) {
      const delay = MIN_INTERVAL - timeSinceLast;
      this.lastPlayTime = now + delay;
      setTimeout(() => {
        this._playBuffer(name, gainVal);
      }, delay);
    } else {
      this.lastPlayTime = now;
      this._playBuffer(name, gainVal);
    }
  }

  // 1. Piece Capture - distinct, slightly heavier piece-removal sound
  playCapture(token) {
    this._scheduleOrPlay('capture', token, 1.0);
  }

  // 2. Normal Piece Movement - crisp, short, natural piece-placement tick
  playMove(token) {
    this._scheduleOrPlay('move', token, 0.95);
  }

  // 3. Check - sharp warning strike
  playCheck(token) {
    this._scheduleOrPlay('check', token, 1.0);
  }

  // 4. Castling - double-piece wooden sequence
  playCastle(token) {
    this._scheduleOrPlay('castle', token, 0.95);
  }

  // 5. Game Completion - resonant end of game sound
  playGameOver(token) {
    this._scheduleOrPlay('gameEnd', token, 1.0);
  }

  // 6. Notification / Alert
  playNotify(token) {
    this._scheduleOrPlay('notify', token, 0.8);
  }

  // Preview sound effect unconditionally (used in Settings)
  preview(soundType) {
    this.init();
    this.resumeAudio();
    const map = {
      move: () => this._playBuffer('move', 0.95),
      capture: () => this._playBuffer('capture', 1.0),
      check: () => this._playBuffer('check', 1.0),
      castle: () => this._playBuffer('castle', 0.95),
      gameEnd: () => this._playBuffer('gameEnd', 1.0),
      notify: () => this._playBuffer('notify', 0.8)
    };
    if (map[soundType]) {
      map[soundType]();
    }
  }
}

export const sounds = new SoundEffects();
