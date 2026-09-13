export const CART_STORAGE_KEY = "headphones-demo-cart:v1";
export const MAX_QUANTITY = 99;

export function createCartStore(products, storage = null) {
    const catalogue = new Map(products.map((product) => [product.id, product]));
    const listeners = new Set();
    let quantities = Object.create(null);
    let persistent = Boolean(storage);

    function restore() {
        quantities = Object.create(null);
        try {
            const saved = JSON.parse(storage?.getItem(CART_STORAGE_KEY) || "{}");
            if (!saved || Array.isArray(saved) || typeof saved !== "object") return;
            for (const [id, quantity] of Object.entries(saved)) {
                if (
                    catalogue.has(id) &&
                    Number.isInteger(quantity) &&
                    quantity > 0 &&
                    quantity <= MAX_QUANTITY
                ) {
                    quantities[id] = quantity;
                }
            }
        } catch {
            // A malformed or unavailable saved cart must not stop this visit.
        }
    }

    function getSnapshot() {
        const items = Object.entries(quantities).map(([id, quantity]) => ({
            product: catalogue.get(id),
            quantity,
            subtotal: catalogue.get(id).price * quantity,
        }));
        return {
            items,
            itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
            total: items.reduce((sum, item) => sum + item.subtotal, 0),
            persistent,
        };
    }

    function notify() {
        for (const listener of listeners) listener(getSnapshot());
    }

    function save() {
        try {
            storage?.setItem(CART_STORAGE_KEY, JSON.stringify(quantities));
        } catch {
            persistent = false;
        }
        notify();
    }

    restore();

    return {
        getSnapshot,
        add(id) {
            if (!catalogue.has(id) || (quantities[id] || 0) >= MAX_QUANTITY) return false;
            quantities[id] = (quantities[id] || 0) + 1;
            save();
            return true;
        },
        setQuantity(id, quantity) {
            if (
                !catalogue.has(id) ||
                !Number.isInteger(quantity) ||
                quantity < 0 ||
                quantity > MAX_QUANTITY
            )
                return false;
            if (quantity === 0) delete quantities[id];
            else quantities[id] = quantity;
            save();
            return true;
        },
        remove(id) {
            if (!Object.hasOwn(quantities, id)) return false;
            delete quantities[id];
            save();
            return true;
        },
        clear() {
            quantities = Object.create(null);
            save();
        },
        reload() {
            restore();
            notify();
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
