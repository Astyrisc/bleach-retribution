/* =========================================================
   BLEACH // RETRIBUTION
   PRIVATE TRANSMISSION NETWORK
   TRANSMISSION PORTRAIT RESOLVER
   VERSION 1.2
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    /* ---------------------------------------------------------
       01 // PM READER ONLY
       --------------------------------------------------------- */

    if (!document.querySelector(".br-pm-message")) {
        return;
    }


    /* ---------------------------------------------------------
       02 // SYSTEM STATE
       --------------------------------------------------------- */

    const portraitCache = new Map();


    /* ---------------------------------------------------------
       03 // UTILITIES
       --------------------------------------------------------- */

    function normalizeName(value) {

        return (value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }


    function isValidURL(value) {

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
       04 // READ TRANSMISSION PORTRAIT FROM PROFILE
       --------------------------------------------------------- */

    async function getTransmissionPortrait(profileURL) {

        if (!profileURL) {
            return null;
        }


        /* Use cached result when available. */

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

            const profileDocument =
                new DOMParser().parseFromString(
                    html,
                    "text/html"
                );


            /*
             * Forumotion renders custom profile records as
             * definition lists.
             *
             * We identify the record by its visible label
             * rather than depending on an internal field ID.
             */

            const records =
                Array.from(
                    profileDocument.querySelectorAll("dl")
                );


            const portraitRecord =
                records.find(function (record) {

                    const label =
                        record.querySelector("dt");

                    return (
                        label &&
                        normalizeName(label.textContent) ===
                        "transmission portrait"
                    );
                });


            if (!portraitRecord) {

                portraitCache.set(
                    profileURL,
                    null
                );

                return null;
            }


            /*
             * First preference:
             * the public, uneditable field value.
             */

            const publicValue =
                portraitRecord.querySelector(
                    "dd .field_uneditable"
                );


            let portraitURL =
                publicValue
                    ? publicValue.textContent.trim()
                    : "";


            /*
             * Secondary fallback:
             * Forumotion's hidden editable input.
             */

            if (!isValidURL(portraitURL)) {

                const editableInput =
                    portraitRecord.querySelector(
                        "dd input[type='text']"
                    );


                portraitURL =
                    editableInput
                        ? (
                            editableInput.value ||
                            editableInput.getAttribute("value") ||
                            ""
                        ).trim()
                        : "";
            }


            if (!isValidURL(portraitURL)) {

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
       05 // INSTALL PORTRAIT
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
         * Do not remove the normal Forumotion avatar until
         * the Transmission Portrait has successfully loaded.
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
                "RETRIBUTION // Transmission Portrait image failed:",
                portraitURL
            );
        };


        image.src = portraitURL;
    }


    /* ---------------------------------------------------------
       06 // CURRENT MESSAGE SENDER
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


    const senderProfileLink =
        document.querySelector(
            ".br-pm-contact a[href^='/u']"
        );


    const senderProfileURL =
        senderProfileLink
            ? senderProfileLink.getAttribute("href")
            : null;


    /* ---------------------------------------------------------
       07 // OTHER CONVERSATION PARTICIPANT
       --------------------------------------------------------- */

    const historyNameElements =
        Array.from(
            document.querySelectorAll(
                ".br-pm-history .postprofile-name"
            )
        );


    let selfName = "";


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
       08 // MATCH PARTICIPANT TO PROFILE LINK
       --------------------------------------------------------- */

    const profileLinks =
        Array.from(
            document.querySelectorAll(
                "a[href^='/u']"
            )
        );


    function findProfileURLByName(memberName) {

        if (!memberName) {
            return null;
        }


        const match =
            profileLinks.find(function (link) {

                return (
                    normalizeName(link.textContent) ===
                    memberName
                );
            });


        return match
            ? match.getAttribute("href")
            : null;
    }


    const selfProfileURL =
        findProfileURLByName(
            selfName
        );


    /* ---------------------------------------------------------
       09 // PARTICIPANT REGISTRY
       --------------------------------------------------------- */

    const participants =
        new Map();


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
       10 // CURRENT TRANSMISSION
       --------------------------------------------------------- */

    async function resolveCurrentTransmission() {

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


        installPortrait(
            document.querySelector(
                ".br-pm-avatar"
            ),
            portraitURL
        );
    }


    /* ---------------------------------------------------------
       11 // TRANSMISSION HISTORY
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


            if (!profileURL) {
                continue;
            }


            const portraitURL =
                await getTransmissionPortrait(
                    profileURL
                );


            /*
             * No Transmission Portrait:
             *
             * Preserve the normal avatar or black
             * fallback already supplied by Forumotion.
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
       12 // INITIALIZE
       --------------------------------------------------------- */

    resolveCurrentTransmission();
    resolveHistory();

});
