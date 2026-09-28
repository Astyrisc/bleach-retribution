/*
 * BLEACH: Retribution — Transmission Portrait Resolver
 * Stage 4: Forum index and portal login portraits
 *
 * Appearance remains CSS-owned. This script only resolves member data,
 * replaces eligible image sources, and exposes state classes.
 */
(function () {
    "use strict";

    const CONFIG = {
        fieldLabel: "transmission portrait",

        rowSelector: ".lastpost",
        avatarSelector: ".lastpost-avatar img",
        profileSelector: 'a[href^="/u"]',

        portalAvatarSelector:
            ".mod-login-avatar img",

        cachePrefix:
            "br-transmission-portrait:v1:",

        cacheLifetime:
            24 * 60 * 60 * 1000,

        maxConcurrentRequests: 4
    };

    const resolvedProfiles = new Map();

    function normalizeProfilePath(value) {
        try {
            const url = new URL(
                value,
                window.location.origin
            );

            const match = url.pathname.match(
                /^\/u(\d+)\/?$/i
            );

            return (
                match &&
                url.origin === window.location.origin
            )
                ? "/u" + match[1]
                : null;
        } catch (_error) {
            return null;
        }
    }

    function validateImageUrl(value) {
        if (!value) return null;

        try {
            const url = new URL(
                value.trim(),
                window.location.href
            );

            return /^(https?:)$/i.test(url.protocol)
                ? url.href
                : null;
        } catch (_error) {
            return null;
        }
    }

    function readCache(profilePath) {
        try {
            const raw = sessionStorage.getItem(
                CONFIG.cachePrefix + profilePath
            );

            if (!raw) return undefined;

            const entry = JSON.parse(raw);

            if (
                !entry ||
                Date.now() - entry.savedAt >
                    CONFIG.cacheLifetime
            ) {
                sessionStorage.removeItem(
                    CONFIG.cachePrefix + profilePath
                );

                return undefined;
            }

            return entry.url || null;
        } catch (_error) {
            return undefined;
        }
    }

    function writeCache(profilePath, url) {
        try {
            sessionStorage.setItem(
                CONFIG.cachePrefix + profilePath,
                JSON.stringify({
                    url: url || null,
                    savedAt: Date.now()
                })
            );
        } catch (_error) {
            /*
             * Storage may be disabled.
             * The in-memory map still prevents repeats.
             */
        }
    }

    function extractPortrait(documentNode) {
        const fields =
            documentNode.querySelectorAll(
                '#profile-tab-field-profil dl, [id^="field_id"]'
            );

        for (const field of fields) {
            const labelNode =
                field.querySelector("dt");

            const label = labelNode
                ? labelNode.textContent
                    .replace(/\s*:\s*$/, "")
                    .trim()
                    .toLowerCase()
                : "";

            if (label !== CONFIG.fieldLabel) {
                continue;
            }

            const valueNode =
                field.querySelector(
                    "dd .field_uneditable"
                ) ||
                field.querySelector("dd");

            if (!valueNode) return null;

            const linkedValue =
                valueNode.querySelector("a[href]");

            const imageValue =
                valueNode.querySelector("img[src]");

            const rawValue =
                linkedValue?.getAttribute("href") ||
                imageValue?.getAttribute("src") ||
                valueNode.textContent;

            return validateImageUrl(rawValue);
        }

        return null;
    }

    async function resolvePortrait(profilePath) {
        if (resolvedProfiles.has(profilePath)) {
            return resolvedProfiles.get(
                profilePath
            );
        }

        const cached = readCache(profilePath);

        if (cached !== undefined) {
            const cachedPromise =
                Promise.resolve(cached);

            resolvedProfiles.set(
                profilePath,
                cachedPromise
            );

            return cachedPromise;
        }

        const request = fetch(profilePath, {
            credentials: "same-origin",

            headers: {
                "X-Requested-With":
                    "XMLHttpRequest"
            }
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error(
                        "Profile request failed"
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

                const portraitUrl =
                    extractPortrait(
                        profileDocument
                    );

                writeCache(
                    profilePath,
                    portraitUrl
                );

                return portraitUrl;
            })
            .catch(function () {
                return null;
            });

        resolvedProfiles.set(
            profilePath,
            request
        );

        return request;
    }

    function collectTargets() {
        const groups = new Map();

        function addTarget(
            profilePath,
            image,
            owner
        ) {
            if (
                !profilePath ||
                !image ||
                !owner
            ) {
                return;
            }

            if (!groups.has(profilePath)) {
                groups.set(
                    profilePath,
                    []
                );
            }

            groups
                .get(profilePath)
                .push({
                    image: image,
                    owner: owner
                });
        }

        /*
         * Forum-index last-post portraits
         */
        document
            .querySelectorAll(
                CONFIG.rowSelector
            )
            .forEach(function (row) {
                const image =
                    row.querySelector(
                        CONFIG.avatarSelector
                    );

                const profileLink =
                    row.querySelector(
                        CONFIG.profileSelector
                    );

                if (
                    !image ||
                    !profileLink
                ) {
                    return;
                }

                const profilePath =
                    normalizeProfilePath(
                        profileLink.getAttribute(
                            "href"
                        )
                    );

                if (!profilePath) return;

                addTarget(
                    profilePath,
                    image,
                    row
                );
            });

        /*
         * Portal login-widget portrait
         */
        const portalImage =
            document.querySelector(
                CONFIG.portalAvatarSelector
            );

        const portalOwner =
            portalImage?.closest(
                ".mod-login"
            ) ||
            portalImage?.parentElement;

        const userId =
            Number(
                window._userdata?.user_id
            );

        if (
            portalImage &&
            portalOwner &&
            Number.isInteger(userId) &&
            userId > 0
        ) {
            addTarget(
                "/u" + userId,
                portalImage,
                portalOwner
            );
        }

        return Array.from(
            groups.entries()
        );
    }

    function applyPortrait(
        target,
        portraitUrl
    ) {
        if (!portraitUrl) {
            target.owner.classList.add(
                "br-portrait-fallback"
            );

            return;
        }

        target.image.addEventListener(
            "error",
            function restoreNativeAvatar() {
                const nativeSource =
                    target.image.dataset
                        .brNativeSrc;

                if (nativeSource) {
                    target.image.src =
                        nativeSource;
                }

                target.owner.classList.remove(
                    "br-portrait-loaded"
                );

                target.owner.classList.add(
                    "br-portrait-fallback"
                );
            },
            { once: true }
        );

        target.image.dataset.brNativeSrc =
            target.image.currentSrc ||
            target.image.src;

        target.image.src =
            portraitUrl;

        target.owner.classList.remove(
            "br-portrait-fallback"
        );

        target.owner.classList.add(
            "br-portrait-loaded"
        );
    }

    async function processTargets() {
        const queue = collectTargets();

        async function worker() {
            while (queue.length) {
                const entry =
                    queue.shift();

                const profilePath =
                    entry[0];

                const targets =
                    entry[1];

                const portraitUrl =
                    await resolvePortrait(
                        profilePath
                    );

                targets.forEach(
                    function (target) {
                        applyPortrait(
                            target,
                            portraitUrl
                        );
                    }
                );
            }
        }

        const workerCount = Math.min(
            CONFIG.maxConcurrentRequests,
            queue.length
        );

        await Promise.all(
            Array.from(
                {
                    length: workerCount
                },
                worker
            )
        );
    }

    function initialize() {
        const hasForumTargets =
            document.querySelector(
                CONFIG.rowSelector
            );

        const hasPortalTarget =
            document.querySelector(
                CONFIG.portalAvatarSelector
            );

        if (
            !hasForumTargets &&
            !hasPortalTarget
        ) {
            return;
        }

        processTargets();
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            { once: true }
        );
    } else {
        initialize();
    }
})();
