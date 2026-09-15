/* =========================================================
   BLEACH // RETRIBUTION
   PRIVATE TRANSMISSION NETWORK
   LAYER 2 // TRANSMISSION PORTRAIT RESOLVER
   VERSION 1.1
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    /* ---------------------------------------------------------
       01 // ACTIVATE ONLY ON THE PM READER
       --------------------------------------------------------- */

    const transmission = document.querySelector(".br-pm-message");

    if (!transmission) {
        return;
    }


    /* ---------------------------------------------------------
       02 // CONFIGURATION
       --------------------------------------------------------- */

    const TRANSMISSION_FIELD_SELECTOR =
        "#field_id13, .profile_field_13-1";

    const portraitCache = new Map();


    /* ---------------------------------------------------------
       03 // UTILITIES
       --------------------------------------------------------- */

    function normalizeName(name) {
        return (name || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }


    function validImageURL(value) {

        if (!value) {
            return false;
        }

        try {

            const url = new URL(
                value,
                window.location.origin
            );

            return (
                url.protocol === "http:" ||
                url.protocol === "https:"
            );

        } catch (error) {

            return false;
        }
    }


    /* ---------------------------------------------------------
       04 // FETCH TRANSMISSION PORTRAIT FROM PROFILE
       --------------------------------------------------------- */

    async function getTransmissionPortrait(profileURL) {

        if (!profileURL) {
            return null;
        }

        /*
         * Do not fetch the same member profile repeatedly.
         */
        if (portraitCache.has(profileURL)) {
            return portraitCache.get(profileURL);
        }

        try {

            const response = await fetch(profileURL, {
                credentials: "same-origin"
            });

            if (!response.ok) {
                throw new Error(
                    "Profile request failed: " +
                    response.status
                );
            }

            const html = await response.text();

            const parser = new DOMParser();

            const profileDocument =
                parser.parseFromString(
                    html,
                    "text/html"
                );

            const field =
                profileDocument.querySelector(
                    TRANSMISSION_FIELD_SELECTOR
                );

            if (!field) {

                portraitCache.set(
                    profileURL,
                    null
                );

                return null;
            }

            const portraitURL = (
                field.value ||
                field.getAttribute("value") ||
                ""
            ).trim();

            if (!validImageURL(portraitURL)) {

                portraitCache.set(
                    profileURL,
                    null
                );

                return null;
            }

            portraitCache.set(
                profileURL,
                portraitURL
            );

            return portraitURL;

        } catch (error) {

            console.warn(
                "RETRIBUTION // Transmission Portrait unavailable:",
                profileURL,
                error
            );

            portraitCache.set(
                profileURL,
                null
            );

            return null;
        }
    }


    /* ---------------------------------------------------------
       05 // INSTALL RESOLVED PORTRAIT
       --------------------------------------------------------- */

    function installPortrait(
        container,
        portraitURL
    ) {

        if (!container || !portraitURL) {
            return;
        }

        const image = new Image();

        /*
         * We only replace the original Forumotion avatar
         * AFTER the custom portrait successfully loads.
         *
         * If anything fails, the normal avatar or empty
         * fallback remains untouched.
         */
        image.onload = function () {

            container.innerHTML = "";

            image.alt =
                "Transmission Portrait";

            image.className =
                "br-transmission-portrait";

            container.appendChild(image);

            container.classList.add(
                "br-pm-custom-portrait"
            );
        };

        image.onerror = function () {

            console.warn(
                "RETRIBUTION // Portrait image failed to load:",
                portraitURL
            );
        };

        image.src = portraitURL;
    }


    /* ---------------------------------------------------------
       06 // IDENTIFY CURRENT MESSAGE SENDER
       --------------------------------------------------------- */

    const senderNameElement =
        document.querySelector(
            ".br-pm-sender"
        );

    const senderName =
        normalizeName(
            senderNameElement
                ? senderNameElement.textContent
                : ""
        );


    /*
     * The current PM contact rail contains a direct
     * link to the sender's Forumotion profile.
     */
    const senderProfileLink =
        document.querySelector(
            ".br-pm-contact a[href^='/u']"
        );

    const senderProfileURL =
        senderProfileLink
            ? senderProfileLink.getAttribute("href")
            : null;


    /* ---------------------------------------------------------
       07 // IDENTIFY OTHER PARTICIPANT FROM HISTORY
       --------------------------------------------------------- */

    const historyNameElements =
        Array.from(
            document.querySelectorAll(
                ".br-pm-history .postprofile-name"
            )
        );

    let selfName = "";

    /*
     * Private messages are one-to-one.
     *
     * The first history username that differs from the
     * current sender identifies the logged-in participant.
     */
    for (const element of historyNameElements) {

        const candidate =
            normalizeName(
                element.textContent
            );

        if (
            candidate &&
            candidate !== senderName
        ) {

            selfName = candidate;
            break;
        }
    }


    /* ---------------------------------------------------------
       08 // RESOLVE LOGGED-IN MEMBER PROFILE URL
       --------------------------------------------------------- */

    const profileCandidates =
        Array.from(
            document.querySelectorAll(
                "a[href^='/u']"
            )
        );

    let selfProfileLink = null;

    /*
     * IMPORTANT:
     *
     * Retribution contains many /u# links on this page
     * because widgets/member listings are also present.
     *
     * Therefore we NEVER assume the first /u# link is
     * the logged-in member.
     *
     * Instead, match the visible username.
     */
    for (const link of profileCandidates) {

        const linkName =
            normalizeName(
                link.textContent
            );

        if (
            selfName &&
            linkName === selfName
        ) {

            selfProfileLink = link;
            break;
        }
    }


    const selfProfileURL =
        selfProfileLink
            ? selfProfileLink.getAttribute("href")
            : null;


    /* ---------------------------------------------------------
       09 // PARTICIPANT REGISTRY
       --------------------------------------------------------- */

    const participants = new Map();


    if (
        senderName &&
        senderProfileURL
    ) {

        participants.set(
            senderName,
            senderProfileURL
        );
    }


    if (
        selfName &&
        selfProfileURL
    ) {

        participants.set(
            selfName,
            selfProfileURL
        );
    }


    /* ---------------------------------------------------------
       10 // RESOLVE CURRENT TRANSMISSION
       --------------------------------------------------------- */

    async function resolvePrimaryTransmission() {

        if (!senderProfileURL) {
            return;
        }

        const portraitURL =
            await getTransmissionPortrait(
                senderProfileURL
            );

        if (!portraitURL) {
            return;
        }

        const portraitContainer =
            document.querySelector(
                ".br-pm-avatar"
            );

        installPortrait(
            portraitContainer,
            portraitURL
        );
    }


    /* ---------------------------------------------------------
       11 // RESOLVE TRANSMISSION HISTORY
       --------------------------------------------------------- */

    async function resolveHistory() {

        const records =
            document.querySelectorAll(
                ".br-pm-history .post"
            );


        for (const record of records) {

            const nameElement =
                record.querySelector(
                    ".postprofile-name"
                );

            const portraitContainer =
                record.querySelector(
                    ".postprofile-avatar"
                );


            if (
                !nameElement ||
                !portraitContainer
            ) {

                continue;
            }


            const memberName =
                normalizeName(
                    nameElement.textContent
                );


            const profileURL =
                participants.get(
                    memberName
                );


            /*
             * If we cannot confidently identify the
             * member profile, preserve the original
             * Forumotion avatar.
             */
            if (!profileURL) {
                continue;
            }


            const portraitURL =
                await getTransmissionPortrait(
                    profileURL
                );


            /*
             * No custom portrait?
             *
             * Preserve normal avatar / black fallback.
             */
            if (!portraitURL) {
                continue;
            }


            installPortrait(
                portraitContainer,
                portraitURL
            );
        }
    }


    /* ---------------------------------------------------------
       12 // INITIALIZE TRANSMISSION NETWORK
       --------------------------------------------------------- */

    resolvePrimaryTransmission();
    resolveHistory();

});
