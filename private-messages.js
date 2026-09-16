/* =========================================================
   BLEACH // RETRIBUTION
   PRIVATE TRANSMISSION NETWORK

   TRANSMISSION PORTRAIT RESOLVER
   VERSION 1.3

   PURPOSE:
   - Resolve participants in a private-message conversation.
   - Fetch each participant's public Forumotion profile.
   - Locate the custom "Transmission Portrait" field.
   - Load that member's dedicated transmission artwork.
   - Preserve the normal Forumotion avatar/fallback if
     anything cannot be resolved.

   VERIFIED FORUMOTION BEHAVIOR:
   - Current sender profile URL exists in PM contact rail.
   - Other participant can be identified from PM history.
   - Public profile contains "Transmission Portrait".
   - Label is rendered inside a DT.
   - Associated value is rendered in the following DD.
   ========================================================= */


document.addEventListener("DOMContentLoaded", function () {


    /* =====================================================
       01 // ACTIVATE ONLY ON PRIVATE TRANSMISSION READER
       ===================================================== */

    const transmissionReader =
        document.querySelector(".br-pm-message");


    if (!transmissionReader) {
        return;
    }



    /* =====================================================
       02 // SYSTEM STATE
       ===================================================== */

    const portraitCache = new Map();



    /* =====================================================
       03 // UTILITIES
       ===================================================== */

    function normalizeName(value) {

        return (value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }



    function isValidImageURL(value) {

    if (!value) {
        return false;
    }


    const cleanedValue =
        value.trim();


    /*
     * Transmission Portraits must be explicit
     * absolute HTTP(S) URLs.
     *
     * This intentionally rejects Forumotion
     * placeholders such as "-" and prevents
     * relative paths from being interpreted
     * against the forum origin.
     */

    if (
        !/^https?:\/\//i.test(cleanedValue)
    ) {

        return false;
    }


    try {

        const url =
            new URL(cleanedValue);


        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );

    } catch (error) {

        return false;
    }
}



    /* =====================================================
       04 // FETCH TRANSMISSION PORTRAIT
       ===================================================== */

    async function getTransmissionPortrait(profileURL) {


        if (!profileURL) {
            return null;
        }


        /*
         * If this member has already been resolved during
         * this page load, use the cached result.
         */

        if (portraitCache.has(profileURL)) {

            return portraitCache.get(
                profileURL
            );
        }


        try {


            /* ---------------------------------------------
               FETCH MEMBER PROFILE
               --------------------------------------------- */

            const response =
    await fetch(
        profileURL,
        {
            credentials: "same-origin",
            cache: "no-store"
        }
    );



            /* ---------------------------------------------
               PARSE PROFILE HTML
               --------------------------------------------- */

            const html =
                await response.text();


            const profileDocument =
                new DOMParser().parseFromString(
                    html,
                    "text/html"
                );



            /* ---------------------------------------------
               LOCATE TRANSMISSION PORTRAIT LABEL

               IMPORTANT:

               We intentionally DO NOT depend on Forumotion
               field IDs such as field_id13.

               Our diagnostics proved that Forumotion uses
               different markup between editable and public
               profile contexts.

               Instead we locate the actual visible label:
               "Transmission Portrait"
               --------------------------------------------- */

            const portraitLabel =
                Array.from(
                    profileDocument.querySelectorAll(
                        "span"
                    )
                ).find(function (element) {

                    return (
                        normalizeName(
                            element.textContent
                        ) ===
                        "transmission portrait"
                    );
                });



            if (!portraitLabel) {

                portraitCache.set(
                    profileURL,
                    null
                );

                return null;
            }



            /* ---------------------------------------------
               LOCATE ASSOCIATED VALUE

               Verified structure:

               <dt>
                   <span>
                       Transmission Portrait
                   </span>
               </dt>

               <dd>
                   ...
               </dd>
               --------------------------------------------- */

            const labelDT =
                portraitLabel.closest("dt");


            if (!labelDT) {

                portraitCache.set(
                    profileURL,
                    null
                );

                return null;
            }



            const valueDD =
                labelDT.nextElementSibling;


            if (
                !valueDD ||
                valueDD.tagName.toLowerCase() !== "dd"
            ) {

                portraitCache.set(
                    profileURL,
                    null
                );

                return null;
            }



            /* ---------------------------------------------
               READ PUBLIC FIELD VALUE
               --------------------------------------------- */

            const publicValue =
    valueDD.querySelector(
        ".field_uneditable"
    );


console.log(
    "RETRIBUTION // PROFILE FIELD DEBUG",
    {
        profileURL: profileURL,

        label: portraitLabel
            ? portraitLabel.textContent.trim()
            : null,

        dt: labelDT
            ? labelDT.outerHTML
            : null,

        dd: valueDD
            ? valueDD.outerHTML
            : null,

        publicValue: publicValue
            ? publicValue.textContent.trim()
            : null
    }
);


let portraitURL =
    publicValue
        ? publicValue.textContent.trim()
        : "";

            /* ---------------------------------------------
               FALLBACK TO EDITABLE INPUT

               Forumotion may also provide a hidden editable
               representation of the same field.

               We use it only when the public value is not a
               usable URL.
               --------------------------------------------- */

            if (!isValidImageURL(portraitURL)) {


                const editableInput =
                    valueDD.querySelector(
                        "input[type='text']"
                    );


                portraitURL =
                    editableInput
                        ? (
                            editableInput.value ||
                            editableInput.getAttribute(
                                "value"
                            ) ||
                            ""
                        ).trim()
                        : "";
            }



            /* ---------------------------------------------
               VALIDATE RESULT
               --------------------------------------------- */

            if (!isValidImageURL(portraitURL)) {

                portraitCache.set(
                    profileURL,
                    null
                );

                return null;
            }



            /* ---------------------------------------------
               CACHE SUCCESS
               --------------------------------------------- */

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



    /* =====================================================
   05 // INSTALL TRANSMISSION PORTRAIT
   ===================================================== */

function installPortrait(
    container,
    portraitURL
) {

    console.log(
        "RETRIBUTION // INSTALL PORTRAIT DEBUG",
        {
            container: container,
            portraitURL: portraitURL
        }
    );


    if (
        !container ||
        !portraitURL
    ) {

        return;
    }


    const image =
        new Image();


        /*
         * IMPORTANT:
         *
         * Never remove the Forumotion avatar until the
         * dedicated Transmission Portrait has successfully
         * loaded.
         *
         * This guarantees graceful fallback.
         */

        image.onload = function () {


            container.innerHTML = "";


            image.alt =
                "Transmission Portrait";


            image.className =
                "br-transmission-portrait";


            container.appendChild(
                image
            );


            container.classList.add(
                "br-pm-custom-portrait"
            );
        };



        /*
         * Failed custom image?
         *
         * Do nothing.
         *
         * Existing avatar or black fallback remains.
         */

        image.onerror = function () {


            console.warn(
                "RETRIBUTION // Transmission Portrait image failed:",
                portraitURL
            );
        };



        image.src =
            portraitURL;
    }



    /* =====================================================
       06 // IDENTIFY CURRENT MESSAGE SENDER
       ===================================================== */

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
     * The current message contact rail contains the
     * sender's direct Forumotion profile link.
     */

    const senderProfileLink =
        document.querySelector(
            ".br-pm-contact a[href^='/u']"
        );


    const senderProfileURL =
        senderProfileLink
            ? senderProfileLink.getAttribute(
                "href"
            )
            : null;



    /* =====================================================
       07 // IDENTIFY OTHER PARTICIPANT
       ===================================================== */

    const historyNameElements =
        Array.from(
            document.querySelectorAll(
                ".br-pm-history .postprofile-name"
            )
        );


    let selfName = "";



    /*
     * Forumotion PM conversations are one-to-one.
     *
     * Therefore the first history username that differs
     * from the current sender identifies the other
     * participant.
     */

    for (
        const element
        of historyNameElements
    ) {


        const candidate =
            normalizeName(
                element.textContent
            );


        if (
            candidate &&
            candidate !== senderName
        ) {


            selfName =
                candidate;


            break;
        }
    }



    /* =====================================================
       08 // RESOLVE PROFILE URL BY USERNAME
       ===================================================== */

    const profileLinks =
        Array.from(
            document.querySelectorAll(
                "a[href^='/u']"
            )
        );



    function findProfileURLByName(
        memberName
    ) {


        if (!memberName) {
            return null;
        }



        /*
         * IMPORTANT:
         *
         * This page contains many /u# links because
         * Retribution's widgets also list members.
         *
         * Therefore we NEVER use the first /u# link.
         *
         * We match the link's visible username instead.
         */

        const match =
            profileLinks.find(
                function (link) {


                    return (
                        normalizeName(
                            link.textContent
                        ) ===
                        memberName
                    );
                }
            );



        return match
            ? match.getAttribute("href")
            : null;
    }



    const selfProfileURL =
        findProfileURLByName(
            selfName
        );



    /* =====================================================
       09 // PARTICIPANT REGISTRY
       ===================================================== */

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



    /* =====================================================
       10 // RESOLVE CURRENT TRANSMISSION
       ===================================================== */

    async function resolveCurrentTransmission() {


        if (!senderProfileURL) {
            return;
        }



        const portraitURL =
            await getTransmissionPortrait(
                senderProfileURL
            );



        /*
         * Sender has no Transmission Portrait.
         *
         * Preserve Forumotion avatar / black fallback.
         */

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



    /* =====================================================
       11 // RESOLVE TRANSMISSION HISTORY
       ===================================================== */

    async function resolveHistory() {


        const records =
            document.querySelectorAll(
                ".br-pm-history .post"
            );



        for (
            const record
            of records
        ) {


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
             * Unknown participant?
             *
             * Preserve existing Forumotion portrait.
             */

            if (!profileURL) {
                continue;
            }



            const portraitURL =
                await getTransmissionPortrait(
                    profileURL
                );



            /*
             * Member has no custom Transmission Portrait?
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



    /* =====================================================
       12 // INITIALIZE PRIVATE TRANSMISSION NETWORK
       ===================================================== */

    resolveCurrentTransmission();

    resolveHistory();


});
