/**
 * Music - Tracker-style procedural music sequencer via Web Audio API.
 * Shares AudioContext with SFX (SFX.ctx). Must call SFX.init() first.
 *
 * Multiple tracks for different game phases, plus dynamic intensity.
 */
var Music = (function () {
    var ctx = null;
    var masterGain = null;
    var playing = false;
    var schedulerTimer = null;

    // Timing
    var bpm = 140;
    var stepsPerBeat = 4;
    var stepDuration = 60 / bpm / stepsPerBeat;
    var currentStep = 0;
    var nextStepTime = 0;
    var scheduleAhead = 0.1;

    // Intensity: 0=calm, 1=normal, 2=intense, 3=metal
    var intensity = 1;
    var currentPattern = 0;
    var currentTrack = 'main';

    // Channel gain nodes
    var bassGain = null;
    var leadGain = null;
    var padGain = null;
    var drumGain = null;

    // Distortion node for metal mode
    var distortion = null;
    var distortionActive = false;

    // ── Note frequency lookup ──────────────────────────────────────
    var NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

    function noteToFreq(note) {
        if (!note || note === '-') return 0;
        var match = note.match(/^([A-G][b#]?)(\d)$/);
        if (!match) return 0;
        var name = match[1];
        var octave = parseInt(match[2], 10);
        var semitone = NOTE_NAMES.indexOf(name);
        if (semitone === -1) return 0;
        var midi = semitone + (octave + 1) * 12;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    // ── Chord lookup ───────────────────────────────────────────────
    var CHORDS = {
        'Cm':  ['C3', 'Eb3', 'G3'],
        'Dm':  ['D3', 'F3', 'A3'],
        'Eb':  ['Eb3', 'G3', 'Bb3'],
        'Fm':  ['F3', 'Ab3', 'C4'],
        'Gm':  ['G3', 'Bb3', 'D4'],
        'G':   ['G3', 'B3', 'D4'],
        'Abm': ['Ab3', 'C4', 'Eb4'],
        'Ab':  ['Ab3', 'C4', 'Eb4'],
        'Bbm': ['Bb3', 'D4', 'F4'],
        'Bb':  ['Bb3', 'D4', 'F4'],
        'Am':  ['A3', 'C4', 'E4'],
        'Em':  ['E3', 'G3', 'B3'],
        'F':   ['F3', 'A3', 'C4'],
        'C':   ['C3', 'E3', 'G3'],
    };

    // ═══════════════════════════════════════════════════════════════
    //  TRACKS — each has patterns for different intensity levels
    // ═══════════════════════════════════════════════════════════════

    var TRACKS = {

        // ── TITLE: mysterious, sparse, floating ─────────────────
        title: {
            bpm: 100,
            patterns: [
                // Calm ambient
                {
                    bass: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
                    lead: ['Eb4', '-', '-', '-', 'G4', '-', '-', '-', 'Bb4', '-', '-', 'G4', '-', '-', 'Eb4', '-'],
                    pad:  ['Cm', '-', '-', '-', '-', '-', '-', '-', 'Ab', '-', '-', '-', '-', '-', '-', '-'],
                    kick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    snare:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    hat:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                }
            ],
        },

        // ── SHOP: chill, jazzy, relaxed ─────────────────────────
        shop: {
            bpm: 110,
            patterns: [
                {
                    bass: ['C2', '-', '-', 'Eb2', '-', '-', 'F2', '-', 'G2', '-', '-', 'F2', '-', '-', 'Eb2', '-'],
                    lead: ['-', '-', 'G4', '-', 'Bb4', '-', '-', 'C5', '-', '-', 'Bb4', '-', 'Ab4', '-', '-', 'G4'],
                    pad:  ['Cm', '-', '-', '-', '-', '-', '-', '-', 'Fm', '-', '-', '-', '-', '-', '-', '-'],
                    kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
                    snare:[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                    hat:  [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
                }
            ],
        },

        // ── EARLY WAVES (1-5): playful mischief, lighter feel ───
        early: {
            bpm: 130,
            patterns: [
                // Normal
                {
                    bass: ['C2', '-', '-', '-', 'Eb2', '-', '-', '-', 'F2', '-', '-', '-', 'G2', '-', '-', '-'],
                    lead: ['-', 'G4', '-', 'Eb4', '-', '-', 'Bb4', '-', '-', 'C5', '-', '-', 'Bb4', '-', 'G4', '-'],
                    pad:  ['Cm', '-', '-', '-', '-', '-', '-', '-', 'Fm', '-', '-', '-', '-', '-', '-', '-'],
                    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                    snare:[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                    hat:  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
                },
                // Intense
                {
                    bass: ['C2', '-', 'C2', '-', 'Eb2', '-', 'Eb2', '-', 'F2', '-', 'F2', '-', 'G2', '-', 'Eb2', '-'],
                    lead: ['G4', 'Bb4', 'C5', '-', 'G4', 'Bb4', 'C5', 'Eb5', 'C5', 'Bb4', 'G4', '-', 'Eb5', 'C5', 'Bb4', 'G4'],
                    pad:  ['Cm', '-', '-', '-', 'Cm', '-', '-', '-', 'Fm', '-', '-', '-', 'Gm', '-', '-', '-'],
                    kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                    snare:[0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1],
                    hat:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                },
                // Calm
                {
                    bass: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
                    lead: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
                    pad:  ['Cm', '-', '-', '-', '-', '-', '-', '-', 'Fm', '-', '-', '-', '-', '-', '-', '-'],
                    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
                    snare:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    hat:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                }
            ],
            altPatterns: [
                // Normal B
                {
                    bass: ['C2', '-', 'Eb2', '-', '-', 'F2', '-', '-', 'Eb2', '-', 'G2', '-', '-', 'F2', '-', '-'],
                    lead: ['C5', '-', 'Bb4', '-', 'G4', '-', '-', 'Eb4', '-', 'G4', '-', 'Bb4', '-', '-', 'C5', '-'],
                    pad:  ['Cm', '-', '-', '-', '-', '-', '-', '-', 'Gm', '-', '-', '-', '-', '-', '-', '-'],
                    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
                    snare:[0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
                    hat:  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
                },
                null,  // Intense: use main pattern
                null   // Calm: use main pattern
            ],
        },

        // ── MAIN (waves 6-14): the original C minor march ───────
        main: {
            bpm: 140,
            patterns: [
                // Normal
                {
                    bass: ['C2', '-', '-', 'C2', 'Eb2', '-', 'F2', '-', 'G2', '-', '-', 'G2', 'F2', '-', 'Eb2', '-'],
                    lead: ['-', 'G4', '-', '-', '-', 'Bb4', '-', 'C5', '-', 'Eb5', '-', '-', '-', 'C5', '-', 'Bb4'],
                    pad:  ['Cm', '-', '-', '-', '-', '-', '-', '-', 'Fm', '-', '-', '-', '-', '-', '-', '-'],
                    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                    snare:[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                    hat:  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
                },
                // Intense
                {
                    bass: ['C2', 'C3', '-', 'C2', 'Eb2', 'Eb3', 'F2', 'F3', 'G2', 'G3', '-', 'G2', 'F2', 'F3', 'Eb2', 'Eb3'],
                    lead: ['G4', 'Bb4', 'C5', 'Eb5', 'G4', 'Bb4', 'C5', 'Eb5', 'G5', 'Eb5', 'C5', 'Bb4', 'G4', 'Eb5', 'C5', 'G4'],
                    pad:  ['Cm', '-', '-', '-', 'Cm', '-', '-', '-', 'Abm', '-', '-', '-', 'Gm', '-', '-', '-'],
                    kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                    snare:[0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1],
                    hat:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                },
                // Calm
                {
                    bass: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
                    lead: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
                    pad:  ['Cm', '-', '-', '-', '-', '-', '-', '-', 'Fm', '-', '-', '-', '-', '-', '-', '-'],
                    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
                    snare:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    hat:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                }
            ],
            altPatterns: [
                // Normal B
                {
                    bass: ['G2', '-', '-', 'F2', '-', 'Eb2', '-', '-', 'C2', '-', 'Eb2', '-', 'F2', '-', '-', 'G2'],
                    lead: ['Eb5', '-', 'C5', '-', '-', 'G4', '-', 'Bb4', '-', 'C5', '-', '-', 'Eb5', '-', 'C5', '-'],
                    pad:  ['Gm', '-', '-', '-', '-', '-', '-', '-', 'Cm', '-', '-', '-', 'Fm', '-', '-', '-'],
                    kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
                    snare:[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
                    hat:  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
                },
                null,  // Intense: use main pattern
                null   // Calm: use main pattern
            ],
        },

        // ── LATE WAVES (15-24): darker, heavier, D minor ────────
        late: {
            bpm: 150,
            patterns: [
                // Normal: driving bass, minor key tension
                {
                    bass: ['D2', '-', 'D2', '-', 'F2', '-', '-', 'A2', '-', 'G2', '-', '-', 'F2', '-', 'D2', '-'],
                    lead: ['-', 'D4', 'F4', '-', '-', 'A4', '-', '-', 'C5', '-', 'A4', '-', '-', 'G4', '-', 'F4'],
                    pad:  ['Dm', '-', '-', '-', '-', '-', '-', '-', 'Am', '-', '-', '-', 'Gm', '-', '-', '-'],
                    kick: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0],
                    snare:[0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0],
                    hat:  [1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1],
                },
                // Intense: relentless
                {
                    bass: ['D2', 'D3', 'D2', 'D3', 'F2', 'F3', 'F2', 'A2', 'G2', 'G3', 'G2', 'A2', 'F2', 'F3', 'D2', 'D3'],
                    lead: ['D5', 'F5', 'A5', 'F5', 'D5', 'C5', 'A4', 'C5', 'D5', 'F5', 'A5', 'G5', 'F5', 'D5', 'C5', 'D5'],
                    pad:  ['Dm', '-', '-', '-', 'F', '-', '-', '-', 'Gm', '-', '-', '-', 'Am', '-', '-', '-'],
                    kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                    snare:[0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0],
                    hat:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                },
                // Calm
                {
                    bass: ['D2', '-', '-', '-', '-', '-', '-', '-', 'A2', '-', '-', '-', '-', '-', '-', '-'],
                    lead: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
                    pad:  ['Dm', '-', '-', '-', '-', '-', '-', '-', 'Am', '-', '-', '-', '-', '-', '-', '-'],
                    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
                    snare:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    hat:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                }
            ],
            altPatterns: [
                // Normal B
                {
                    bass: ['A2', '-', '-', 'G2', '-', 'F2', '-', 'D2', '-', '-', 'F2', '-', 'G2', '-', 'A2', '-'],
                    lead: ['A4', '-', 'G4', '-', 'F4', '-', '-', 'D4', '-', 'F4', '-', 'G4', '-', '-', 'A4', '-'],
                    pad:  ['Am', '-', '-', '-', '-', '-', '-', '-', 'Dm', '-', '-', '-', '-', '-', '-', '-'],
                    kick: [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0],
                    snare:[0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1],
                    hat:  [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0],
                },
                null,  // Intense: use main pattern
                null   // Calm: use main pattern
            ],
        },

        // ── ENDGAME (25+): frantic, chaotic, E minor ────────────
        endgame: {
            bpm: 160,
            patterns: [
                // Normal: urgency
                {
                    bass: ['E2', '-', 'E2', 'G2', '-', 'B2', '-', 'E2', 'D2', '-', 'D2', '-', 'C2', '-', 'B1', '-'],
                    lead: ['E4', '-', 'G4', '-', 'B4', '-', 'E5', '-', 'D5', '-', 'B4', '-', 'G4', '-', 'E4', '-'],
                    pad:  ['Em', '-', '-', '-', '-', '-', '-', '-', 'C', '-', '-', '-', '-', '-', '-', '-'],
                    kick: [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1],
                    snare:[0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0],
                    hat:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                },
                // Intense: absolute chaos
                {
                    bass: ['E2', 'E3', 'E2', 'G2', 'B2', 'E3', 'B2', 'E2', 'D2', 'D3', 'D2', 'E2', 'C2', 'C3', 'B1', 'B2'],
                    lead: ['E5', 'G5', 'B5', 'E5', 'D5', 'B4', 'G4', 'B4', 'E5', 'G5', 'B5', 'G5', 'E5', 'D5', 'B4', 'E5'],
                    pad:  ['Em', '-', '-', '-', 'Em', '-', '-', '-', 'C', '-', '-', '-', 'Am', '-', '-', '-'],
                    kick: [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
                    snare:[0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
                    hat:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                },
                // Calm
                {
                    bass: ['E2', '-', '-', '-', '-', '-', '-', '-', 'B1', '-', '-', '-', '-', '-', '-', '-'],
                    lead: ['-', '-', '-', '-', 'E4', '-', '-', '-', '-', '-', '-', '-', 'B3', '-', '-', '-'],
                    pad:  ['Em', '-', '-', '-', '-', '-', '-', '-', 'Am', '-', '-', '-', '-', '-', '-', '-'],
                    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
                    snare:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    hat:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                }
            ],
            altPatterns: [
                // Normal B
                {
                    bass: ['B1', '-', 'E2', '-', 'G2', '-', 'E2', '-', 'C2', '-', 'D2', '-', 'E2', '-', 'B1', '-'],
                    lead: ['B4', '-', 'E5', '-', '-', 'G5', '-', 'E5', '-', 'D5', '-', '-', 'B4', '-', 'G4', '-'],
                    pad:  ['Am', '-', '-', '-', '-', '-', '-', '-', 'Em', '-', '-', '-', '-', '-', '-', '-'],
                    kick: [1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1],
                    snare:[0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
                    hat:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                },
                null,  // Intense: use main pattern
                null   // Calm: use main pattern
            ],
        },

        // ── BOSS: dramatic, powerful, Bb minor ──────────────────
        boss: {
            bpm: 155,
            patterns: [
                // Normal
                {
                    bass: ['Bb1', '-', 'Bb1', '-', 'F2', '-', 'Bb1', '-', 'Ab2', '-', '-', 'Eb2', '-', 'Bb1', '-', '-'],
                    lead: ['-', 'F4', '-', 'Bb4', '-', '-', 'Eb5', '-', '-', 'Bb4', 'Ab4', '-', 'F4', '-', 'Eb4', '-'],
                    pad:  ['Bbm', '-', '-', '-', '-', '-', '-', '-', 'Abm', '-', '-', '-', '-', '-', '-', '-'],
                    kick: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0],
                    snare:[0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1],
                    hat:  [1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0],
                },
                // Intense
                {
                    bass: ['Bb1', 'Bb2', 'Bb1', 'F2', 'F2', 'Bb2', 'Ab2', 'Eb2', 'Bb1', 'Bb2', 'Bb1', 'Ab2', 'F2', 'Bb2', 'Eb2', 'F2'],
                    lead: ['Bb4', 'F5', 'Eb5', 'Bb4', 'Ab4', 'F4', 'Bb4', 'Eb5', 'F5', 'Bb5', 'Ab5', 'F5', 'Eb5', 'Bb4', 'F5', 'Bb5'],
                    pad:  ['Bbm', '-', '-', '-', 'Abm', '-', '-', '-', 'Bbm', '-', '-', '-', 'Fm', '-', '-', '-'],
                    kick: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
                    snare:[0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0],
                    hat:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                },
            ],
            altPatterns: [
                // Normal B
                {
                    bass: ['Bb1', '-', 'F2', '-', 'Ab2', '-', 'Bb1', '-', '-', 'Eb2', '-', 'F2', '-', 'Ab2', '-', '-'],
                    lead: ['Bb4', '-', '-', 'Ab4', '-', 'F4', '-', 'Eb4', '-', '-', 'F4', '-', 'Ab4', '-', 'Bb4', '-'],
                    pad:  ['Fm', '-', '-', '-', '-', '-', '-', '-', 'Bbm', '-', '-', '-', '-', '-', '-', '-'],
                    kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
                    snare:[0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
                    hat:  [1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0],
                },
                null,  // Intense: use main pattern
            ],
        },
    };

    // Currently active patterns array (from selected track)
    var patterns = TRACKS.main.patterns;
    var altPatterns = TRACKS.main.altPatterns || null;
    var _barCount = 0;
    var _useAlt = false;

    // ── Instrument scheduling ──────────────────────────────────────

    function scheduleNote(channel, note, time, duration) {
        if (!note || note === '-') return;
        var freq = noteToFreq(note);
        if (freq === 0) return;

        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        var outputGain;

        switch (channel) {
            case 'bass':
                osc.type = 'square';
                gain.gain.setValueAtTime(0.001, time);
                gain.gain.linearRampToValueAtTime(0.25, time + 0.01);
                gain.gain.setValueAtTime(0.25, time + duration * 0.7);
                gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
                outputGain = bassGain;
                break;
            case 'lead':
                osc.type = 'sawtooth';
                gain.gain.setValueAtTime(0.001, time);
                gain.gain.linearRampToValueAtTime(0.18, time + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
                outputGain = leadGain;
                break;
            case 'pad':
                osc.type = 'triangle';
                gain.gain.setValueAtTime(0.001, time);
                gain.gain.linearRampToValueAtTime(0.12, time + 0.05);
                gain.gain.setValueAtTime(0.12, time + duration - 0.05);
                gain.gain.linearRampToValueAtTime(0.001, time + duration);
                outputGain = padGain;
                break;
            default:
                outputGain = masterGain;
        }

        osc.frequency.setValueAtTime(freq, time);
        osc.connect(gain);

        if (distortionActive && (channel === 'bass' || channel === 'lead')) {
            gain.connect(distortion);
            distortion.connect(outputGain);
        } else {
            gain.connect(outputGain);
        }

        osc.start(time);
        osc.stop(time + duration);
        osc.onended = function () { osc.disconnect(); gain.disconnect(); };
    }

    function schedulePadChord(chordName, time, duration) {
        var notes = CHORDS[chordName];
        if (!notes) return;
        for (var i = 0; i < notes.length; i++) {
            scheduleNote('pad', notes[i], time, duration);
        }
    }

    function scheduleKick(time) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);
        var vol = intensity >= 2 ? 0.45 : 0.35;
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.connect(gain);
        gain.connect(drumGain);
        osc.start(time);
        osc.stop(time + 0.1);
        osc.onended = function () { osc.disconnect(); gain.disconnect(); };
    }

    function scheduleSnare(time) {
        var noiseBuf = SFX.createNoise(0.1);
        var noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        var hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(1000, time);
        var noiseGain = ctx.createGain();
        var vol = intensity >= 2 ? 0.3 : 0.22;
        noiseGain.gain.setValueAtTime(vol, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        noiseSrc.connect(hp);
        hp.connect(noiseGain);
        noiseGain.connect(drumGain);
        noiseSrc.start(time);
        noiseSrc.stop(time + 0.1);
        noiseSrc.onended = function () { noiseSrc.disconnect(); hp.disconnect(); noiseGain.disconnect(); };

        var osc = ctx.createOscillator();
        var oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, time);
        oscGain.gain.setValueAtTime(0.2, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        osc.connect(oscGain);
        oscGain.connect(drumGain);
        osc.start(time);
        osc.stop(time + 0.05);
        osc.onended = function () { osc.disconnect(); oscGain.disconnect(); };
    }

    function scheduleHiHat(time) {
        var noiseBuf = SFX.createNoise(0.05);
        var src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        var hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(7000, time);
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        src.connect(hp);
        hp.connect(gain);
        gain.connect(drumGain);
        src.start(time);
        src.stop(time + 0.05);
        src.onended = function () { src.disconnect(); hp.disconnect(); gain.disconnect(); };
    }

    // ── Scheduler ──────────────────────────────────────────────────

    function scheduleStep(step, time) {
        var patSource = (_useAlt && altPatterns && altPatterns[currentPattern]) ? altPatterns : patterns;
        var pat = patSource[currentPattern] || patSource[0] || patterns[currentPattern] || patterns[0];
        if (!pat) return;
        var dur = stepDuration * 0.9;

        if (pat.bass[step] && pat.bass[step] !== '-') {
            scheduleNote('bass', pat.bass[step], time, dur);
        }
        if (pat.lead[step] && pat.lead[step] !== '-') {
            scheduleNote('lead', pat.lead[step], time, dur);
        }
        if (pat.pad[step] && pat.pad[step] !== '-') {
            var padSteps = 1;
            for (var s = step + 1; s < 16; s++) {
                if (pat.pad[s] && pat.pad[s] !== '-') break;
                padSteps++;
            }
            schedulePadChord(pat.pad[step], time, stepDuration * padSteps);
        }
        if (pat.kick[step])  scheduleKick(time);
        if (pat.snare[step]) scheduleSnare(time);
        if (pat.hat[step])   scheduleHiHat(time);
    }

    function scheduler() {
        if (!playing || !ctx) return;
        while (nextStepTime < ctx.currentTime + scheduleAhead) {
            scheduleStep(currentStep, nextStepTime);
            nextStepTime += stepDuration;
            currentStep = (currentStep + 1) % 16;
            // Cycle between A/B pattern variants every 4 bars
            if (currentStep === 0) {
                _barCount++;
                if (_barCount % 4 === 0) _useAlt = !_useAlt;
            }
        }
    }

    // ── Distortion waveshaper ──────────────────────────────────────

    function createDistortion() {
        var shaper = ctx.createWaveShaper();
        var samples = 256;
        var curve = new Float32Array(samples);
        for (var i = 0; i < samples; i++) {
            var x = (i / (samples / 2)) - 1;
            curve[i] = (Math.PI + 40) * x / (Math.PI + 40 * Math.abs(x));
        }
        shaper.curve = curve;
        shaper.oversample = '4x';
        return shaper;
    }

    // ── Track selection ────────────────────────────────────────────

    function selectTrack(trackName) {
        if (trackName === currentTrack) return;
        var track = TRACKS[trackName];
        if (!track) return;

        currentTrack = trackName;
        patterns = track.patterns;
        altPatterns = track.altPatterns || null;
        bpm = track.bpm;
        stepDuration = 60 / bpm / stepsPerBeat;

        // Clamp pattern index to new track's range
        if (currentPattern >= patterns.length) {
            currentPattern = 0;
        }
    }

    // ── Public API ─────────────────────────────────────────────────

    return {
        init: function () {
            ctx = SFX.ctx;
            if (!ctx) return;

            masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0.3, ctx.currentTime);
            masterGain.connect(ctx.destination);

            bassGain = ctx.createGain();
            bassGain.gain.setValueAtTime(1.0, ctx.currentTime);
            bassGain.connect(masterGain);

            leadGain = ctx.createGain();
            leadGain.gain.setValueAtTime(0.7, ctx.currentTime);
            leadGain.connect(masterGain);

            padGain = ctx.createGain();
            padGain.gain.setValueAtTime(0.5, ctx.currentTime);
            padGain.connect(masterGain);

            drumGain = ctx.createGain();
            drumGain.gain.setValueAtTime(0.8, ctx.currentTime);
            drumGain.connect(masterGain);

            distortion = createDistortion();
        },

        start: function () {
            if (!ctx || playing) return;
            playing = true;
            currentStep = 0;
            nextStepTime = ctx.currentTime + 0.05;
            stepDuration = 60 / bpm / stepsPerBeat;
            schedulerTimer = setInterval(scheduler, 25);
        },

        stop: function () {
            playing = false;
            if (schedulerTimer) {
                clearInterval(schedulerTimer);
                schedulerTimer = null;
            }
            currentStep = 0;
        },

        /**
         * Update music based on game state.
         * Selects track by wave number, pattern by intensity.
         */
        update: function (gameState) {
            if (!gameState) return;

            // Select track by wave
            var wave = gameState.wave || 0;
            if (gameState.isTitle) {
                selectTrack('title');
            } else if (gameState.isShop) {
                selectTrack('shop');
            } else if (gameState.isBoss) {
                selectTrack('boss');
            } else if (wave >= 25) {
                selectTrack('endgame');
            } else if (wave >= 15) {
                selectTrack('late');
            } else if (wave >= 6) {
                selectTrack('main');
            } else {
                selectTrack('early');
            }

            // Select intensity
            if (gameState.isIntermission) {
                this.setIntensity(0);
            } else if (gameState.combo > 30) {
                this.setIntensity(3);
            } else if (gameState.combo > 10) {
                this.setIntensity(2);
            } else {
                this.setIntensity(1);
            }
        },

        setIntensity: function (level) {
            if (level === intensity) return;
            intensity = level;

            switch (level) {
                case 0: // calm
                    currentPattern = patterns.length >= 3 ? 2 : 0;
                    distortionActive = false;
                    if (drumGain)   drumGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.5);
                    if (leadGain)   leadGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.5);
                    if (masterGain) masterGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.5);
                    break;
                case 1: // normal
                    currentPattern = 0;
                    distortionActive = false;
                    if (drumGain)   drumGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.3);
                    if (leadGain)   leadGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.3);
                    if (masterGain) masterGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.3);
                    break;
                case 2: // intense
                    currentPattern = Math.min(1, patterns.length - 1);
                    distortionActive = false;
                    if (drumGain)   drumGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.3);
                    if (leadGain)   leadGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.3);
                    if (masterGain) masterGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.3);
                    break;
                case 3: // metal
                    currentPattern = Math.min(1, patterns.length - 1);
                    distortionActive = true;
                    if (drumGain)   drumGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.2);
                    if (leadGain)   leadGain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.2);
                    if (masterGain) masterGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.2);
                    break;
            }

            stepDuration = 60 / bpm / stepsPerBeat;
        },

        /** Set track directly (for title/shop screens). */
        setTrack: function (trackName) {
            selectTrack(trackName);
        },

        setVolume: function(v) { if (masterGain && ctx) masterGain.gain.setValueAtTime(v, ctx.currentTime); },

        scheduleNote: scheduleNote,
        noteToFreq: noteToFreq,

        get playing() { return playing; },
        get intensity() { return intensity; },
        get currentStep() { return currentStep; },
    };
})();
