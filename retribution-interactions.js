/*
 * BLEACH: Retribution — Interaction Layer
 * TYBW Getsuga click feedback and numbered-row activation.
 */
(function () {
    "use strict";

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const ROW_SELECTOR =
        "#main-content .br-category .topiclist.forums li.row, .br-topic-row";

    const activeRows = new WeakMap();

    function activateNumberedRow(target) {
        const row = target.closest(ROW_SELECTOR);
        if (!row) return;

        const previousTimer = activeRows.get(row);

        if (previousTimer) {
            window.clearTimeout(previousTimer);
        }

        row.classList.remove("br-row-activated");

        /* Restart the animation on repeated clicks. */
        void row.offsetWidth;

        row.classList.add("br-row-activated");

        const timer = window.setTimeout(function () {
            row.classList.remove("br-row-activated");
            activeRows.delete(row);
        }, 440);

        activeRows.set(row, timer);
    }

    function createGetsugaMark(x, y, isInteractive) {
        const mark = document.createElement("span");

        mark.className = "br-reiatsu-mark";
        mark.setAttribute("aria-hidden", "true");

        if (isInteractive) {
            mark.classList.add("br-reiatsu-mark--strong");
        }

        mark.style.left = x + "px";
        mark.style.top = y + "px";

        document.body.appendChild(mark);

        window.setTimeout(function () {
            mark.remove();
        }, 520);
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
