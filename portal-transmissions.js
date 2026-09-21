/*
 * BLEACH // RETRIBUTION
 * PORTAL TRANSMISSIONS // RC04.1
 *
 * Forumotion renders the Recent Topics feed as one .mod-recent-row
 * containing alternating .mod-recent-title / .mod-recent-info siblings.
 * This script normalizes each pair into a .br-transmission record.
 *
 * Scope: Portal archive only.
 * Data: untouched.
 * Ordering: untouched.
 * Marquee/scrolling: untouched.
 */
(function () {
    "use strict";

    function normalizeTransmissions() {
        var archive = document.querySelector(".br-portal-archive");
        if (!archive) return;

        var row = archive.querySelector(
            "#comments_scroll_div .mod-recent-row"
        );

        if (!row || row.dataset.brNormalized === "1") return;

        var titles = Array.prototype.slice.call(
            row.querySelectorAll(":scope > .mod-recent-title")
        );

        if (!titles.length) return;

        titles.forEach(function (title) {
            var info = title.nextElementSibling;

            if (
                !info ||
                !info.classList.contains("mod-recent-info")
            ) return;

            var record = document.createElement("div");
            record.className = "br-transmission";

            row.insertBefore(record, title);
            record.appendChild(title);
            record.appendChild(info);
        });

        row.dataset.brNormalized = "1";
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            normalizeTransmissions,
            { once: true }
        );
    } else {
        normalizeTransmissions();
    }
}());
