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
        profileLinkSelector:
            "a[href^='/u'], " +
            "a[href*='://bleachretro.rpg-board.net/u']",
        requestMarker: "_br_portrait",
        observerDelay: 40
    };

    /*
     * One Promise per member prevents duplicate requests
     * for the same public profile.
     */

    const portraitRequests = new Map();
    const memberProfiles = new Map();

    let observerTimer = 0;


    /* =====================================================
       01 // GENERAL UTILITIES
       ===================================================== */

    function normalizeName(value) {
        return (value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }


    function normalizeProfilePath(value) {
        if (!value) {
            return null;
        }

        try {
            const url = new URL(
                value,
                window.location.origin
            );

            const match = url.pathname.match(
                /^\/u(\d+)\/?$/i
            );

            if (
                !match ||
                url.origin !== window.location.origin
            ) {
                return null;
            }

            return "/u" + match[1];

        } catch (_error) {
            return null;
        }
    }


    function validImageURL(value) {
        if (!value) {
            return null;
        }

        const cleaned = String(value).trim();

        if (!/^https?:\/\//i.test(cleaned)) {
            return null;
        }

        try {
            const url = new URL(cleaned);

            return /^(https?:)$/i.test(url.protocol)
                ? url.href
                : null;

        } catch (_error) {
            return null;
        }
    }


    /* =====================================================
       02 // READ TRANSMISSION PORTRAIT FIELD
       ===================================================== */

    function fieldLabel(field) {
        const label =
            field.querySelector("dt span") ||
            field.querySelector("dt");

        return normalizeName(
            label
                ? label.textContent.replace(
                    /\s*:\s*$/,
                    ""
                )
                : ""
        );
    }


    function extractPortrait(profileDocument) {
        const fields = Array.from(
            profileDocument.querySelectorAll(
                '#profile-tab-field-profil dl, ' +
                'dl[id^="field_id"], ' +
                '[id^="field_id"]'
            )
        );

        let field = fields.find(function (candidate) {
            return (
                fieldLabel(candidate) ===
                CONFIG.fieldLabel
            );
        });


        /*
         * Fallback for legacy Forumotion profile markup.
         */

        if (!field) {
            const label = Array.from(
                profileDocument.querySelectorAll(
                    "dt span"
                )
            ).find(function (candidate) {
                return (
                    normalizeName(
                        candidate.textContent
                    ) === CONFIG.fieldLabel
                );
            });

            field = label
                ? label.closest("dl")
                : null;
        }


        if (!field) {
            return null;
        }


        const value = field.querySelector("dd");

        if (!value) {
            return null;
        }


        const publicValue =
            value.querySelector(".field_uneditable") ||
            value;

        const linkedValue =
            publicValue.querySelector("a[href]");

        const imageValue =
            publicValue.querySelector("img[src]");


        let portraitURL = validImageURL(
            (
                linkedValue &&
                linkedValue.getAttribute("href")
            ) ||
            (
                imageValue &&
                imageValue.getAttribute("src")
            ) ||
            publicValue.textContent
        );


        if (portraitURL) {
            return portraitURL;
        }


        /*
         * Forumotion may keep the real value inside its
         * editable field representation.
         */

        const editableInput = value.querySelector(
            ".field_editable input[type='text'], " +
            "input[type='text']"
        );


        portraitURL = validImageURL(
            editableInput
                ? (
                    editableInput.value ||
                    editableInput.getAttribute("value")
                )
                : ""
        );


        return portraitURL;
    }


    /* =====================================================
       03 // PROFILE REQUESTS
       ===================================================== */

    function requestURL(profilePath) {
        const separator = profilePath.includes("?")
            ? "&"
            : "?";

        return (
            profilePath +
            separator +
            CONFIG.requestMarker +
            "=" +
            Date.now()
        );
    }


    function resolvePortrait(profilePath) {
        if (portraitRequests.has(profilePath)) {
            return portraitRequests.get(profilePath);
        }


        const request = fetch(
            requestURL(profilePath),
            {
                credentials: "same-origin",
                cache: "no-store"
            }
        )
            .then(function (response) {
                if (!response.ok) {
                    throw new Error(
                        "Profile request failed: " +
                        response.status
                    );
                }

                return response.text();
            })
            .then(function (html) {
                const profileDocument =
                    new DOMParser().parseFromString(
                        html,
                        "text/html"
                    );

                return extractPortrait(
                    profileDocument
                );
            })
            .catch(function (error) {
                console.warn(
                    "RETRIBUTION // " +
                    "Transmission Portrait unavailable:",
                    profilePath,
                    error
                );

                return null;
            });


        portraitRequests.set(
            profilePath,
            request
        );


        return request;
    }


    /* =====================================================
       04 // MEMBER IDENTITY REGISTRY
       ===================================================== */

    function rememberMember(
        name,
        profilePath
    ) {
        const normalizedName =
            normalizeName(name);

        const normalizedPath =
            normalizeProfilePath(profilePath);


        if (
            normalizedName &&
            normalizedPath
        ) {
            memberProfiles.set(
                normalizedName,
                normalizedPath
            );
        }
    }


    function buildMemberRegistry() {
        /*
         * Forumotion exposes the logged-in member through
         * window._userdata.
         */

        const userID = Number(
            window._userdata &&
            window._userdata.user_id
        );

        const userName =
            window._userdata &&
            window._userdata.username;


        if (
            Number.isInteger(userID) &&
            userID > 0 &&
            userName
        ) {
            rememberMember(
                userName,
                "/u" + userID
            );
        }


        /*
         * Learn every reliable visible username/profile
         * pairing currently available on the page.
         */

        document
            .querySelectorAll(
                CONFIG.profileLinkSelector
            )
            .forEach(function (link) {
                const profilePath =
                    normalizeProfilePath(
                        link.getAttribute("href")
                    );

                if (!profilePath) {
                    return;
                }


                rememberMember(
                    link.textContent,
                    profilePath
                );


                const owner = link.closest(
                    ".br-pm-message, " +
                    ".br-pm-history .post, " +
                    ".postprofile"
                );


                const name =
                    owner &&
                    owner.querySelector(
                        CONFIG.nameSelector
                    );


                if (name) {
                    rememberMember(
                        name.textContent,
                        profilePath
                    );
                }
            });
    }


    function profileForRecord(
        record,
        memberName
    ) {
        /*
         * A profile link located inside the same record is
         * the strongest available identity source.
         */

        const localLink =
            record.querySelector(
                CONFIG.profileLinkSelector
            );


        const localPath = localLink
            ? normalizeProfilePath(
                localLink.getAttribute("href")
            )
            : null;


        if (localPath) {
            rememberMember(
                memberName,
                localPath
            );

            return localPath;
        }


        return (
            memberProfiles.get(
                normalizeName(memberName)
            ) ||
            null
        );
    }


    /* =====================================================
       05 // INSTALL TRANSMISSION PORTRAIT
       ===================================================== */

    function installPortrait(
        container,
        profilePath,
        portraitURL
    ) {
        if (
            !container ||
            !portraitURL
        ) {
            return;
        }


        /*
         * Never reinstall the same successfully resolved
         * portrait.
         */

        if (
            container.dataset.brPortraitState ===
                "loaded" &&
            container.dataset.brPortraitProfile ===
                profilePath
        ) {
            return;
        }


        const existingImage =
            container.querySelector("img");


        const nativeSource =
            existingImage
                ? (
                    existingImage.currentSrc ||
                    existingImage.src
                )
                : "";


        /*
         * Preload before replacing the native Forumotion
         * avatar.
         */

        const image = new Image();

        image.alt =
            "Transmission Portrait";

        image.className =
            "br-transmission-portrait";


        image.onload = function () {
            container.replaceChildren(image);

            container.dataset.brPortraitState =
                "loaded";

            container.dataset.brPortraitProfile =
                profilePath;

            container.classList.add(
                "br-pm-custom-portrait",
                "br-portrait-loaded"
            );

            container.classList.remove(
                "br-portrait-fallback"
            );
        };


        /*
         * The native avatar has not been removed yet.
         * Therefore a failed custom image leaves the
         * original avatar visible.
         */

        image.onerror = function () {
            container.dataset.brPortraitState =
                "fallback";

            container.classList.add(
                "br-portrait-fallback"
            );


            if (
                nativeSource &&
                existingImage &&
                !existingImage.getAttribute("src")
            ) {
                existingImage.src =
                    nativeSource;
            }
        };


        image.src =
            portraitURL;
    }


    /* =====================================================
       06 // PROCESS PRIVATE MESSAGE RECORD
       ===================================================== */

    async function processRecord(record) {
        const portraitContainer =
            record.querySelector(
                CONFIG.portraitSelector
            );

        const nameElement =
            record.querySelector(
                CONFIG.nameSelector
            );


        if (
            !portraitContainer ||
            !nameElement
        ) {
            return;
        }


        const memberName =
            nameElement.textContent;


        const profilePath =
            profileForRecord(
                record,
                memberName
            );


        if (!profilePath) {
            return;
        }


        /*
         * Prevent repeated requests and MutationObserver
         * loops.
         */

        if (
            portraitContainer.dataset
                .brPortraitProfile ===
                profilePath &&
            /^(loading|loaded|fallback)$/.test(
                portraitContainer.dataset
                    .brPortraitState ||
                ""
            )
        ) {
            return;
        }


        portraitContainer.dataset
            .brPortraitProfile =
            profilePath;

        portraitContainer.dataset
            .brPortraitState =
            "loading";


        const portraitURL =
            await resolvePortrait(
                profilePath
            );


        if (!portraitURL) {
            portraitContainer.dataset
                .brPortraitState =
                "fallback";

            portraitContainer.classList.add(
                "br-portrait-fallback"
            );

            return;
        }


        installPortrait(
            portraitContainer,
            profilePath,
            portraitURL
        );
    }


    /* =====================================================
       07 // PROCESS ALL TRANSMISSIONS
       ===================================================== */

    function processTransmissions() {
        buildMemberRegistry();


        document
            .querySelectorAll(
                CONFIG.recordSelector
            )
            .forEach(function (record) {
                processRecord(record);
            });
    }


    function scheduleProcessing() {
        window.clearTimeout(
            observerTimer
        );


        observerTimer =
            window.setTimeout(
                processTransmissions,
                CONFIG.observerDelay
            );
    }


    /* =====================================================
       08 // INITIALIZE PRIVATE TRANSMISSION NETWORK
       ===================================================== */

    function initialize() {
        /*
         * This file must remain inactive outside the
         * private-message reader.
         */

        if (
            !document.querySelector(
                CONFIG.readerSelector
            )
        ) {
            return;
        }


        processTransmissions();


        /*
         * Transmission History may be generated after
         * DOMContentLoaded. Observe it for new records.
         */

        const observerRoot =
            document.querySelector(
                CONFIG.historySelector
            ) ||
            document.querySelector(
                "#main-content"
            ) ||
            document.body;


        const observer =
            new MutationObserver(
                function (mutations) {
                    const containsNewElements =
                        mutations.some(
                            function (mutation) {
                                return Array.from(
                                    mutation.addedNodes
                                ).some(
                                    function (node) {
                                        return (
                                            node.nodeType ===
                                            Node.ELEMENT_NODE
                                        );
                                    }
                                );
                            }
                        );


                    if (containsNewElements) {
                        scheduleProcessing();
                    }
                }
            );


        observer.observe(
            observerRoot,
            {
                childList: true,
                subtree: true
            }
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );
    } else {
        initialize();
    }
})();
