// ── Save/Load Slot System for Diss N Fex ───────────────────────────────────
// Manages 4 independent local storage save slots and profile migration.

const SaveSystem = (function () {
    'use strict';

    return {
        MAX_SLOTS: 4,
        activeSlot: 0,
        SAVE_PREFIX: 'wtp_operator_run_',
        LEGACY_SLOT_PREFIX: 'grumbulus_run_',

        slotKey: function (slot) {
            return this.SAVE_PREFIX + slot;
        },

        legacySlotKey: function (slot) {
            return this.LEGACY_SLOT_PREFIX + slot;
        },

        readSlot: function (slot) {
            var raw = localStorage.getItem(this.slotKey(slot));
            if (!raw) {
                raw = localStorage.getItem(this.legacySlotKey(slot));
                if (raw) {
                    localStorage.setItem(this.slotKey(slot), raw);
                    localStorage.removeItem(this.legacySlotKey(slot));
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
                    cloudHp: game.rig.hp,
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
                game.rig.hp = data.cloudHp || game.rig.maxHp;

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

        clearRunSave: function () {
            try {
                localStorage.removeItem(this.slotKey(this.activeSlot));
                localStorage.removeItem(this.legacySlotKey(this.activeSlot));
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
                localStorage.removeItem(this.slotKey(slot));
                localStorage.removeItem(this.legacySlotKey(slot));
            } catch (e) {}
        },

        migrateLegacySave: function () {
            // Migrate legacy save keys into WTP operator slots.
            try {
                for (var slot = 0; slot < this.MAX_SLOTS; slot++) {
                    var oldSlot = localStorage.getItem(this.legacySlotKey(slot));
                    if (oldSlot && !localStorage.getItem(this.slotKey(slot))) {
                        localStorage.setItem(this.slotKey(slot), oldSlot);
                    }
                    if (oldSlot) localStorage.removeItem(this.legacySlotKey(slot));
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
