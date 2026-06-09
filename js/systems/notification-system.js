// ── Notification and Announcement System for Diss N Fex ───────────────────
// Manages in-game announcements and complaint text popups.

const NotificationSystem = (function () {
    'use strict';

    return {
        announcementText: '',
        announcementTimer: 0,
        complaintCooldown: 0,

        update: function (dt) {
            if (this.announcementTimer > 0) {
                this.announcementTimer -= dt;
                if (this.announcementTimer <= 0) {
                    this.announcementText = '';
                }
            }
            if (this.complaintCooldown > 0) {
                this.complaintCooldown -= dt;
            }
        },

        showComplaint: function (x, y, text, textPopups) {
            if (this.complaintCooldown > 0) return;
            this.complaintCooldown = 1.5; // max 1 complaint per 1.5s
            textPopups.add(x, y - 30, text, {
                color: '#ffcc00', size: 16, life: 2.5, bold: true, vy: -40
            });
        },

        showAnnouncement: function (text) {
            this.announcementText = text;
            this.announcementTimer = 3.0; // Show for 3 seconds
        },

        checkAnnouncements: function (progression) {
            if (!progression) return;
            var ann = progression.getNextAnnouncement();
            if (ann) {
                this.showAnnouncement(ann);
                if (typeof SFX !== 'undefined') {
                    SFX.playPowerUp(); // Play unlock sound
                }
            }
        }
    };
})();
