/* =========================================================
   BLEACH // RETRIBUTION
   PRIVATE TRANSMISSION NETWORK

   TRANSMISSION PORTRAIT RESOLVER
   VERSION 2.0.0

   Resolves the custom "Transmission Portrait" field for:
   - The currently opened private message
   - Every entry inside Transmission History

   Native Forumotion avatars remain as the fallback.
   ========================================================= */

(function () {
    "use strict";

    const CONFIG = {
        fieldLabel: "transmission portrait",
        readerSelector: ".br-pm-message",
        historySelector: ".br-pm-history",
        recordSelector: ".br-pm-message, .br-pm-history .post",
        portraitSelector: ".br-pm-avatar, .postprofile-avatar",
        nameSelector: ".br-pm-sender, .postprofile-name",
        profileLinkSelector: "a[href^='/u'], a[href*='://bleachretro.rpg-board.net/u']",
        requestMarker: "_br_portrait",
        observerDelay: 40
    };

    /* One Promise per member prevents duplicate profile requests. */
    const portraitRequests = new Map();
    const memberProfiles = new Map();
    let observerTimer = 0;

    function normalizeName(value) {
        return (value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function normalizeProfilePath(value) {
        if (!value) return null;

        try {
            const url = new URL(value, window.location.origin);
            const match = url.pathname.match(/^\/u(\d+)\/?$/i);

            if (!match || url.origin !== window.location.origin) {
                return null;
            }

            return "/u" + match[1];
        } catch (_error) {
            return null;
        }
    }

    function validImageURL(value) {
        if (!value) return null;

        const cleaned = String(value).trim();
        if (!/^https?:\/\//i.test(cleaned)) return null;

        try {
            const url = new URL(cleaned);
            return /^(https?:)$/i.test(url.protocol) ? url.href : null;
        } catch (_error) {
            return null;
        }
    }

    function fieldLabel(field) {
        const label = field.querySelector("dt span") || field.querySelector("dt");

        return normalizeName(
            label ? label.textContent.replace(/\s*:\s*$/, "") : ""
        );
    }

    function extractPortrait(profileDocument) {
        const fields = Array.from(
            profileDocument.querySelectorAll(
                '#profile-tab-field-profil dl, dl[id^="field_id"], [id^="field_id"]'
            )
        );

        let field = fields.find(function (candidate) {
            return fieldLabel(candidate) === CONFIG.fieldLabel;
        });

        /* Fallback for legacy Forumotion profile markup. */
        if (!field) {
            const label = Array.from(profileDocument.querySelectorAll("dt span"))
                .find(function (candidate) {
                    return normalizeName(candidate.textContent) === CONFIG.fieldLabel;
                });

            field = label ? label.closest("dl") : null;
        }

        if (!field) return null;

        const value = field.querySelector("dd");
        if (!value) return null;

        const publicValue = value.querySelector(".field_uneditable") || value;
        const linkedValue = publicValue.querySelector("a[href]");
        const imageValue = publicValue.querySelector("img[src]");

        let portraitURL = validImageURL(
            (linkedValue && linkedValue.getAttribute("href")) ||
            (imageValue && imageValue.getAttribute("src")) ||
            publicValue.textContent
        );

        if (portraitURL) return portraitURL;

        const editableInput = value.querySelector(
            ".field_editable input[type='text'], input[type='text']"
        );

        portraitURL = validImageURL(
            editableInput
                ? editableInput.value || editableInput.getAttribute("value")
                : ""
        );
