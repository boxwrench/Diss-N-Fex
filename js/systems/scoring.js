// -- Scoring System ------------------------------------------------------
// Score tracking, combos, high-score persistence.
// Depends on global CFG.

class ScoringSystem {

    constructor() {
        this.score           = 0;
        this.highScore       = this.loadHighScore();
        this.combo           = 0;
        this.comboTimer      = 0;
        this.comboMultiplier = 1;
        this.bestCombo       = 0;
        this.totalKills      = 0;
        this.waveKills       = 0;
        this.waveScore       = 0;
        this.comboWindowOverride = 0; // set by main.js from progression
    }

    // -- Hits ------------------------------------------------------------

    /**
     * Register a scoring hit.  Handles combo escalation and text popups.
     * @param {number} points  base points before multiplier
     * @param {number} x       world x for popup
     * @param {number} y       world y for popup
     * @param {Array}  textPopups  array to push popup objects into
     * @returns {number} actual points awarded
     */
    addHit(points, x, y, textPopups) {
        // Advance combo
        this.combo++;
        if (this.combo > this.bestCombo) this.bestCombo = this.combo;
        this.comboTimer = this.comboWindowOverride || CFG.COMBO.WINDOW;

        // Compute multiplier: 1 + combo * increment, capped
        this.comboMultiplier = Math.min(
            1 + this.combo * CFG.COMBO.INCREMENT,
            CFG.COMBO.MAX_MULT
        );

        var actual = Math.floor(points * this.comboMultiplier);
        this.score     += actual;
        this.waveScore += actual;

        // Small floating text
        if (textPopups && textPopups.add) {
            textPopups.add(x + (Math.random() - 0.5) * 12, y, '+' + actual, {
                color: '#ffffff',
                size:  14,
                life:  0.8,
            });
        }

        // Check combo tier thresholds
        if (textPopups && textPopups.add) {
            var tiers = CFG.COMBO.TIERS;
            for (var i = 0; i < tiers.length; i++) {
                if (this.combo === tiers[i].threshold) {
                    textPopups.add(x, y - 20, tiers[i].label + ' x' + this.comboMultiplier.toFixed(1), {
                        color: tiers[i].color,
                        size:  22,
                        life:  1.2,
                        bold:  true,
                    });
                    break;
                }
            }
        }

        return actual;
    }

    // -- Kills -----------------------------------------------------------

    /**
     * Register a kill.
     * @param {number} points  base kill points (already scaled by attack type)
     * @param {number} x
     * @param {number} y
     * @param {string} type    attack type key ('chlorine','ozone','uv')
     * @param {Array}  [textPopups]
     * @returns {number} actual points
     */
    addKill(points, x, y, type, textPopups) {
        this.totalKills++;
        this.waveKills++;

        var actual = this.addHit(points, x, y, textPopups);

        // Chain-lightning bonus: three or more kills in quick succession
        if (type === 'uv' && this.combo >= 3) {
            var bonus = 50 * this.combo;
            this.score     += bonus;
            this.waveScore += bonus;
            if (textPopups && textPopups.add) {
                textPopups.add(x, y - 30, 'CHAIN! +' + bonus, {
                    color: '#ffee44',
                    size:  18,
                    life:  1.0,
                    bold:  true,
                });
            }
        }

        return actual;
    }

    // -- Bonuses ---------------------------------------------------------

    /**
     * Add a named bonus (e.g. "Clean Sweep +500").
     */
    addBonus(name, points, x, y, textPopups) {
        this.score     += points;
        this.waveScore += points;

        if (textPopups && textPopups.add) {
            textPopups.add(x, y, name + ' +' + points, {
                color: '#44ffaa',
                size:  18,
                life:  1.4,
            });
        }
    }

    // -- Frame Update ----------------------------------------------------

    update(dt) {
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo           = 0;
                this.comboMultiplier = 1;
            }
        }

        // Persist high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
        }
    }

    // -- Wave stats ------------------------------------------------------

    resetWaveStats() {
        this.waveKills = 0;
        this.waveScore = 0;
    }

    getWaveStats() {
        return { kills: this.waveKills, score: this.waveScore };
    }

    // -- Persistence -----------------------------------------------------

    saveHighScore() {
        try {
            localStorage.setItem('grumbulus_highscore', String(this.highScore));
        } catch (e) {
            // storage may be unavailable in some contexts
        }
    }

    loadHighScore() {
        try {
            var stored = localStorage.getItem('grumbulus_highscore');
            return stored ? parseInt(stored, 10) || 0 : 0;
        } catch (e) {
            return 0;
        }
    }

    // -- Reset -----------------------------------------------------------

    reset() {
        this.score           = 0;
        this.combo           = 0;
        this.comboTimer      = 0;
        this.comboMultiplier = 1;
        this.bestCombo       = 0;
        this.totalKills      = 0;
        this.waveKills       = 0;
        this.waveScore       = 0;
        // high score is kept
    }
}
