import { bindDialogDismiss } from "./ui.js";

export function initNavigation({ closeDetails }) {
    const infoDialog = document.querySelector("#info-dialog");
    const infoButton = document.querySelector("#info-toggle");

    infoButton.addEventListener("click", () => {
        if (!infoDialog.open) infoDialog.showModal();
    });
    bindDialogDismiss(infoDialog, "[data-close-info]");

    for (const link of document.querySelectorAll("[data-home]")) {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            closeDetails();
            document.querySelector("#collection").focus({ preventScroll: true });
        });
    }
}
