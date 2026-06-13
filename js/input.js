// ── Input Manager ───────────────────────────────────────────────
const Input = {
    keys: {},
    mouse: { x: 0, y: 0, down: false, right: false },
    _justPressed: {},

    // ── Touch state (mobile) ────────────────────────────────────
    // isTouch flips true on a touch-capable device / first touch event.
    // Used to show on-screen controls and switch movement to drag-to-move.
    isTouch: false,
    touch: {
        moveActive: false,   // a drag is in progress on the move pad
        moveX: 0, moveY: 0,  // normalized drag direction (-1..1)
        chlorine: false,     // held action
        ozone: false, uv: false, backwash: false, coagulant: false, ph: false, // edge actions
        invSlot: -1,         // inventory slot tapped this frame, or -1
        aimX: 0, aimY: 0,    // last touch point in game coords (ozone aim)
    },

    init(canvas) {
        var self = this;

        window.addEventListener('keydown', e => {
            if (!this.keys[e.code]) this._justPressed[e.code] = true;
            this.keys[e.code] = true;
            if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });
        canvas.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = (e.clientX - rect.left) * (CFG.WIDTH / rect.width);
            this.mouse.y = (e.clientY - rect.top) * (CFG.HEIGHT / rect.height);
        });
        canvas.addEventListener('mousedown', e => {
            e.preventDefault();
            if (e.button === 0) this.mouse.down = true;
            if (e.button === 2) this.mouse.right = true;
        });
        canvas.addEventListener('mouseup', e => {
            if (e.button === 0) this.mouse.down = false;
            if (e.button === 2) this.mouse.right = false;
        });
        canvas.addEventListener('contextmenu', e => e.preventDefault());

        // ── Touch handling — delegates geometry to TouchControls ────
        function toGame(t) {
            var rect = canvas.getBoundingClientRect();
            return {
                x: (t.clientX - rect.left) * (CFG.WIDTH / rect.width),
                y: (t.clientY - rect.top) * (CFG.HEIGHT / rect.height),
            };
        }

        function handle(e, phase) {
            self.isTouch = true;
            e.preventDefault();
            var hasTC = (typeof TouchControls !== 'undefined');

            // Recentre the move pad once all touches lift.
            if (e.touches.length === 0 && hasTC) TouchControls.releasePad();

            // Movement: find an active touch inside the move zone.
            var moveTouch = null;
            for (var i = 0; i < e.touches.length; i++) {
                var p = toGame(e.touches[i]);
                if (hasTC && TouchControls.isMoveZone(p.x, p.y)) moveTouch = p;
            }
            if (moveTouch && hasTC) {
                var d = TouchControls.moveDirection(moveTouch.x, moveTouch.y);
                self.touch.moveActive = true;
                self.touch.moveX = d.x; self.touch.moveY = d.y;
            } else {
                self.touch.moveActive = false;
                self.touch.moveX = 0; self.touch.moveY = 0;
            }

            // Held buttons (chlorine): re-assert each frame from active touches.
            self.touch.chlorine = false;
            if (hasTC) {
                for (var h = 0; h < e.touches.length; h++) {
                    var hp = toGame(e.touches[h]);
                    if (TouchControls.heldButtonAt(hp.x, hp.y) === 'chlorine') {
                        self.touch.chlorine = true;
                    }
                }
            }

            // Edge buttons + menu taps fire on touchstart only.
            if (phase === 'start' && hasTC) {
                for (var c = 0; c < e.changedTouches.length; c++) {
                    var cp = toGame(e.changedTouches[c]);
                    self.touch.aimX = cp.x; self.touch.aimY = cp.y;
                    // Mirror a tap as a left-click so menus (which read mouse) work.
                    self.mouse.x = cp.x; self.mouse.y = cp.y; self.mouse.down = true;
                    TouchControls.pressAt(cp.x, cp.y, self.touch);
                }
            }
        }

        canvas.addEventListener('touchstart', function (e) { handle(e, 'start'); }, { passive: false });
        canvas.addEventListener('touchmove',  function (e) { handle(e, 'move'); },  { passive: false });
        canvas.addEventListener('touchend',   function (e) { handle(e, 'end'); },   { passive: false });
        canvas.addEventListener('touchcancel',function (e) { handle(e, 'end'); },   { passive: false });

        if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) {
            this.isTouch = true;
        }
    },

    isDown(code) { return !!this.keys[code]; },
    justPressed(code) { return !!this._justPressed[code]; },

    moveDir() {
        let dx = 0, dy = 0;
        if (this.isDown('KeyA') || this.isDown('ArrowLeft'))  dx -= 1;
        if (this.isDown('KeyD') || this.isDown('ArrowRight')) dx += 1;
        if (this.isDown('KeyW') || this.isDown('ArrowUp'))    dy -= 1;
        if (this.isDown('KeyS') || this.isDown('ArrowDown'))  dy += 1;

        // Touch drag overrides keyboard when active.
        if (this.touch.moveActive) { dx = this.touch.moveX; dy = this.touch.moveY; }

        if (dx !== 0 && dy !== 0) {
            const inv = 1 / Math.SQRT2;
            dx *= inv; dy *= inv;
        }
        return { x: dx, y: dy };
    },

    // Action keys auto-fire while held; per-attack cooldowns / charge gates
    // in main.js prevent spamming, so this just makes the keyboard behave
    // consistently with the mouse (which already auto-fires).
    wantsChlorine()  { return this.isDown('Space') || this.touch.chlorine; },
    wantsOzone()     { return this.isDown('KeyE') || this.mouse.down || this.touch.ozone; },
    wantsUV()        { return this.isDown('KeyQ') || this.mouse.right || this.touch.uv; },
    wantsBackwash()  { return this.isDown('KeyF') || this.touch.backwash; },
    wantsCoagulant() { return this.isDown('KeyR') || this.touch.coagulant; },
    wantsPH()        { return this.isDown('KeyT') || this.touch.ph; },

    endFrame() {
        this._justPressed = {};
        this.mouse.down = false;
        this.mouse.right = false;
        // Clear edge-triggered touch actions; held chlorine is re-asserted
        // each frame by TouchControls from the active touch set.
        this.touch.ozone = false;
        this.touch.uv = false;
        this.touch.backwash = false;
        this.touch.coagulant = false;
        this.touch.ph = false;
        this.touch.invSlot = -1;
        // NOTE: touch.chlorine is NOT cleared here; it is re-asserted every
        // touch event from active touches and cleared on touchend.
    },
};
