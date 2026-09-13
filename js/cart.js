import { CART_STORAGE_KEY, MAX_QUANTITY, createCartStore } from "./cart-store.js";

const products = [...document.querySelectorAll(".item")].map(item => ({
    id: item.dataset.productId,
    name: item.querySelector(".topic").textContent,
    price: Number(item.dataset.price),
    image: item.querySelector("img").getAttribute("src"),
    alt: item.querySelector("img").alt,
}));
const byId = new Map(products.map(product => [product.id, product]));
let storage = null;
try { storage = window.localStorage; } catch { /* In-memory shopping still works. */ }
const store = createCartStore(products, storage);
const money = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const dialog = document.querySelector("#cart-dialog");
const title = document.querySelector("#cart-title");
const cartButton = document.querySelector("#cart-toggle");
const toast = document.querySelector("#toast");
let toastTimeout;
let view = "cart";

function notify(message) {
    window.clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 3000);
}

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function actionButton(action, label, text, id) {
    const button = element("button", "quantity-button", text);
    button.type = "button";
    button.dataset.cartAction = action;
    button.dataset.productId = id;
    button.setAttribute("aria-label", label);
    return button;
}

function showView(nextView, focus = true) {
    view = nextView;
    for (const section of dialog.querySelectorAll("[data-cart-view]")) {
        section.hidden = section.dataset.cartView !== view;
    }
    title.textContent = { cart: "Your bag", checkout: "Demo checkout", confirmation: "All done" }[view];
    if (focus && dialog.open) title.focus();
}

function openCart(nextView = "cart") {
    if (nextView === "checkout" && !store.getSnapshot().items.length) nextView = "cart";
    showView(nextView, false);
    if (!dialog.open) dialog.showModal();
    title.focus();
}

function render(snapshot = store.getSnapshot()) {
    document.querySelector("#cart-count").textContent = snapshot.itemCount;
    cartButton.setAttribute("aria-label", `Shopping bag, ${snapshot.itemCount} items`);
    document.querySelector("#cart-total").textContent = money(snapshot.total);
    document.querySelector("#checkout-total").textContent = money(snapshot.total);
    document.querySelector("#cart-summary").hidden = snapshot.items.length === 0;
    document.querySelector("#cart-empty").hidden = snapshot.items.length !== 0;
    document.querySelector("#storage-note").hidden = snapshot.persistent;
    const rows = document.createDocumentFragment();
    const summary = document.createDocumentFragment();

    for (const { product, quantity, subtotal } of snapshot.items) {
        const row = element("li", "cart-row");
        const image = element("img", "cart-image");
        image.src = product.image;
        image.alt = product.alt;
        const content = element("div", "cart-row-content");
        content.append(element("h3", "", product.name), element("p", "muted", `${money(product.price)} each`));
        const controls = element("div", "quantity-control");
        const minus = actionButton("decrease", `Decrease ${product.name} quantity`, "−", product.id);
        const count = element("span", "quantity-value", quantity);
        count.setAttribute("aria-label", `Quantity ${quantity}`);
        const plus = actionButton("increase", `Increase ${product.name} quantity`, "+", product.id);
        plus.disabled = quantity >= MAX_QUANTITY;
        controls.append(minus, count, plus);
        const remove = actionButton("remove", `Remove ${product.name}`, "Remove", product.id);
        remove.className = "text-button remove-button";
        content.append(controls, remove);
        row.append(image, content, element("strong", "cart-line-price", money(subtotal)));
        rows.append(row);
        const summaryRow = element("div", "summary-row");
        summaryRow.append(element("span", "", `${product.name} × ${quantity}`), element("strong", "", money(subtotal)));
        summary.append(summaryRow);
    }

    document.querySelector("#cart-items").replaceChildren(rows);
    document.querySelector("#checkout-items").replaceChildren(summary);
    if (view === "checkout" && !snapshot.items.length) showView("cart");
}

function addProduct(id) {
    if (!store.add(id)) {
        notify(`You can add up to ${MAX_QUANTITY} of each product.`);
        return false;
    }
    const suffix = store.getSnapshot().persistent ? "" : " Saved for this visit only.";
    notify(`${byId.get(id).name} added to your bag.${suffix}`);
    return true;
}

document.querySelector(".list").addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button || button.closest("[inert]")) return;
    const id = button.closest(".item").dataset.productId;
    if (button.dataset.action === "add-to-cart") addProduct(id);
    if (button.dataset.action === "buy-now" && addProduct(id)) openCart("checkout");
});

cartButton.addEventListener("click", () => openCart());
document.querySelector("#checkout-button").addEventListener("click", () => showView("checkout"));
dialog.addEventListener("click", event => {
    if (event.target.closest("[data-close-dialog]")) dialog.close();
    if (event.target.closest("[data-view-cart]")) showView("cart");
    const action = event.target.closest("[data-cart-action]");
    if (!action) return;
    const item = store.getSnapshot().items.find(item => item.product.id === action.dataset.productId);
    if (!item) return;
    const id = item.product.id;
    const kind = action.dataset.cartAction;
    if (kind === "remove") store.remove(id);
    else store.setQuantity(id, item.quantity + (kind === "increase" ? 1 : -1));
    // Rendering replaces rows; restore focus to the corresponding control.
    const replacement = [...dialog.querySelectorAll("[data-cart-action]")].find(button =>
        button.dataset.productId === id && button.dataset.cartAction === kind && !button.disabled);
    (replacement || dialog.querySelector("[data-cart-action]:not(:disabled)") || title).focus();
});

dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener("close", () => showView("cart", false));

document.querySelector("#place-order").addEventListener("click", () => {
    const snapshot = store.getSnapshot();
    if (!snapshot.items.length || view !== "checkout") return;
    document.querySelector("#order-reference").textContent = `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    document.querySelector("#order-total").textContent = `${snapshot.itemCount} items · ${money(snapshot.total)}`;
    store.clear();
    showView("confirmation");
});

window.addEventListener("storage", event => {
    if (event.key === CART_STORAGE_KEY || event.key === null) store.reload();
});
store.subscribe(render);
render();
