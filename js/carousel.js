export function initCarousel(carousel) {
    const nextButton = document.querySelector("#next");
    const prevButton = document.querySelector("#prev");
    const backButton = document.querySelector("#back");
    const seeMoreButtons = carousel.querySelectorAll(".seeMore");
    const listHTML = carousel.querySelector(".list");

    let isAnimating = false;
    const originalItems = [...listHTML.children];
    const displayOrder = [...originalItems.slice(1), originalItems[0]];
    const padNumber = (number) => String(number).padStart(2, "0");

    // The second item is the visible product in the carousel's CSS layout.
    const activeItem = () => listHTML.children[1];

    const syncControls = () => {
        const showingDetails = carousel.classList.contains("showDetail");
        const position = displayOrder.indexOf(activeItem()) + 1;
        document.querySelector("#slide-current").textContent = padNumber(position);
        document.querySelector("#slide-total").textContent = padNumber(displayOrder.length);
        const announcement = `${activeItem().querySelector(".topic").textContent}, product ${position} of ${displayOrder.length}.`;
        const status = document.querySelector("#slide-status");
        if (status.textContent !== announcement) status.textContent = announcement;

        [nextButton, prevButton].forEach((button) => {
            button.disabled = showingDetails;
            // Keep keyboard focus on the arrows while a slide is animating.
            button.setAttribute("aria-disabled", String(isAnimating || showingDetails));
        });
        backButton.hidden = !showingDetails;
        backButton.disabled = !showingDetails;

        Array.from(listHTML.children).forEach((item) => {
            const isActive = item === activeItem();
            const intro = item.querySelector(".intro");
            const detail = item.querySelector(".detail");
            const seeMore = item.querySelector(".seeMore");

            item.setAttribute(
                "aria-label",
                `${item.querySelector(".topic").textContent}, ${displayOrder.indexOf(item) + 1} of ${displayOrder.length}`,
            );
            item.inert = !isActive;
            item.setAttribute("aria-hidden", String(!isActive));
            intro.inert = !isActive || showingDetails;
            intro.setAttribute("aria-hidden", String(intro.inert));
            detail.inert = !isActive || !showingDetails;
            detail.setAttribute("aria-hidden", String(detail.inert));
            seeMore.disabled = !isActive || isAnimating || showingDetails;
            seeMore.setAttribute("aria-expanded", String(isActive && showingDetails));
        });
    };

    const showSlider = (direction) => {
        if (isAnimating || carousel.classList.contains("showDetail")) return;

        isAnimating = true;
        if (listHTML.contains(document.activeElement)) {
            (direction === "next" ? nextButton : prevButton).focus();
        }

        carousel.classList.remove("prev", "next");
        if (direction === "next") {
            listHTML.appendChild(listHTML.firstElementChild);
        } else {
            listHTML.prepend(listHTML.lastElementChild);
        }

        // Restart animations even when the same direction is used consecutively.
        void listHTML.offsetWidth;
        carousel.classList.add(direction);
        syncControls();

        const animations = activeItem().getAnimations({ subtree: true });
        // The CSS timeline is the source of truth, including reduced-motion changes.
        Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
            isAnimating = false;
            syncControls();
        });
    };

    nextButton.addEventListener("click", () => showSlider("next"));
    prevButton.addEventListener("click", () => showSlider("prev"));

    seeMoreButtons.forEach((button) => {
        const item = button.closest(".item");

        button.addEventListener("click", () => {
            if (isAnimating || item !== activeItem()) return;

            carousel.classList.add("showDetail");
            // Move focus before making the introduction inert.
            backButton.hidden = false;
            backButton.disabled = false;
            backButton.focus();
            syncControls();
        });
    });

    const closeDetails = () => {
        if (!carousel.classList.contains("showDetail")) return;

        carousel.classList.remove("showDetail");
        syncControls();
        activeItem().querySelector(".seeMore").focus();
    };

    backButton.addEventListener("click", closeDetails);
    carousel.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && carousel.classList.contains("showDetail")) {
            event.preventDefault();
            closeDetails();
        }
    });

    syncControls();

    // Horizontal swipes never take over vertical scrolling or product buttons.
    let swipeStart = null;
    carousel.addEventListener("pointerdown", (event) => {
        swipeStart = null;
        if (
            !event.isPrimary ||
            !["touch", "pen"].includes(event.pointerType) ||
            event.target.closest("button, a") ||
            carousel.classList.contains("showDetail")
        )
            return;
        swipeStart = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            time: performance.now(),
        };
    });
    carousel.addEventListener("pointercancel", () => {
        swipeStart = null;
    });
    carousel.addEventListener("pointerup", (event) => {
        if (!swipeStart || event.pointerId !== swipeStart.id) return;
        const deltaX = event.clientX - swipeStart.x;
        const deltaY = event.clientY - swipeStart.y;
        const elapsed = performance.now() - swipeStart.time;
        swipeStart = null;
        if (Math.abs(deltaX) >= 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4 && elapsed < 700) {
            showSlider(deltaX < 0 ? "next" : "prev");
        }
    });
    carousel.addEventListener("keydown", (event) => {
        if (
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            carousel.classList.contains("showDetail")
        )
            return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            showSlider(event.key === "ArrowRight" ? "next" : "prev");
        }
    });

    return { closeDetails };
}
