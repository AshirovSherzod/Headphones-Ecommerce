const infoDialog = document.querySelector("#info-dialog");
const infoButton = document.querySelector("#info-toggle");

infoButton.addEventListener("click", () => {
    if (!infoDialog.open) infoDialog.showModal();
});
infoDialog.querySelector("[data-close-info]").addEventListener("click", () => infoDialog.close());
infoDialog.addEventListener("click", event => {
    if (event.target !== infoDialog) return;
    const bounds = infoDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) infoDialog.close();
});

for (const link of document.querySelectorAll("[data-home]")) {
    link.addEventListener("click", event => {
        event.preventDefault();
        document.querySelector("#back").click();
        document.querySelector("#collection").focus({ preventScroll: true });
    });
}
