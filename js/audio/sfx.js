/**
 * SFX - Procedural sound effects via Web Audio API
 * No external audio files. All sounds generated from oscillators and noise.
 * AudioContext is created on first user interaction via init().
 */
var SFX = (function () {
    var ctx = null;
    var masterGain = null;
    var chlorineSource = null;
    var chlorineGain = null;
    var _originalMasterVolume = 0.3;

    // ── Helpers ──────────────────────────────────────────────────────────

    /**
     * Create an AudioBuffer filled with white noise.
     * @param {number} duration - Duration in seconds.
     * @returns {AudioBuffer}
     */
    function createNoise(duration) {
        var sampleRate = ctx.sampleRate;
        var length = Math.floor(sampleRate * duration);
        var buffer = ctx.createBuffer(1, length, sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    /**
     * Quick oscillator helper. Plays a tone and auto-disconnects.
     * @param {number} freq - Frequency in Hz.
     * @param {string} type - Oscillator type (sine, square, sawtooth, triangle).
     * @param {number} duration - Duration in seconds.
     * @param {number} [volume=0.3] - Volume 0-1.
     * @param {number} [startTime] - AudioContext time to start (default: now).
     * @returns {{osc: OscillatorNode, gain: GainNode}} References for further manipulation.
     */
    function playTone(freq, type, duration, volume, startTime) {
        if (!ctx) return null;
        var t = startTime !== undefined ? startTime : ctx.currentTime;
        var vol = volume !== undefined ? volume : 0.3;

        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(vol, t);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(t);
        osc.stop(t + duration);
        osc.onended = function () {
            osc.disconnect();
            gain.disconnect();
        };

        return { osc: osc, gain: gain };
    }

    /**
     * Apply an ADSR envelope to a gain node.
     * @param {GainNode} gainNode
     * @param {number} attack - Attack time in seconds.
     * @param {number} decay - Decay time in seconds.
     * @param {number} sustain - Sustain level 0-1.
     * @param {number} release - Release time in seconds.
     * @param {number} duration - Total note duration in seconds.
     * @param {number} [startTime] - AudioContext start time.
     * @param {number} [peakVolume=1] - Peak volume at end of attack.
     */
    function envelope(gainNode, attack, decay, sustain, release, duration, startTime, peakVolume) {
        var t = startTime !== undefined ? startTime : ctx.currentTime;
        var peak = peakVolume !== undefined ? peakVolume : 1;

        gainNode.gain.setValueAtTime(0.001, t);
        gainNode.gain.linearRampToValueAtTime(peak, t + attack);
        gainNode.gain.linearRampToValueAtTime(sustain * peak, t + attack + decay);

        var releaseStart = t + duration - release;
        if (releaseStart > t + attack + decay) {
            gainNode.gain.setValueAtTime(sustain * peak, releaseStart);
        }
        gainNode.gain.linearRampToValueAtTime(0.001, t + duration);
    }

    // ── Public API ───────────────────────────────────────────────────────

    return {
        /** Expose AudioContext for Music to share. */
        ctx: null,

        /**
         * Create (or reuse) the AudioContext and master gain.
         * Call on first user interaction.
         */
        init: function () {
            if (ctx) return;
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.ctx = ctx;

            masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(_originalMasterVolume, ctx.currentTime);
            masterGain.connect(ctx.destination);
        },

        /**
         * Resume AudioContext if it is suspended (browser autoplay policy).
         */
        resume: function () {
            if (ctx && ctx.state === 'suspended') {
                ctx.resume();
            }
        },

        // ── Rain ─────────────────────────────────────────────────────────

        /**
         * Start filtered white-noise rain ambient loop.
         * @returns {Function} stop - Call to stop the rain.
         */
        playChlorineAmbient: function () {
            if (!ctx) return function () {};
            // Don't double-start
            if (chlorineSource) return function () { SFX.stopChlorineAmbient(); };

            var buffer = createNoise(2); // 2-second looping buffer
            var source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;

            var bandpass = ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.setValueAtTime(800, ctx.currentTime);
            bandpass.Q.setValueAtTime(0.8, ctx.currentTime);

            var gain = ctx.createGain();
            gain.gain.setValueAtTime(0.1, ctx.currentTime);

            source.connect(bandpass);
            bandpass.connect(gain);
            gain.connect(masterGain);

            source.start();
            chlorineSource = source;
            chlorineGain = gain;

            var self = this;
            return function () { self.stopChlorineAmbient(); };
        },

        /**
         * Stop rain ambient if currently playing.
         */
        stopChlorineAmbient: function () {
            if (chlorineSource) {
                try { chlorineSource.stop(); } catch (e) {}
                chlorineSource.disconnect();
                chlorineSource = null;
            }
            if (chlorineGain) {
                chlorineGain.disconnect();
                chlorineGain = null;
            }
        },

        // ── Rain Drop ────────────────────────────────────────────────────

        /**
         * Very short high-pitched blip (50ms).
         */
        playChlorineDrop: function () {
            if (!ctx) return;
            var t = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(2000 + Math.random() * 500, t);

            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(t);
            osc.stop(t + 0.05);
            osc.onended = function () { osc.disconnect(); gain.disconnect(); };
        },

        // ── Hail ─────────────────────────────────────────────────────────

        /**
         * Short whoosh - filtered noise burst with frequency sweep (100ms).
         */
        playOzoneThrow: function () {
            if (!ctx) return;
            var t = ctx.currentTime;

            var buffer = createNoise(0.1);
            var source = ctx.createBufferSource();
            source.buffer = buffer;

            var filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(500, t);
            filter.frequency.exponentialRampToValueAtTime(2000, t + 0.1);
            filter.Q.setValueAtTime(2, t);

            var gain = ctx.createGain();
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

            source.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);

            source.start(t);
            source.stop(t + 0.1);
            source.onended = function () { source.disconnect(); filter.disconnect(); gain.disconnect(); };
        },

        /**
         * Hard impact: noise burst + sine thud.
         */
        playOzoneImpact: function () {
            if (!ctx) return;
            var t = ctx.currentTime;

            // Noise burst (50ms)
            var noiseBuffer = createNoise(0.05);
            var noiseSrc = ctx.createBufferSource();
            noiseSrc.buffer = noiseBuffer;

            var noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.35, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

            noiseSrc.connect(noiseGain);
            noiseGain.connect(masterGain);
            noiseSrc.start(t);
            noiseSrc.stop(t + 0.05);
            noiseSrc.onended = function () { noiseSrc.disconnect(); noiseGain.disconnect(); };

            // Sine thud at 150Hz (100ms, decay)
            var osc = ctx.createOscillator();
            var oscGain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, t);

            oscGain.gain.setValueAtTime(0.4, t);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

            osc.connect(oscGain);
            oscGain.connect(masterGain);
            osc.start(t);
            osc.stop(t + 0.1);
            osc.onended = function () { osc.disconnect(); oscGain.disconnect(); };
        },

        // ── Lightning ────────────────────────────────────────────────────

        /**
         * Layered lightning strike: crack + bolt sweep + rumble + volume shock.
         */
        playUVPulse: function () {
            if (!ctx) return;
            var t = ctx.currentTime;

            // 1) Initial crack: highpass noise burst, 30ms, loud
            var crackBuf = createNoise(0.03);
            var crackSrc = ctx.createBufferSource();
            crackSrc.buffer = crackBuf;

            var crackHP = ctx.createBiquadFilter();
            crackHP.type = 'highpass';
            crackHP.frequency.setValueAtTime(3000, t);

            var crackGain = ctx.createGain();
            crackGain.gain.setValueAtTime(0.7, t);
            crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

            crackSrc.connect(crackHP);
            crackHP.connect(crackGain);
            crackGain.connect(masterGain);
            crackSrc.start(t);
            crackSrc.stop(t + 0.03);
            crackSrc.onended = function () { crackSrc.disconnect(); crackHP.disconnect(); crackGain.disconnect(); };

            // 2) Main bolt: resonant bandpass sweep 2000→200Hz, 200ms
            var boltBuf = createNoise(0.2);
            var boltSrc = ctx.createBufferSource();
            boltSrc.buffer = boltBuf;

            var boltBP = ctx.createBiquadFilter();
            boltBP.type = 'bandpass';
            boltBP.frequency.setValueAtTime(2000, t + 0.03);
            boltBP.frequency.exponentialRampToValueAtTime(200, t + 0.23);
            boltBP.Q.setValueAtTime(5, t + 0.03);

            var boltGain = ctx.createGain();
            boltGain.gain.setValueAtTime(0.5, t + 0.03);
            boltGain.gain.exponentialRampToValueAtTime(0.001, t + 0.23);

            boltSrc.connect(boltBP);
            boltBP.connect(boltGain);
            boltGain.connect(masterGain);
            boltSrc.start(t + 0.03);
            boltSrc.stop(t + 0.23);
            boltSrc.onended = function () { boltSrc.disconnect(); boltBP.disconnect(); boltGain.disconnect(); };

            // 3) Rumble: low sine 40-60Hz with tremolo, 800ms fade
            var rumbleOsc = ctx.createOscillator();
            rumbleOsc.type = 'sine';
            rumbleOsc.frequency.setValueAtTime(40, t + 0.1);
            rumbleOsc.frequency.linearRampToValueAtTime(60, t + 0.5);
            rumbleOsc.frequency.linearRampToValueAtTime(40, t + 0.9);

            var tremoloOsc = ctx.createOscillator();
            var tremoloGain = ctx.createGain();
            tremoloOsc.type = 'sine';
            tremoloOsc.frequency.setValueAtTime(6, t + 0.1);
            tremoloGain.gain.setValueAtTime(0.15, t + 0.1);
            tremoloOsc.connect(tremoloGain);

            var rumbleGain = ctx.createGain();
            rumbleGain.gain.setValueAtTime(0.35, t + 0.1);
            rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

            tremoloGain.connect(rumbleGain.gain);
            rumbleOsc.connect(rumbleGain);
            rumbleGain.connect(masterGain);

            rumbleOsc.start(t + 0.1);
            tremoloOsc.start(t + 0.1);
            rumbleOsc.stop(t + 0.9);
            tremoloOsc.stop(t + 0.9);
            rumbleOsc.onended = function () { rumbleOsc.disconnect(); rumbleGain.disconnect(); tremoloOsc.disconnect(); tremoloGain.disconnect(); };

            // 4) Volume shock: brief bump, then restore
            masterGain.gain.setValueAtTime(0.45, t);
            masterGain.gain.setValueAtTime(_originalMasterVolume, t + 0.15);
        },

        // ── Thunder ──────────────────────────────────────────────────────

        /**
         * Lower, longer rumble. Filtered noise 100-200Hz, 1.5s, slow decay, slight delay.
         */
        playUVThunder: function () {
            if (!ctx) return;
            var t = ctx.currentTime;
            var delay = 0.15; // slight delay before rumble starts

            var buffer = createNoise(1.5);
            var source = ctx.createBufferSource();
            source.buffer = buffer;

            var lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.setValueAtTime(200, t + delay);

            var hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.setValueAtTime(100, t + delay);

            var gain = ctx.createGain();
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(0.35, t + delay + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 1.5);

            source.connect(lp);
            lp.connect(hp);
            hp.connect(gain);
            gain.connect(masterGain);

            source.start(t + delay);
            source.stop(t + delay + 1.5);
            source.onended = function () { source.disconnect(); lp.disconnect(); hp.disconnect(); gain.disconnect(); };
        },

        // ── Scream ───────────────────────────────────────────────────────

        /**
         * Comical fleeing scream: sine with vibrato, 800Hz base +-200Hz wobble at 8Hz, 400ms.
         */
        playScream: function () {
            if (!ctx) return;
            var t = ctx.currentTime;

            var osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, t);
            // Slight upward sweep for comedic effect
            osc.frequency.linearRampToValueAtTime(1000, t + 0.15);
            osc.frequency.linearRampToValueAtTime(600, t + 0.4);

            // Vibrato via LFO
            var lfo = ctx.createOscillator();
            var lfoGain = ctx.createGain();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(8, t);
            lfoGain.gain.setValueAtTime(200, t);
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);

            var gain = ctx.createGain();
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(0.35, t + 0.03);
            gain.gain.setValueAtTime(0.35, t + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(t);
            lfo.start(t);
            osc.stop(t + 0.4);
            lfo.stop(t + 0.4);
            osc.onended = function () { osc.disconnect(); gain.disconnect(); lfo.disconnect(); lfoGain.disconnect(); };
        },

        // ── Combo Chime ──────────────────────────────────────────────────

        /**
         * Musical chime scaled by tier (0-4). Higher tiers add harmony and power.
         * @param {number} tier - 0 to 4.
         */
        playComboChime: function (tier) {
            if (!ctx) return;
            tier = tier || 0;
            var t = ctx.currentTime;

            var freqs, duration, vol;

            if (tier <= 1) {
                freqs = [880];
                duration = 0.2;
                vol = 0.15;
            } else if (tier === 2) {
                freqs = [880, 1100];
                duration = 0.3;
                vol = 0.15;
            } else if (tier === 3) {
                freqs = [880, 1100, 1320];
                duration = 0.4;
                vol = 0.18;
            } else {
                // tier 4+: chord with distortion
                freqs = [880, 1100, 1320];
                duration = 0.4;
                vol = 0.2;
            }

            for (var i = 0; i < freqs.length; i++) {
                var osc = ctx.createOscillator();
                var oscGain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freqs[i], t);

                oscGain.gain.setValueAtTime(vol / freqs.length, t);
                oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

                if (tier >= 4) {
                    // Distortion via waveshaper
                    var shaper = ctx.createWaveShaper();
                    var curve = new Float32Array(256);
                    for (var j = 0; j < 256; j++) {
                        var x = (j / 128) - 1;
                        curve[j] = (Math.PI + 50) * x / (Math.PI + 50 * Math.abs(x));
                    }
                    shaper.curve = curve;
                    shaper.oversample = '4x';

                    osc.connect(shaper);
                    shaper.connect(oscGain);
                } else {
                    osc.connect(oscGain);
                }

                oscGain.connect(masterGain);
                osc.start(t);
                osc.stop(t + duration);
                (function (o, g, s) {
                    o.onended = function () { o.disconnect(); g.disconnect(); if (s) s.disconnect(); };
                })(osc, oscGain, tier >= 4 ? shaper : null);
            }
        },

        // ── Power Up ─────────────────────────────────────────────────────

        /**
         * Ascending arpeggio: C5, E5, G5, C6 - four quick 80ms notes.
         */
        playPowerUp: function () {
            if (!ctx) return;
            var t = ctx.currentTime;
            // C5=523.25, E5=659.25, G5=783.99, C6=1046.50
            var notes = [523.25, 659.25, 783.99, 1046.50];
            for (var i = 0; i < notes.length; i++) {
                playTone(notes[i], 'sine', 0.08, 0.25, t + i * 0.08);
            }
        },

        // ── Menu Select ──────────────────────────────────────────────────

        /**
         * Short blip: sine 660Hz, 100ms.
         */
        playMenuSelect: function () {
            if (!ctx) return;
            var t = ctx.currentTime;
            var ref = playTone(660, 'sine', 0.1, 0.2, t);
            if (ref) {
                ref.gain.gain.setValueAtTime(0.2, t);
                ref.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            }
        },

        // ── Death ────────────────────────────────────────────────────────

        /**
         * Quick descending tone (400->100Hz, 200ms) + noise burst.
         */
        playDeath: function () {
            if (!ctx) return;
            var t = ctx.currentTime;

            // Descending sine
            var osc = ctx.createOscillator();
            var oscGain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
            oscGain.gain.setValueAtTime(0.35, t);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

            osc.connect(oscGain);
            oscGain.connect(masterGain);
            osc.start(t);
            osc.stop(t + 0.2);
            osc.onended = function () { osc.disconnect(); oscGain.disconnect(); };

            // Noise burst
            var noiseBuf = createNoise(0.15);
            var noiseSrc = ctx.createBufferSource();
            noiseSrc.buffer = noiseBuf;

            var noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.3, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

            noiseSrc.connect(noiseGain);
            noiseGain.connect(masterGain);
            noiseSrc.start(t);
            noiseSrc.stop(t + 0.15);
            noiseSrc.onended = function () { noiseSrc.disconnect(); noiseGain.disconnect(); };
        },

        // ── Boss Warning ─────────────────────────────────────────────────

        /**
         * Low ominous horn: sawtooth 110Hz, slow crescendo 1s, vibrato.
         */
        playBossWarning: function () {
            if (!ctx) return;
            var t = ctx.currentTime;

            var osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, t);

            // Vibrato LFO
            var lfo = ctx.createOscillator();
            var lfoGain = ctx.createGain();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(5, t);
            lfoGain.gain.setValueAtTime(8, t);
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);

            var gain = ctx.createGain();
            // Slow crescendo
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(0.35, t + 0.8);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(t);
            lfo.start(t);
            osc.stop(t + 1.0);
            lfo.stop(t + 1.0);
            osc.onended = function () { osc.disconnect(); gain.disconnect(); lfo.disconnect(); lfoGain.disconnect(); };
        },

        // ── Exposed helpers (for Music or external use) ──────────────────

        setVolume: function(v) { if (masterGain && ctx) masterGain.gain.setValueAtTime(v, ctx.currentTime); _originalMasterVolume = v; },

        createNoise: createNoise,
        playTone: playTone,
        envelope: envelope
    };
})();
