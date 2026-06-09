// ── City ──────────────────────────────────────────────────────────
// Manages 3 parallax layers of procedurally generated buildings,
// the ground plane, and the sky gradient.  Supports day/night tinting.

const City = (function () {

    var PROCESS_LABELS = ['RAW INTAKE', 'RAPID MIX', 'FLOC BASIN', 'SEDIMENT', 'FILTERS', 'UV', 'CLEARWELL'];
    var TREATMENT_FACTS = [
        'Coagulation helps tiny particles clump into floc.',
        'Filters remove turbidity that can shield microbes.',
        'UV lamps damage pathogen DNA during disinfection.',
        'Clearwells provide chlorine contact time before distribution.',
        'A chlorine residual protects water in the pipe network.',
        'Operators track pH because disinfectants work differently by pH.',
        'Ozone oxidizes taste, odor, and many microbes.',
        'Jar tests help operators tune coagulant dose.',
        'Low turbidity makes disinfection more reliable.',
    ];

    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    // ── Constructor ──────────────────────────────────────────────
    function City() {
        this.layers     = [[], [], []];   // 0 far, 1 mid, 2 near
        this.timeOfDay  = 0;             // 0 = noon, 0.5 = midnight

        this._generateLayers();
    }

    // Height & width scale per layer: far = small, near = large
    var LAYER_HEIGHT_SCALE = [0.45, 0.7, 1.0];
    var LAYER_WIDTH_SCALE  = [0.6,  0.8, 1.0];

    // ── Layer generation ─────────────────────────────────────────
    City.prototype._generateLayers = function () {
        var cfg = CFG.CITY;
        for (var layer = 0; layer < 3; layer++) {
            var buildings = [];
            var cursor    = 0;
            var hScale    = LAYER_HEIGHT_SCALE[layer];
            var wScale    = LAYER_WIDTH_SCALE[layer];

            while (cursor < cfg.WORLD_WIDTH) {
                var w = Math.round(rand(cfg.BUILDING_MIN_W, cfg.BUILDING_MAX_W) * wScale);
                var h = Math.round(rand(cfg.BUILDING_MIN_H, cfg.BUILDING_MAX_H) * hScale);

                // Clamp so we don't overshoot world width
                if (cursor + w > cfg.WORLD_WIDTH) {
                    w = cfg.WORLD_WIDTH - cursor;
                    if (w < 20) break;      // too thin, skip
                }

                buildings.push(new Building(cursor, w, h, layer));
                cursor += w + cfg.GAP;
            }

            this.layers[layer] = buildings;
        }
    };

    // ── Helpers ──────────────────────────────────────────────────
    // Returns a darkness multiplier [0..1] based on timeOfDay.
    // Noon (0) = 1.0 (bright), Midnight (0.5) = 0.22 (dark).
    City.prototype._dayBrightness = function () {
        // Map timeOfDay (0-1) to brightness via cosine curve
        // 0 -> 1 (noon bright), 0.5 -> ~0.22 (midnight dark)
        var angle = this.timeOfDay * Math.PI * 2;  // full circle
        return 0.61 + 0.39 * Math.cos(angle);       // range [0.22 .. 1.0]
    };

    // Interpolate between two CSS hex colours by t [0..1].
    function lerpColor(hexA, hexB, t) {
        var ar = parseInt(hexA.slice(1, 3), 16);
        var ag = parseInt(hexA.slice(3, 5), 16);
        var ab = parseInt(hexA.slice(5, 7), 16);
        var br = parseInt(hexB.slice(1, 3), 16);
        var bg = parseInt(hexB.slice(3, 5), 16);
        var bb = parseInt(hexB.slice(5, 7), 16);
        var rr = Math.round(ar + (br - ar) * t);
        var rg = Math.round(ag + (bg - ag) * t);
        var rb = Math.round(ab + (bb - ab) * t);
        return 'rgb(' + rr + ',' + rg + ',' + rb + ')';
    }

    // ── Draw ─────────────────────────────────────────────────────
    City.prototype.draw = function (ctx, camera) {
        var cW = CFG.WIDTH;
        var cH = CFG.HEIGHT;
        var parallax = CFG.CITY.PARALLAX;
        var brightness = this._dayBrightness();

        // ── Sky gradient ─────────────────────────────────────────
        // Blend configured sky colours toward dark blue/black at night
        var nightTop    = '#02050c';
        var nightBottom = '#061222';
        var skyTop      = lerpColor(CFG.SKY_TOP,    nightTop,    1 - brightness);
        var skyBottom   = lerpColor(CFG.SKY_BOTTOM, nightBottom, 1 - brightness);

        var grad = ctx.createLinearGradient(0, 0, 0, CFG.GROUND_Y);
        grad.addColorStop(0, skyTop);
        grad.addColorStop(1, skyBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cW, CFG.GROUND_Y);
        this._drawTreatmentTanks(ctx, camera, brightness);
        this._drawTreatmentFacts(ctx, camera, brightness);

        // ── Background Pipelines (Industrial Treatment Basin) ────
        ctx.strokeStyle = 'rgba(25, 45, 60, 0.45)';
        ctx.lineWidth = 10;
        // Parallax shifted horizontal pipes
        var scrollX = camera.x * 0.15; // slow scroll
        var pipeY1 = CFG.GROUND_Y - 260;
        var pipeY2 = CFG.GROUND_Y - 140;
        var pipeY3 = CFG.GROUND_Y - 420;
        
        ctx.beginPath();
        // Pipe 1
        ctx.moveTo(0, pipeY1); ctx.lineTo(cW, pipeY1);
        // Pipe 2
        ctx.moveTo(0, pipeY2); ctx.lineTo(cW, pipeY2);
        // Pipe 3
        ctx.moveTo(0, pipeY3); ctx.lineTo(cW, pipeY3);
        ctx.stroke();

        // ── Building layers (back to front) ──────────────────────
        for (var layer = 0; layer < 3; layer++) {
            var pf = parallax[layer];
            var buildings = this.layers[layer];

            for (var i = 0; i < buildings.length; i++) {
                var b = buildings[i];

                // Parallax-shifted x position
                var screenX = b.x - camera.x * pf;

                // Quick cull: skip buildings entirely off-screen
                if (screenX + b.width < 0 || screenX > cW) continue;

                ctx.save();
                ctx.translate(screenX - b.x, 0);

                // Night tint overlay: draw building, then cover with dark layer
                b.draw(ctx);

                // Day/night tint applied on top of layer
                if (brightness < 0.95) {
                    ctx.fillStyle = 'rgba(5,5,20,' + (1 - brightness) * 0.45 + ')';
                    ctx.fillRect(b.x, b.y, b.width, b.height);
                }

                ctx.restore();
            }
        }

        // ── Pipe Base Liner ──────────────────────────────────────
        var groundShadeR = Math.round(15 * brightness);
        var groundShadeG = Math.round(25 * brightness);
        var groundShadeB = Math.round(35 * brightness);
        var groundColor = 'rgb(' + groundShadeR + ',' + groundShadeG + ',' + groundShadeB + ')';
        ctx.fillStyle = groundColor;
        ctx.fillRect(0, CFG.GROUND_Y, cW, cH - CFG.GROUND_Y);

        this._drawTreatmentChannel(ctx, camera, brightness);
    };

    City.prototype._drawTreatmentTanks = function (ctx, camera, brightness) {
        var scrollX = camera.x * 0.08;
        var baseY = CFG.GROUND_Y - 65;
        ctx.save();

        for (var i = -1; i < 8; i++) {
            var x = i * 240 - (scrollX % 240) + 90;
            var w = 135;
            var h = 44 + (i % 3) * 8;

            ctx.fillStyle = 'rgba(8, 24, 34, ' + (0.42 + brightness * 0.12) + ')';
            ctx.beginPath();
            ctx.ellipse(x + w / 2, baseY, w / 2, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(x, baseY - h, w, h);
            ctx.beginPath();
            ctx.ellipse(x + w / 2, baseY - h, w / 2, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(82, 180, 190, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(x + w / 2, baseY - h, w / 2, 14, 0, 0, Math.PI * 2);
            ctx.stroke();

            var fluidY = baseY - 16 - (i % 4) * 5;
            ctx.fillStyle = 'rgba(0, 210, 210, 0.16)';
            ctx.fillRect(x + 4, fluidY, w - 8, baseY - fluidY);

            ctx.font = 'bold 9px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(145, 235, 235, 0.65)';
            ctx.fillText(PROCESS_LABELS[(i + 1 + PROCESS_LABELS.length) % PROCESS_LABELS.length], x + w / 2, baseY - h - 19);
        }

        ctx.restore();
    };

    City.prototype._drawTreatmentFacts = function (ctx, camera, brightness) {
        var cW = CFG.WIDTH;
        var time = performance.now() * 0.018;
        var alpha = 0.22 + brightness * 0.18;

        ctx.save();
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(190, 245, 245, ' + alpha + ')';
        ctx.strokeStyle = 'rgba(5, 20, 28, ' + (0.22 + brightness * 0.12) + ')';
        ctx.lineWidth = 3;

        for (var row = 0; row < 3; row++) {
            var factIndex = Math.floor(time / 520 + row * 3) % TREATMENT_FACTS.length;
            var fact = TREATMENT_FACTS[factIndex];
            var y = 92 + row * 54;
            var span = cW + 760;
            var x = cW - ((time * (0.42 + row * 0.08) + camera.x * 0.035 + row * 260) % span);

            ctx.strokeText(fact, x, y);
            ctx.fillText(fact, x, y);
            ctx.strokeText(fact, x + span, y);
            ctx.fillText(fact, x + span, y);
        }

        ctx.restore();
    };

    City.prototype._drawTreatmentChannel = function (ctx, camera, brightness) {
        var cW = CFG.WIDTH;
        var y = CFG.GROUND_Y;
        var channelH = CFG.HEIGHT - CFG.GROUND_Y;
        var flow = (performance.now() * 0.025 - camera.x * 0.12) % 80;

        var waterGrad = ctx.createLinearGradient(0, y, 0, CFG.HEIGHT);
        waterGrad.addColorStop(0, 'rgba(20, 120, 150, ' + (0.55 + brightness * 0.15) + ')');
        waterGrad.addColorStop(0.45, 'rgba(7, 70, 95, 0.84)');
        waterGrad.addColorStop(1, 'rgba(2, 26, 42, 1)');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, y, cW, channelH);

        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (var wx = 0; wx <= cW; wx += 8) {
            var wy = y + 4 + Math.sin((wx + flow) * 0.045) * 2;
            if (wx === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
        }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(120, 230, 235, 0.24)';
        ctx.lineWidth = 1;
        for (var line = 0; line < 3; line++) {
            ctx.beginPath();
            var ly = y + 26 + line * 22;
            for (var lx = -80; lx <= cW + 80; lx += 80) {
                var x1 = lx + flow;
                ctx.moveTo(x1, ly);
                ctx.lineTo(x1 + 36, ly + Math.sin(lx * 0.03 + line) * 2);
            }
            ctx.stroke();
        }

        var chamberW = cW / PROCESS_LABELS.length;
        for (var i = 0; i < PROCESS_LABELS.length; i++) {
            var cx = i * chamberW;
            ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.08)';
            ctx.fillRect(cx, y, chamberW, channelH);

            ctx.strokeStyle = 'rgba(160, 230, 230, 0.22)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, y);
            ctx.lineTo(cx, CFG.HEIGHT);
            ctx.stroke();

            ctx.font = 'bold 10px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(210, 255, 250, 0.72)';
            ctx.fillText(PROCESS_LABELS[i], cx + chamberW / 2, y + 13);

            if (i < PROCESS_LABELS.length - 1) {
                ctx.fillStyle = 'rgba(210, 255, 250, 0.35)';
                ctx.beginPath();
                ctx.moveTo(cx + chamberW - 18, y + 42);
                ctx.lineTo(cx + chamberW - 8, y + 47);
                ctx.lineTo(cx + chamberW - 18, y + 52);
                ctx.closePath();
                ctx.fill();
            }
        }
    };

    return City;
})();
