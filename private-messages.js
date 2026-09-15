/* =========================================================
   BLEACH // RETRIBUTION
   PRIVATE TRANSMISSION NETWORK
   LAYER 2 // TRANSMISSION PORTRAIT RESOLVER
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    /* Only operate inside the Private Transmission reader. */
    const transmission = document.querySelector(".br-pm-message");

    if (!transmission) {
        return;
    }

    const portraitCache = new Map();

    const normalizeName = (name) => {
        return (name || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    };

    const validImageURL = (value) => {
        if (!value) return false;

        try {
            const url = new URL(value, window.location.origin);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (error) {
            return false;
        }
    };

    /*
     * Retrieve a member's Transmission Portrait.
     *
     * Forumotion custom profile field:
     * Field ID // 13
     */
    async function getTransmissionPortrait(profileURL) {

        if (!profileURL) {
            return null;
        }

        if (portraitCache.has(profileURL)) {
            return portraitCache.get(profileURL);
        }

        try {

            const response = await fetch(profileURL, {
                credentials: "same-origin"
            });

            if (!response.ok) {
                throw new Error("Profile request failed");
            }

            const html = await response.text();
            const parser = new DOMParser();
            const profile = parser.parseFromString(html, "text/html");

            const field =
                profile.querySelector("#field_id13") ||
                profile.querySelector(".profile_field_13-1");

            const portraitURL = field
                ? (field.value || field.getAttribute("value") || "").trim()
                : "";

            const result = validImageURL(portraitURL)
                ? portraitURL
                : null;

            portraitCache.set(profileURL, result);

            return result;

        } catch (error) {

            console.warn(
                "RETRIBUTION // Transmission Portrait unavailable:",
                profileURL
            );

            portraitCache.set(profileURL, null);

            return null;
        }
    }

    /*
     * Replace the existing portrait only after the custom
     * image successfully loads.
     *
     * If loading fails, Forumotion's original avatar remains.
     */
    function installPortrait(container, portraitURL) {

        if (!container || !portraitURL) {
            return;
        }

        const image = new Image();

        image.onload = function () {

            container.innerHTML = "";

            image.alt = "Transmission Portrait";
            image.className = "br-transmission-portrait";

            container.appendChild(image);
            container.classList.add("br-pm-custom-portrait");
        };

        image.onerror = function () {
            /* Preserve original avatar / empty fallback. */
        };

        image.src = portraitURL;
    }

    /*
     * PARTICIPANT 01
     * Current PM sender.
     *
     * The contact rail gives us a reliable /u# profile link.
     */
    const senderProfileLink = document.querySelector(
        ".br-pm-contact a[href^='/u']"
    );

    const senderNameElement = document.querySelector(
        ".br-pm-sender"
    );

    const senderName = normalizeName(
        senderNameElement
            ? senderNameElement.textContent
            : ""
    );

    const senderProfileURL = senderProfileLink
        ? senderProfileLink.getAttribute("href")
        : null;

    /*
     * PARTICIPANT 02
     * Logged-in member.
     *
     * Prefer the normal site Profile navigation link.
     * Do not hardcode a user ID.
     */
    let selfProfileLink = null;

    const profileCandidates = Array.from(
        document.querySelectorAll("a[href^='/u']")
    );

    /*
     * Exclude the sender's contact link.
     * A profile link outside the PM record is normally the
     * logged-in member's own profile link.
     */
    for (const link of profileCandidates) {

        if (senderProfileLink && link === senderProfileLink) {
            continue;
        }

        if (
            !link.closest(".br-pm-message") &&
            !link.closest(".br-pm-history")
        ) {
            selfProfileLink = link;
            break;
        }
    }

    /*
     * Determine the logged-in participant name from history.
     *
     * Since a private-message conversation is one-to-one,
     * the history contains the sender and the logged-in member.
     */
    const historyNames = Array.from(
        document.querySelectorAll(
            ".br-pm-history .postprofile-name"
        )
    );

    let selfName = "";

    for (const element of historyNames) {

        const candidate = normalizeName(element.textContent);

        if (candidate && candidate !== senderName) {
            selfName = candidate;
            break;
        }
    }

    const selfProfileURL = selfProfileLink
        ? selfProfileLink.getAttribute("href")
        : null;

    /*
     * Build our participant registry.
     */
    const participants = new Map();

    if (senderName && senderProfileURL) {
        participants.set(senderName, senderProfileURL);
    }

    if (selfName && selfProfileURL) {
        participants.set(selfName, selfProfileURL);
    }

    /*
     * Resolve the primary/current transmission.
     */
    async function resolvePrimaryTransmission() {

        if (!senderProfileURL) {
            return;
        }

        const portraitURL =
            await getTransmissionPortrait(senderProfileURL);

        if (!portraitURL) {
            return;
        }

        installPortrait(
            document.querySelector(".br-pm-avatar"),
            portraitURL
        );
    }

    /*
     * Resolve every archived transmission.
     */
    async function resolveHistory() {

        const records = document.querySelectorAll(
            ".br-pm-history .post"
        );

        for (const record of records) {

            const nameElement = record.querySelector(
                ".postprofile-name"
            );

            const portraitContainer = record.querySelector(
                ".postprofile-avatar"
            );

            if (!nameElement || !portraitContainer) {
                continue;
            }

            const memberName = normalizeName(
                nameElement.textContent
            );

            const profileURL = participants.get(memberName);

            if (!profileURL) {
                continue;
            }

            const portraitURL =
                await getTransmissionPortrait(profileURL);

            if (!portraitURL) {
                continue;
            }

            installPortrait(
                portraitContainer,
                portraitURL
            );
        }
    }

    resolvePrimaryTransmission();
    resolveHistory();

});
