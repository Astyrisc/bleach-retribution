/*
 * BLEACH: Retribution — Interaction Layer
 * TYBW Getsuga click feedback and numbered-row activation.
 *
 * This file owns behavior only. Appearance remains in retribution-v2.css.
 */
(function () {
    "use strict";

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const ROW_SELECTOR =
        "#main-content .br-category .topiclist.forums li.row, .br-topic-row";

    const EFFECT_LIFETIME = 560;
    const ROW_ACTIVE_LIFETIME = 440;
    const activeRows = new WeakMap();

    function activateNumberedRow(target) {
        const row = target.closest(ROW_SELECTOR);
        if (!row) return;

        const previousTimer = activeRows.get(row);
        if (previousTimer) window.clearTimeout(previousTimer);

        row.classList.remove("br-row-activated");
        void row.offsetWidth;
        row.classList.add("br-row-activated");

        const timer = window.setTimeout(function () {
            row.classList.remove("br-row-activated");
            activeRows.delete(row);
        }, ROW_ACTIVE_LIFETIME);

        activeRows.set(row, timer);
    }

    function createGetsugaMark(x, y, isInteractive) {
        const mark = document.createElement("span");
        const diamond = document.createElement("span");
        const fragment = document.createDocumentFragment();

        mark.className = "br-reiatsu-mark";
        mark.setAttribute("aria-hidden", "true");

        diamond.className = "br-reiatsu-mark__diamond";
        mark.appendChild(diamond);

        for (let index = 0; index < 4; index += 1) {
            const shard = document.createElement("span");
            shard.className =
                "br-reiatsu-mark__shard br-reiatsu-mark__shard--" +
                (index + 1);
            fragment.appendChild(shard);
        }

        mark.appendChild(fragment);

        if (isInteractive) {
            mark.classList.add("br-reiatsu-mark--strong");
        }

        mark.style.left = x + "px";
        mark.style.top = y + "px";
        document.body.appendChild(mark);

        window.setTimeout(function () {
            mark.remove();
        }, EFFECT_LIFETIME);
    }

    function isInteractiveTarget(target) {
        return Boolean(
            target.closest(
                "a, button, input, select, textarea, summary, label, [role='button']"
            )
        );
    }

    function handlePointerDown(event) {
        if (event.button !== 0 || reducedMotion.matches) return;
        if (!(event.target instanceof Element)) return;

        createGetsugaMark(
            event.clientX,
            event.clientY,
            isInteractiveTarget(event.target)
        );

        activateNumberedRow(event.target);
    }

    document.addEventListener("pointerdown", handlePointerDown, {
        passive: true
    });
})();
