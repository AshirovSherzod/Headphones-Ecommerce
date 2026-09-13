import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { CART_STORAGE_KEY, MAX_QUANTITY, createCartStore } from "../../js/cart-store.js";
import { products } from "../../js/products.js";
import { formatMoney } from "../../js/ui.js";

const catalogue = [
    { id: "a", price: 10 },
    { id: "b", price: 20 },
];
function memoryStorage(initial = "{}") {
    let value = initial;
    return {
        getItem: () => value,
        setItem: (_key, next) => {
            value = next;
        },
    };
}

test("the catalogue has unique identities, integer prices and existing images", () => {
    assert.equal(new Set(products.map((product) => product.id)).size, products.length);
    for (const product of products) {
        assert.match(product.id, /^[a-z0-9-]+$/);
        assert.ok(Number.isSafeInteger(product.price) && product.price > 0);
        assert.ok(product.name && product.description && product.details);
        assert.ok(existsSync(new URL(`../../${product.image}`, import.meta.url)));
    }
});

test("money formatting and mixed cart totals keep integer cent precision", () => {
    const cart = createCartStore(catalogue);
    cart.add("a");
    cart.add("b");
    assert.equal(cart.getSnapshot().total, 30);
    assert.equal(cart.getSnapshot().itemCount, 2);
    assert.equal(formatMoney(cart.getSnapshot().total), "$0.30");
});

test("quantity changes, removal and clearing persist correctly", () => {
    const storage = memoryStorage();
    const cart = createCartStore(catalogue, storage);
    cart.add("a");
    cart.add("a");
    cart.setQuantity("b", 3);
    assert.equal(cart.getSnapshot().total, 80);
    cart.setQuantity("a", 0);
    assert.equal(cart.getSnapshot().itemCount, 3);
    assert.equal(cart.remove("missing"), false);
    cart.remove("b");
    assert.equal(cart.getSnapshot().total, 0);
    cart.add("a");
    cart.clear();
    assert.equal(storage.getItem(CART_STORAGE_KEY), "{}");
    assert.deepEqual(createCartStore(catalogue, storage).getSnapshot().items, []);
});

test("a saved bag survives a new store instance", () => {
    const storage = memoryStorage();
    const first = createCartStore(catalogue, storage);
    first.setQuantity("a", 4);
    assert.equal(createCartStore(catalogue, storage).getSnapshot().itemCount, 4);
});

test("invalid product ids and quantities cannot enter the cart", () => {
    const cart = createCartStore(catalogue);
    assert.equal(cart.add("unknown"), false);
    for (const quantity of [-1, 1.5, "2", NaN, Infinity, MAX_QUANTITY + 1]) {
        assert.equal(cart.setQuantity("a", quantity), false);
    }
    assert.equal(cart.getSnapshot().itemCount, 0);
    cart.setQuantity("a", MAX_QUANTITY);
    assert.equal(cart.add("a"), false);
    assert.equal(cart.getSnapshot().itemCount, MAX_QUANTITY);
});

test("restoration ignores unknown items, prototype keys and malformed quantities", () => {
    const storage = memoryStorage('{"a":2,"b":1.5,"unknown":3,"__proto__":99}');
    const snapshot = createCartStore(catalogue, storage).getSnapshot();
    assert.equal(snapshot.itemCount, 2);
    assert.equal(snapshot.items.length, 1);
    assert.equal(snapshot.items[0].product.id, "a");
});

test("malformed storage always falls back to an empty usable bag", () => {
    for (const value of ["{broken", "null", "[]", "42", '"text"']) {
        const cart = createCartStore(catalogue, memoryStorage(value));
        assert.equal(cart.getSnapshot().itemCount, 0);
        assert.equal(cart.add("a"), true);
    }
});

test("blocked storage retains shopping state in memory", () => {
    const storage = {
        getItem() {
            throw new Error("blocked");
        },
        setItem() {
            throw new Error("blocked");
        },
    };
    const cart = createCartStore(catalogue, storage);
    cart.add("b");
    assert.equal(cart.getSnapshot().total, 20);
    assert.equal(cart.getSnapshot().persistent, false);
});

test("subscriptions can be removed and storage changes can be reloaded", () => {
    const storage = memoryStorage();
    const cart = createCartStore(catalogue, storage);
    const counts = [];
    const unsubscribe = cart.subscribe((snapshot) => counts.push(snapshot.itemCount));
    cart.add("a");
    storage.setItem(CART_STORAGE_KEY, '{"b":3}');
    cart.reload();
    assert.deepEqual(counts, [1, 3]);
    unsubscribe();
    cart.clear();
    assert.deepEqual(counts, [1, 3]);
});
