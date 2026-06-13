// ── Save/Load Slot System for Diss N Fex ───────────────────────────────────
// Manages 4 independent local storage save slots and profile migration.

const SaveSystem = (function () {
    'use strict';

    return {
        MAX_SLOTS: 4,
        activeSlot: 0,
        SAVE_PREFIX: 'dissnfex_run_',
        // Older key prefixes we still migrate forward from, newest first.
        LEGACY_SLOT_PREFIXES: ['wtp_operator_run_', 'grumbulus_run_'],

        slotKey: function (slot) {
            return this.SAVE_PREFIX + slot;
        },

        readSlot: function (slot) {
            var raw = localStorage.getItem(this.slotKey(slot));
            if (!raw) {
                // Pull forward from any older key prefix, then retire the old key.
                for (var i = 0; i < this.LEGACY_SLOT_PREFIXES.length; i++) {
                    var legacyKey = this.LEGACY_SLOT_PREFIXES[i] + slot;
                    var legacyRaw = localStorage.getItem(legacyKey);
                    if (legacyRaw) {
                        raw = legacyRaw;
                        localStorage.setItem(this.slotKey(slot), legacyRaw);
                        localStorage.removeItem(legacyKey);
                        break;
                    }
                }
            }
            return raw ? JSON.parse(raw) : null;
        },

        saveRun: function (game) {
            try {
                localStorage.setItem(this.slotKey(this.activeSlot), JSON.stringify({
                    waveNumber: game.waves.waveNumber,
                    score: game.scoring.score,
                    totalKills: game.scoring.totalKills,
                    bestCombo: game.scoring.bestCombo,
                    rigHp: game.rig.hp,
                    treatmentPoints: game.progression.treatmentPoints,
                    upgradeLevels: game.progression.upgradeLevels,
                    timestamp: Date.now(),
                }));
            } catch (e) {
                console.error('Save System error:', e);
            }
        },

        loadRun: function (game, slot) {
            try {
                var data = this.readSlot(slot);
                if (!data || !data.waveNumber) return false;
                
                this.activeSlot = slot;
                game.waves.waveNumber = data.waveNumber - 1;
                game.scoring.score = data.score || 0;
                game.scoring.totalKills = data.totalKills || 0;
                game.scoring.bestCombo = data.bestCombo || 0;
                game.rig.hp = data.rigHp || data.cloudHp || game.rig.maxHp;

                // Restore per-slot SP and upgrades
                if (typeof data.treatmentPoints === 'number') {
                    game.progression.treatmentPoints = data.treatmentPoints;
                }
                if (data.upgradeLevels) {
                    game.progression.upgradeLevels = data.upgradeLevels;
                }

                // Unlock attacks silently (no announcements for already-reached waves)
                for (var w = 1; w <= data.waveNumber; w++) {
                    game.progression.checkWaveUnlocks(w);
                }
                game.progression.pendingAnnouncements.length = 0; // Clear old announcements
                return true;
            } catch (e) {
                console.error('Load System error:', e);
                return false;
            }
        },

        _removeAllForSlot: function (slot) {
            localStorage.removeItem(this.slotKey(slot));
            for (var i = 0; i < this.LEGACY_SLOT_PREFIXES.length; i++) {
                localStorage.removeItem(this.LEGACY_SLOT_PREFIXES[i] + slot);
            }
        },

        clearRunSave: function () {
            try {
                this._removeAllForSlot(this.activeSlot);
            } catch (e) {}
        },

        getSlotInfo: function (slot) {
            try {
                var data = this.readSlot(slot);
                if (data && data.waveNumber) return data;
            } catch (e) {}
            return null;
        },

        deleteSlot: function (slot) {
            try {
                this._removeAllForSlot(slot);
            } catch (e) {}
        },

        migrateLegacySave: function () {
            // Pull any older-format save keys forward into the current slots,
            // then retire the old keys. Covers every prior naming scheme.
            try {
                for (var slot = 0; slot < this.MAX_SLOTS; slot++) {
                    for (var i = 0; i < this.LEGACY_SLOT_PREFIXES.length; i++) {
                        var oldKey = this.LEGACY_SLOT_PREFIXES[i] + slot;
                        var oldSlot = localStorage.getItem(oldKey);
                        if (oldSlot && !localStorage.getItem(this.slotKey(slot))) {
                            localStorage.setItem(this.slotKey(slot), oldSlot);
                        }
                        if (oldSlot) localStorage.removeItem(oldKey);
                    }
                }

                var oldSave = localStorage.getItem('grumbulus_run');
                if (oldSave && !localStorage.getItem(this.slotKey(0))) {
                    localStorage.setItem(this.slotKey(0), oldSave);
                }
                if (oldSave) localStorage.removeItem('grumbulus_run');
            } catch (e) {}
        }
    };
})();
