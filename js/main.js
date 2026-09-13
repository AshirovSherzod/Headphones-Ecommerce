const nextButton = document.querySelector("#next");
const prevButton = document.querySelector("#prev");
const backButton = document.querySelector("#back");
const seeMoreButtons = document.querySelectorAll(".seeMore");
const carousel = document.querySelector(".carousel");
const listHTML = carousel.querySelector(".list");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let isAnimating = false;

// The second item is the visible product in the carousel's CSS layout.
const activeItem = () => listHTML.children[1];

const syncControls = () => {
    const showingDetails = carousel.classList.contains("showDetail");

    [nextButton, prevButton].forEach(button => {
        button.disabled = showingDetails;
        // Keep keyboard focus on the arrows while a slide is animating.
        button.setAttribute("aria-disabled", String(isAnimating || showingDetails));
    });
    backButton.hidden = !showingDetails;
    backButton.disabled = !showingDetails;

    Array.from(listHTML.children).forEach(item => {
        const isActive = item === activeItem();
        const intro = item.querySelector(".intro");
        const detail = item.querySelector(".detail");
        const seeMore = item.querySelector(".seeMore");

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

const showSlider = direction => {
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

    window.setTimeout(() => {
        isAnimating = false;
        syncControls();
    }, reducedMotion.matches ? 0 : 2000);
};

nextButton.addEventListener("click", () => showSlider("next"));
prevButton.addEventListener("click", () => showSlider("prev"));

seeMoreButtons.forEach((button, index) => {
    const item = button.closest(".item");
    const detail = item.querySelector(".detail");
    detail.id = `product-detail-${index + 1}`;
    button.setAttribute("aria-controls", detail.id);

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
carousel.addEventListener("keydown", event => {
    if (event.key === "Escape" && carousel.classList.contains("showDetail")) {
        event.preventDefault();
        closeDetails();
    }
});

syncControls();
