import { element, formatMoney } from "./ui.js";

export function renderProducts(products, list) {
    const template = document.querySelector("#product-template");
    const fragment = document.createDocumentFragment();

    for (const [index, product] of products.entries()) {
        const item = template.content.firstElementChild.cloneNode(true);
        item.dataset.productId = product.id;
        item.setAttribute("aria-label", product.name);
        const image = item.querySelector("img");
        image.src = product.image;
        image.alt = product.alt;
        image.width = product.width;
        image.height = product.height;
        if (index === 1) image.fetchPriority = "high";
        item.querySelector(".intro .title").textContent = product.category;
        item.querySelector(".topic").textContent = product.name;
        item.querySelector(".intro .des").textContent = product.description;
        item.querySelector(".detail .title").textContent = product.name;
        item.querySelector(".detail .des").textContent = product.details;
        for (const price of item.querySelectorAll(".price-amount"))
            price.textContent = formatMoney(product.price);
        const detail = item.querySelector(".detail");
        detail.id = `details-${product.id}`;
        item.querySelector(".seeMore").setAttribute("aria-controls", detail.id);
        const specifications = item.querySelector(".specifications");
        for (const [label, value] of Object.entries(product.specs)) {
            const group = element("div");
            group.append(element("dt", "", label), element("dd", "", value));
            specifications.append(group);
        }
        fragment.append(item);
    }
    list.replaceChildren(fragment);
}
