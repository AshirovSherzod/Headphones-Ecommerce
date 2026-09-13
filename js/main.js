import { products } from "./products.js";
import { renderProducts } from "./render-products.js";
import { initCarousel } from "./carousel.js";
import { initCart } from "./cart.js";
import { initNavigation } from "./navigation.js";

const carousel = document.querySelector(".carousel");
renderProducts(products, carousel.querySelector(".list"));
const controls = initCarousel(carousel);
initCart(products);
initNavigation(controls);
