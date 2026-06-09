// ── Building ─────────────────────────────────────────────────────
// Procedurally generated city building for parallax layers.
// Layer 0 = far (silhouette), 1 = mid (muted), 2 = near (full detail).

const Building = (function () {

    // ── Palette helpers ──────────────────────────────────────────
    const BASE_PALETTES = [
        { r: 30, g: 50, b: 70 },
        { r: 25, g: 45, b: 55 },
        { r: 40, g: 40, b: 45 },
        { r: 20, g: 35, b: 50 },
        { r: 35, g: 60, b: 80 },
        { r: 15, g: 30, b: 45 }
    ];

    const ROOF_TYPES = ['flat', 'pointed', 'antenna', 'watertower'];

    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    function randInt(min, max) {
        return Math.floor(rand(min, max + 1));
    }

    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // Darken a colour by a factor (0 = black, 1 = unchanged).
    function darken(r, g, b, factor) {
        return {
            r: Math.round(r * factor),
            g: Math.round(g * factor),
            b: Math.round(b * factor),
        };
    }

    function colorStr(c, a) {
        if (a !== undefined) {
            return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
        }
        return 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
    }

    // ── Constructor ──────────────────────────────────────────────
    function Building(x, width, height, layer) {
        this.x      = x;
        this.width   = width;
        this.height  = height;
        this.layer   = layer;            // 0 far, 1 mid, 2 near
        this.y       = CFG.GROUND_Y - height;  // top edge; base at GROUND_Y

        this.data = null;                // populated by generate()
        this.generate();
    }

    // ── Generate random building data ────────────────────────────
    Building.prototype.generate = function () {
        // Layer brightness factor: far = very dark, mid = muted, near = full
        var brightnessFactor = [0.18, 0.55, 1.0][this.layer];

        // Pick base colour and apply layer darkening
        var base   = pick(BASE_PALETTES);
        var body   = darken(base.r, base.g, base.b, brightnessFactor);

        // Window grid
        var winW   = 8;
        var winH   = 8;
        var gap    = 4;
        var cols   = Math.max(1, Math.floor((this.width - gap * 2) / (winW + gap)));
        var rows   = Math.max(1, Math.floor((this.height - 30) / (winH + gap)));

        // Each window: true = lit
        var windows = [];
        for (var r = 0; r < rows; r++) {
            var row = [];
            for (var c = 0; c < cols; c++) {
                row.push(Math.random() < 0.35);
            }
            windows.push(row);
        }

        // Lit window colours (yellow / warm orange)
        var litColors = ['#00ffff', '#33ffaa', '#66ccff', '#00ffcc'];

        // Roof
        var roofType = pick(ROOF_TYPES);

        // Door (only visible on near layer)
        var doorW = Math.min(20, Math.max(12, this.width * 0.2));
        var doorH = 26;
        var doorX = (this.width - doorW) / 2;

        // Random sign (near layer only)
        var hasSign   = this.layer === 2 && Math.random() < 0.3;
        var signColor = pick(['#cc3030', '#2060cc', '#30a040', '#cc8020']);

        this.data = {
            body:       body,
            brightness: brightnessFactor,
            winW:       winW,
            winH:       winH,
            gap:        gap,
            cols:       cols,
            rows:       rows,
            windows:    windows,
            litColors:  litColors,
            roofType:   roofType,
            doorW:      doorW,
            doorH:      doorH,
            doorX:      doorX,
            hasSign:    hasSign,
            signColor:  signColor,
        };
    };

    // ── Draw ─────────────────────────────────────────────────────
    Building.prototype.draw = function (ctx) {
        var d  = this.data;
        var bx = this.x;
        var by = this.y;
        var bw = this.width;
        var bh = this.height;

        // ── Layer 0: background columns and silhouettes ──────────
        if (this.layer === 0) {
            ctx.fillStyle = colorStr(d.body);
            ctx.fillRect(bx, by, bw, bh);

            // Draw simple horizontal background connection pipes
            ctx.strokeStyle = colorStr(darken(d.body.r, d.body.g, d.body.b, 0.6));
            ctx.lineWidth = 4;
            var pipeY = by + bh * 0.6;
            ctx.beginPath();
            ctx.moveTo(bx - 10, pipeY);
            ctx.lineTo(bx + bw + 10, pipeY);
            ctx.stroke();
            return;
        }

        // ── Body (Concrete structure) ────────────────────────────
        ctx.fillStyle = colorStr(d.body);
        ctx.fillRect(bx, by, bw, bh);

        // Border outline
        ctx.strokeStyle = colorStr(darken(d.body.r, d.body.g, d.body.b, 0.7));
        ctx.lineWidth   = 1.5;
        ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

        // ── Industrial Gauges & Dials (Replaces skyscraper windows) ──
        ctx.save();
        
        // 1. Draw a vertical fluid column gauge on the column
        var gaugeW = 10;
        var gaugeH = bh - 40;
        var gaugeX = bx + 12;
        var gaugeY = by + 20;
        
        // Gauge background
        ctx.fillStyle = '#05101a';
        ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);
        ctx.strokeStyle = '#3a4f66';
        ctx.lineWidth = 1;
        ctx.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);
        
        // Gauge fill (glowing fluid level)
        var fillPercent = 0.3 + 0.6 * Math.abs(Math.sin(bx * 0.005 + by * 0.002));
        ctx.fillStyle = this.layer === 1 ? '#00bba0' : '#00ffcc';
        ctx.fillRect(gaugeX, gaugeY + gaugeH * (1 - fillPercent), gaugeW, gaugeH * fillPercent);
        
        // 2. Draw a large circular pressure dial/meter
        if (bw >= 80) {
            var dialR = Math.min(bw * 0.22, 22);
            var dialX = bx + bw - dialR - 15;
            var dialY = by + bh * 0.35;
            
            // Dial border
            ctx.fillStyle = '#f5f7fa';
            ctx.strokeStyle = '#2d3748';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(dialX, dialY, dialR, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Dial markings
            ctx.strokeStyle = '#718096';
            ctx.lineWidth = 1;
            for (var a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                ctx.beginPath();
                ctx.moveTo(dialX + Math.cos(a) * (dialR - 3), dialY + Math.sin(a) * (dialR - 3));
                ctx.lineTo(dialX + Math.cos(a) * dialR, dialY + Math.sin(a) * dialR);
                ctx.stroke();
            }
            
            // Dial needle (red indicator)
            var needleAngle = -Math.PI * 0.8 + 1.6 * Math.PI * fillPercent;
            ctx.strokeStyle = '#e53e3e';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(dialX, dialY);
            ctx.lineTo(dialX + Math.cos(needleAngle) * (dialR - 4), dialY + Math.sin(needleAngle) * (dialR - 4));
            ctx.stroke();
        }
        
        // 3. Draw horizontal connecting pipes running between structures
        ctx.strokeStyle = colorStr(darken(d.body.r, d.body.g, d.body.b, 0.5));
        ctx.lineWidth = 6;
        var connectPipeY = by + bh * 0.75;
        ctx.beginPath();
        ctx.moveTo(bx - 10, connectPipeY);
        ctx.lineTo(bx + bw + 10, connectPipeY);
        ctx.stroke();
        
        ctx.restore();

        // ── Roof decoration (filter valves and sensor caps) ─────────
        var cx = bx + bw / 2;
        ctx.fillStyle   = colorStr(darken(d.body.r, d.body.g, d.body.b, 0.65));
        ctx.strokeStyle = ctx.fillStyle;

        switch (d.roofType) {
            case 'pointed': // Conical filter cap
                ctx.beginPath();
                ctx.moveTo(cx - bw * 0.35, by);
                ctx.lineTo(cx, by - 16);
                ctx.lineTo(cx + bw * 0.35, by);
                ctx.closePath();
                ctx.fill();
                break;

            case 'antenna': // Sensor rod with glowing tip
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, by);
                ctx.lineTo(cx, by - 26);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(cx, by - 29, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#00ffcc';
                ctx.fill();
                break;

            case 'watertower': // Pressure valve handwheel
                var twW = bw * 0.22;
                var twH = 14;
                var twX = cx - twW / 2;
                var twY = by - twH - 4;
                // Base stalk
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, by);
                ctx.lineTo(cx, twY + twH);
                ctx.stroke();
                // Handwheel circle
                ctx.strokeStyle = colorStr(darken(d.body.r, d.body.g, d.body.b, 0.5));
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(cx, twY + twH / 2, twW / 2, 0, Math.PI * 2);
                ctx.stroke();
                break;

            // 'flat' - no decoration
        }

        // ── Inlet Valve (near layer only, reskinned) ─────────────
        if (this.layer === 2) {
            var dx = bx + d.doorX + d.doorW / 2;
            var dy = CFG.GROUND_Y - d.doorH / 2 - 4;
            var r = Math.max(6, d.doorW / 2);
            // Outer valve ring
            ctx.fillStyle = colorStr(darken(d.body.r, d.body.g, d.body.b, 0.3));
            ctx.beginPath();
            ctx.arc(dx, dy, r + 2, 0, Math.PI * 2);
            ctx.fill();
            // Inner valve opening
            ctx.fillStyle = '#05101a';
            ctx.beginPath();
            ctx.arc(dx, dy, Math.max(1, r - 2), 0, Math.PI * 2);
            ctx.fill();
            // Valve wheel/handle
            ctx.strokeStyle = '#c0a040';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(dx, dy, Math.max(1, r - 4), 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(dx - r + 4, dy); ctx.lineTo(dx + r - 4, dy);
            ctx.moveTo(dx, dy - r + 4); ctx.lineTo(dx, dy + r - 4);
            ctx.stroke();
        }

        // ── Sign (near layer only) ──────────────────────────────
        if (d.hasSign && this.layer === 2) {
            var sw = bw * 0.4;
            var sh = 12;
            var sx = bx + (bw - sw) / 2;
            var sy = by + bh * 0.3;
            ctx.fillStyle = d.signColor;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(sx, sy, sw, sh);
            ctx.globalAlpha = 1.0;
        }
    };

    return Building;
})();
