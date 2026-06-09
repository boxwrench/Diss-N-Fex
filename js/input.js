// ── Input Manager ───────────────────────────────────────────────
const Input = {
    keys: {},
    mouse: { x: 0, y: 0, down: false, right: false },
    _justPressed: {},

    init(canvas) {
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
            // Map screen pixels to game coordinates (1280x720)
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
    },

    isDown(code) {
        return !!this.keys[code];
    },

    justPressed(code) {
        return !!this._justPressed[code];
    },

    moveDir() {
        let dx = 0, dy = 0;
        if (this.isDown('KeyA') || this.isDown('ArrowLeft'))  dx -= 1;
        if (this.isDown('KeyD') || this.isDown('ArrowRight')) dx += 1;
        if (this.isDown('KeyW') || this.isDown('ArrowUp'))    dy -= 1;
        if (this.isDown('KeyS') || this.isDown('ArrowDown'))  dy += 1;
        if (dx !== 0 && dy !== 0) {
            const inv = 1 / Math.SQRT2;
            dx *= inv;
            dy *= inv;
        }
        return { x: dx, y: dy };
    },

    wantsRain()      { return this.isDown('Space'); },
    wantsHail()      { return this.justPressed('KeyE') || this.mouse.down; },
    wantsLightning() { return this.justPressed('KeyQ') || this.mouse.right; },
    wantsTornado()   { return this.justPressed('KeyF'); },
    wantsFrost()     { return this.justPressed('KeyR'); },
    wantsFog()       { return this.justPressed('KeyT'); },

    endFrame() {
        this._justPressed = {};
        this.mouse.down = false;
        this.mouse.right = false;
    },
};
