const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const formatMoney = cents => currency.format(cents / 100);

export function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

export function bindDialogDismiss(dialog, closeSelector) {
    dialog.addEventListener("click", event => {
        if (event.target.closest(closeSelector)) {
            dialog.close();
            return;
        }
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
}
