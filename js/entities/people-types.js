// ── Germ / Pathogen Type Definitions ───────────────────────────────────
// Adapted for Diss N Fex. Draws microscopic organisms instead of humans.
// Each type is a template used to stamp out pathogens.
// draw(ctx, ped) renders at local origin (0,0) facing right.

var PEOPLE_TYPES = {

    // ── 1. Bacillus (Business Man) ──────────────────────────────────────────
    businessMan: {
        name: 'Bacillus',
        points: 100,
        speed: 1.0,
        hp: 1,
        rainResist: 0,
        unlockWave: 1,
        spawnWeight: 10,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#44aa44';
            ctx.strokeStyle = '#226622';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.rect(-4, -18, 8, 18);
            ctx.fill();
            ctx.stroke();
            // Cilia wiggling
            ctx.strokeStyle = '#226622';
            ctx.lineWidth = 1;
            var t = performance.now() * 0.01;
            for (var i = 0; i < 4; i++) {
                var y = -15 + i * 4;
                var angle = Math.sin(t + i) * 3;
                ctx.beginPath();
                ctx.moveTo(-4, y);
                ctx.lineTo(-8, y + angle);
                ctx.moveTo(4, y);
                ctx.lineTo(8, y - angle);
                ctx.stroke();
            }
        },
    },

    // ── 2. Coccus (Business Woman) ────────────────────────────────────────
    businessWoman: {
        name: 'Coccus',
        points: 100,
        speed: 1.0,
        hp: 1,
        rainResist: 0,
        unlockWave: 1,
        spawnWeight: 10,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#cc4444';
            ctx.strokeStyle = '#772222';
            ctx.lineWidth = 1.5;
            var positions = [
                {x: -2, y: -4, r: 4},
                {x: 2, y: -5, r: 3.5},
                {x: 0, y: -11, r: 4.5}
            ];
            for (var i = 0; i < positions.length; i++) {
                var p = positions[i];
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        },
    },

    // ── 3. Amoeba (Tourist) ───────────────────────────────────────────────
    tourist: {
        name: 'Amoeba',
        points: 150,
        speed: 0.6,
        hp: 1,
        rainResist: 0,
        unlockWave: 1,
        spawnWeight: 8,
        stopsForPhotos: true,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#dd5588';
            ctx.strokeStyle = '#882255';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, -9, 7, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Nucleus
            ctx.fillStyle = '#661133';
            ctx.beginPath();
            ctx.arc(-1, -10, 2, 0, Math.PI * 2);
            ctx.fill();
            // Pseudopod wiggles
            var t = performance.now() * 0.008;
            ctx.strokeStyle = '#882255';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-6, -7);
            ctx.quadraticCurveTo(-10, -7 + Math.sin(t) * 2, -6, -5);
            ctx.moveTo(6, -7);
            ctx.quadraticCurveTo(10, -7 + Math.cos(t) * 2, 6, -5);
            ctx.stroke();
        },
    },

    // ── 4. Flagellate (Jogger) ────────────────────────────────────────────────
    jogger: {
        name: 'Flagellate',
        points: 75,
        speed: 1.8,
        hp: 1,
        rainResist: 0,
        unlockWave: 1,
        spawnWeight: 7,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#33ccaa';
            ctx.strokeStyle = '#117766';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(1, -9, 4.5, 7, Math.PI * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Flagellum tail
            var t = performance.now() * 0.02;
            ctx.strokeStyle = '#117766';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-3, -7);
            ctx.quadraticCurveTo(-10, -7 + Math.sin(t) * 4, -17, -7 + Math.sin(t * 1.3) * 6);
            ctx.stroke();
        },
    },

    // ── 5. Endospore (Raincoat Person) ───────────────────────────────────────
    raincoatPerson: {
        name: 'Endospore',
        points: 25,
        speed: 1.0,
        hp: 1,
        rainResist: 0.8,
        unlockWave: 2,
        spawnWeight: 6,
        draw: function (ctx, ped) {
            // Outer yellow coat
            ctx.fillStyle = '#e8d330';
            ctx.strokeStyle = '#aa9010';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.ellipse(0, -9, 6.5, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Inner core
            ctx.fillStyle = '#fffbb0';
            ctx.beginPath();
            ctx.ellipse(0, -9, 3.5, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        },
    },

    // ── 6. Biofilm-Shielded (Umbrella Person) ───────────────────────────────────────
    umbrellaPerson: {
        name: 'Biofilm Germ',
        points: 30,
        speed: 1.0,
        hp: 1,
        rainResist: 0,
        umbrellaRainBlock: 1.0,
        hasUmbrella: true,
        unlockWave: 2,
        spawnWeight: 6,
        draw: function (ctx, ped) {
            // Main cell body
            ctx.fillStyle = '#448844';
            ctx.strokeStyle = '#225522';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, -9, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Biofilm shield dome
            if (ped.hasUmbrella !== false) {
                ctx.strokeStyle = 'rgba(0, 170, 255, 0.85)';
                ctx.fillStyle = 'rgba(0, 170, 255, 0.15)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, -9, 11, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Inner glow ring
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, -9, 9, 0, Math.PI * 2);
                ctx.stroke();
            }
        },
    },

    // ── 7. Protozoan (Old Lady) ──────────────────────────────────────────────
    oldLady: {
        name: 'Protozoan',
        points: 200,
        speed: 0.4,
        hp: 1,
        rainResist: 0,
        unlockWave: 3,
        spawnWeight: 4,
        guiltPopup: true,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#b8860b';
            ctx.strokeStyle = '#5c4008';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.ellipse(0, -10, 8, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Cilia border
            ctx.strokeStyle = '#5c4008';
            ctx.lineWidth = 0.8;
            var t = performance.now() * 0.005;
            for (var a = 0; a < Math.PI * 2; a += 0.5) {
                var cos = Math.cos(a);
                var sin = Math.sin(a);
                var len = 2.5 + Math.sin(t + a * 8) * 1.0;
                ctx.beginPath();
                ctx.moveTo(cos * 8, -10 + sin * 10);
                ctx.lineTo(cos * (8 + len), -10 + sin * (10 + len));
                ctx.stroke();
            }
            // Nucleus
            ctx.fillStyle = '#3a2503';
            ctx.beginPath();
            ctx.arc(0, -10, 2.5, 0, Math.PI * 2);
            ctx.fill();
        },
    },

    // ── 8. Budding Yeast (Dog Walker) ────────────────────────────────────────────
    dogWalker: {
        name: 'Budding Yeast',
        points: 120,
        speed: 0.8,
        hp: 1,
        rainResist: 0,
        unlockWave: 3,
        spawnWeight: 5,
        hasDog: true,
        dogAlerts: true,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#8a2be2';
            ctx.strokeStyle = '#4b0082';
            ctx.lineWidth = 1.5;
            // Parent cell
            ctx.beginPath();
            ctx.arc(-2, -9, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Bud cell (dog)
            if (ped.hasDog !== false) {
                ctx.beginPath();
                ctx.arc(6, -11, 4.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Connection bridge (leash)
                ctx.strokeStyle = '#8a2be2';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(-2, -9);
                ctx.lineTo(6, -11);
                ctx.stroke();
            }
        },
    },

    // ── 9. Juggling Virus (Street Performer) ──────────────────────────────────────
    streetPerformer: {
        name: 'Juggling Virus',
        points: 175,
        speed: 0,
        hp: 1,
        rainResist: 0,
        unlockWave: 4,
        spawnWeight: 3,
        stationary: true,
        draw: function (ctx, ped) {
            // Hexagonal capsid head
            ctx.fillStyle = '#4682b4';
            ctx.strokeStyle = '#1e3f66';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -22);
            ctx.lineTo(-4, -18);
            ctx.lineTo(-3, -13);
            ctx.lineTo(3, -13);
            ctx.lineTo(4, -18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Sheath/tail
            ctx.strokeStyle = '#1e3f66';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(0, -13);
            ctx.lineTo(0, -6);
            ctx.stroke();
            // Tail fibers (legs)
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, -6); ctx.lineTo(-5, 0);
            ctx.moveTo(0, -6); ctx.lineTo(5, 0);
            ctx.moveTo(0, -6); ctx.lineTo(-2, -2); ctx.lineTo(-3, 0);
            ctx.moveTo(0, -6); ctx.lineTo(2, -2); ctx.lineTo(3, 0);
            ctx.stroke();
            // Juggling capsids
            var phase = ped.walkFrame * Math.PI;
            var colors = ['#ff4444', '#44ff44', '#4444ff'];
            for (var i = 0; i < 3; i++) {
                var a = phase + i * (Math.PI * 2 / 3);
                var bx = Math.cos(a) * 5;
                var by = -26 + Math.sin(a) * 3;
                ctx.fillStyle = colors[i];
                ctx.beginPath();
                ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
        },
    },

    // ── 10. Slime Mold (Ice Cream Vendor) ─────────────────────────────────────
    iceCreamVendor: {
        name: 'Slime Mold',
        points: 80,
        speed: 0.3,
        hp: 1,
        rainResist: 0,
        unlockWave: 4,
        spawnWeight: 4,
        wideHitbox: true,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#ffd700';
            ctx.strokeStyle = '#b8860b';
            ctx.lineWidth = 1;
            // Creeping mold blobs
            ctx.beginPath();
            ctx.arc(-8, -4, 2.5, 0, Math.PI * 2);
            ctx.arc(-1, -6, 2.0, 0, Math.PI * 2);
            ctx.arc(6, -5, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Connecting tubules
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-8, -4);
            ctx.lineTo(-1, -6);
            ctx.lineTo(6, -5);
            ctx.stroke();
        },
    },

    // ── 11. Micro-Germ (Child) ────────────────────────────────────────────────
    child: {
        name: 'Micro-Germ',
        points: 10,
        speed: 1.2,
        hp: 1,
        rainResist: 0,
        unlockWave: 1,
        spawnWeight: 6,
        enjoysRain: true,
        heightScale: 0.6,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#ff7f50';
            ctx.strokeStyle = '#d04f20';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, -5, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Flagella tail
            var t = performance.now() * 0.015;
            ctx.beginPath();
            ctx.moveTo(-3, -4);
            ctx.quadraticCurveTo(-6, -4 + Math.sin(t) * 2, -9, -3);
            ctx.stroke();
        },
    },

    // ── 12. Superbug King (VIP / Mayor) ──────────────────────────────────────────
    vip: {
        name: 'Superbug King',
        points: 500,
        speed: 0.7,
        hp: 1,
        rainResist: 0,
        unlockWave: 5,
        spawnWeight: 1,
        spawnsBodyguards: true,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#ffd700';
            ctx.strokeStyle = '#cc9900';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, -14, 8, 13, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Spikes (crown structure)
            ctx.fillStyle = '#ff3300';
            for (var a = -Math.PI * 0.25; a <= Math.PI * 0.25; a += 0.2) {
                var cos = Math.sin(a);
                var sin = -Math.cos(a);
                ctx.beginPath();
                ctx.moveTo(cos * 7, -14 + sin * 12);
                ctx.lineTo(cos * 12, -14 + sin * 17);
                ctx.lineTo(cos * 8 + 1.5, -14 + sin * 12);
                ctx.fill();
            }
            // Nucleus glow
            ctx.fillStyle = '#ff4400';
            ctx.beginPath();
            ctx.arc(0, -12, 3, 0, Math.PI * 2);
            ctx.fill();
        },
    },

    // ── 13. Shield Protein (Bodyguard) ────────────────────────────────────────────
    bodyguard: {
        name: 'Shield Protein',
        points: 50,
        speed: 1.0,
        hp: 5,
        rainResist: 0,
        unlockWave: 5,
        spawnWeight: 0,
        protectsVIP: true,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#708090';
            ctx.strokeStyle = '#34495e';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.rect(-5, -18, 10, 18);
            ctx.fill();
            ctx.stroke();
            // Protective block lines
            ctx.fillStyle = '#34495e';
            ctx.fillRect(-3, -14, 6, 2.5);
            ctx.fillRect(-3, -9, 6, 2.5);
        },
    },

    // ── 14. Spore Colony (Weather Reporter) ─────────────────────────────────────
    weatherReporter: {
        name: 'Spore Colony',
        points: 300,
        speed: 0,
        hp: 1,
        rainResist: 0,
        unlockWave: 8,
        spawnWeight: 2,
        stationary: true,
        spawnsUmbrellaAfter: 30,
        draw: function (ctx, ped) {
            // Stalk base
            ctx.fillStyle = '#8b5a2b';
            ctx.strokeStyle = '#4a2f15';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(-8, 0);
            ctx.quadraticCurveTo(-4, -10, 0, -10);
            ctx.quadraticCurveTo(4, -10, 8, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Stalk
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(0, -22);
            ctx.stroke();
            // Glowing spore dome
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.arc(0, -22, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        },
    },

    // ── 15. Cyst (Construction Worker) ───────────────────────────────────
    constructionWorker: {
        name: 'Pathogen Cyst',
        points: 60,
        speed: 0.8,
        hp: 3,
        rainResist: 0.3,
        unlockWave: 3,
        spawnWeight: 6,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#8b7355';
            ctx.strokeStyle = '#5c4c38';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, -9, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Inner nuclei details
            ctx.fillStyle = '#4a2e12';
            ctx.beginPath();
            ctx.arc(-2, -11, 1.8, 0, Math.PI * 2);
            ctx.arc(2, -6, 1.6, 0, Math.PI * 2);
            ctx.fill();
        },
    },

    // ── 16. Biofilm Gladiator (Riot Police) ──────────────────────────────
    riotPolice: {
        name: 'Biofilm Gladiator',
        points: 80,
        speed: 0.9,
        hp: 4,
        rainResist: 0.2,
        unlockWave: 6,
        spawnWeight: 4,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#2e8b57';
            ctx.strokeStyle = '#1e5a37';
            ctx.beginPath();
            ctx.rect(-4, -17, 8, 17);
            ctx.fill();
            ctx.stroke();
            // Shield element
            ctx.fillStyle = '#1e5a37';
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.rect(3, -14, 4, 11);
            ctx.fill();
            ctx.stroke();
        },
    },

    // ── 17. Mutator Cell (Scientist) ─────────────────────────────────────
    scientist: {
        name: 'Mutator Cell',
        points: 150,
        speed: 1.0,
        hp: 1,
        rainResist: 0,
        unlockWave: 5,
        spawnWeight: 5,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#ba55d3';
            ctx.strokeStyle = '#6a1b9a';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.ellipse(0, -10, 6, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Helix strands inside
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(-2, -12); ctx.lineTo(2, -8);
            ctx.moveTo(2, -12); ctx.lineTo(-2, -8);
            ctx.stroke();
        },
    },

    // ── 18. Slime Defender (Police) ──────────────────────────────────────
    police: {
        name: 'Slime Defender',
        points: 40,
        speed: 1.1,
        hp: 2,
        rainResist: 0,
        unlockWave: 3,
        spawnWeight: 7,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#4682b4';
            ctx.strokeStyle = '#1e3f66';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, -10, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Tiny cilia spikes
            var t = performance.now() * 0.01;
            for (var a = 0; a < Math.PI * 2; a += 1.2) {
                var x = Math.cos(a) * 6;
                var y = -10 + Math.sin(a) * 6;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + Math.cos(a + Math.sin(t) * 0.5) * 2.5, y + Math.sin(a + Math.sin(t) * 0.5) * 2.5);
                ctx.stroke();
            }
        },
    },

    // ── 19. Antibiotic Blaster (Military) ────────────────────────────────
    military: {
        name: 'Antibiotic Blaster',
        points: 60,
        speed: 0.9,
        hp: 3,
        rainResist: 0.1,
        unlockWave: 7,
        spawnWeight: 5,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#cd5c5c';
            ctx.strokeStyle = '#8b0000';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.ellipse(0, -10, 6.5, 10, Math.PI * 0.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Central core
            ctx.fillStyle = '#ff8888';
            ctx.beginPath();
            ctx.arc(0, -10, 2.5, 0, Math.PI * 2);
            ctx.fill();
        },
    },

    // ── 20. Helicobacter (Cyclist) ───────────────────────────────────────
    cyclist: {
        name: 'Helicobacter',
        points: 110,
        speed: 1.5,
        hp: 1,
        rainResist: 0,
        unlockWave: 3,
        spawnWeight: 5,
        draw: function (ctx, ped) {
            ctx.strokeStyle = '#9932cc';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            var t = performance.now() * 0.02;
            for (var y = 0; y >= -17; y -= 1.8) {
                var x = Math.sin(y * 0.4 + t) * 3;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        },
    },

    // ── 21. Biofilm Mothership (Boss Helicopter) ──────────────────────────
    bossHelicopter: {
        name: 'Biofilm Mothership',
        points: 2000,
        speed: 0.8,
        hp: 50,
        rainResist: 0.5,
        unlockWave: 0,
        spawnWeight: 0,
        draw: function (ctx, ped) {
            var t = performance.now() * 0.005;
            ctx.fillStyle = '#32cd32';
            ctx.strokeStyle = '#006400';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, -15, 24, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Core
            ctx.fillStyle = '#adff2f';
            ctx.beginPath();
            ctx.arc(-4, -15, 5, 0, Math.PI * 2);
            ctx.fill();
            // Rotating cilia rotor
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.save();
            ctx.translate(0, -15);
            ctx.rotate(t * 3);
            for (var i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0); ctx.lineTo(0, -25);
                ctx.stroke();
                ctx.fillStyle = '#adff2f';
                ctx.beginPath();
                ctx.arc(0, -25, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.rotate(Math.PI / 2);
            }
            ctx.restore();
        },
    },

    // ── 22. Contamination Sensor (Boss Balloon) ──────────────────────────
    bossBalloon: {
        name: 'Contamination Sensor',
        points: 1500,
        speed: 0.6,
        hp: 40,
        rainResist: 0.4,
        unlockWave: 0,
        spawnWeight: 0,
        draw: function (ctx, ped) {
            var t = performance.now() * 0.005;
            ctx.fillStyle = '#800080';
            ctx.strokeStyle = '#4b0082';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, -28, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Dangling flagella
            ctx.strokeStyle = '#4b0082';
            ctx.lineWidth = 1.2;
            for (var i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 6, -14);
                ctx.quadraticCurveTo(i * 10 + Math.sin(t + i) * 5, -5, i * 6 + Math.sin(t + i * 1.5) * 7, 5);
                ctx.stroke();
            }
        },
    },

    // ── 23. UV Buffer Lamp (Boss Sun) ──────────────────────────
    bossSun: {
        name: 'UV Buffer Lamp',
        points: 3000,
        speed: 0.9,
        hp: 60,
        rainResist: 0.3,
        unlockWave: 0,
        spawnWeight: 0,
        draw: function (ctx, ped) {
            var t = performance.now() * 0.01;
            // Structural trusses
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-12, -20); ctx.lineTo(-12, -100);
            ctx.moveTo(12, -20); ctx.lineTo(12, -100);
            ctx.stroke();
            // Glowing lamp core
            var glow = 18 + Math.sin(t) * 3;
            var grad = ctx.createRadialGradient(0, -20, 2, 0, -20, glow);
            grad.addColorStop(0, '#ffbb33');
            grad.addColorStop(0.5, '#ff4400');
            grad.addColorStop(1, 'rgba(255,68,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, -20, glow, 0, Math.PI * 2);
            ctx.fill();
            // Guard cage
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, -20, 14, 0, Math.PI * 2);
            ctx.stroke();
        },
    },

    // ── 24. Anti-Sanitizer Colony (Boss Anti-Cloud) ──────────────────────────
    bossAntiCloud: {
        name: 'Anti-Sanitizer Colony',
        points: 2500,
        speed: 0.7,
        hp: 50,
        rainResist: 0.6,
        unlockWave: 0,
        spawnWeight: 0,
        draw: function (ctx, ped) {
            ctx.fillStyle = '#5c4033';
            ctx.strokeStyle = '#3d2b1f';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.ellipse(0, -18, 20, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Glowing red centers
            ctx.fillStyle = '#ff3300';
            ctx.beginPath();
            ctx.arc(-7, -18, 3.5, 0, Math.PI * 2);
            ctx.arc(7, -18, 3.5, 0, Math.PI * 2);
            ctx.fill();
        },
    }
};
