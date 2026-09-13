import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const errors = new WeakMap();
const active = (page) => page.locator(".item:nth-child(2)");
async function openDetails(page) {
    await active(page).locator(".seeMore").click();
    await expect(active(page).locator(".checkout")).toHaveCSS("opacity", "1");
}

test.beforeEach(async ({ page }) => {
    errors.set(page, []);
    page.on("pageerror", (error) => errors.get(page).push(error.message));
    // External font availability must never determine whether the demo works.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
});
test.afterEach(async ({ page }) => {
    expect(errors.get(page)).toEqual([]);
});

test("loads a complete concept catalogue without dead navigation links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".list .item")).toHaveCount(5);
    await expect(active(page).locator(".topic")).toHaveText("Studio Air");
    await expect(active(page).locator(".intro .price")).toContainText("$129.00");
    await expect(page.locator("a[href='']")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("Lorem ipsum");
    await expect
        .poll(() =>
            page
                .locator(".list img")
                .evaluateAll((images) =>
                    images.every((image) => image.complete && image.naturalWidth > 0),
                ),
        )
        .toBe(true);
});

test("rapid keyboard input advances once, preserves focus and finishes its animation", async ({
    page,
}) => {
    await page.goto("/");
    await page.locator("#next").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(active(page)).toHaveAttribute("data-product-id", "wave-pro");
    await expect(page.locator("#next")).toBeFocused();
    await expect(page.locator("#next")).toHaveAttribute("aria-disabled", "false", {
        timeout: 2000,
    });
    await expect(page.locator("#slide-current")).toHaveText("02");
    await page.keyboard.press("ArrowLeft");
    await expect(active(page)).toHaveAttribute("data-product-id", "studio-air");
});

test("entrance animation does not create a transient scrollbar", async ({ page }) => {
    await page.goto("/");
    await page.locator("#next").click();
    const frames = await active(page)
        .locator(".intro")
        .evaluate(async (panel) => {
            const frames = [];
            const start = performance.now();
            while (performance.now() - start < 1000) {
                frames.push({
                    elapsed: performance.now() - start,
                    overflow: getComputedStyle(panel).overflowY,
                    gutter: panel.offsetWidth - panel.clientWidth,
                });
                await new Promise((resolve) => setTimeout(resolve, 30));
            }
            return frames;
        });
    expect(
        frames
            .filter((frame) => frame.elapsed < 500)
            .every((frame) => frame.overflow === "hidden" && frame.gutter === 0),
    ).toBe(true);
    await expect(active(page).locator(".intro")).toHaveCSS("overflow-y", "auto");
});

test("details, Home and Info preserve usable keyboard focus", async ({ page }) => {
    await page.goto("/");
    await openDetails(page);
    await expect(page.locator("#back")).toBeFocused();
    await expect(page.locator("#next")).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(active(page).locator(".seeMore")).toBeFocused();
    await openDetails(page);
    await page.locator("nav [data-home]").click();
    await expect(page.locator(".carousel")).not.toHaveClass(/showDetail/);
    await page.locator("#info-toggle").click();
    await expect(page.locator("#info-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#info-toggle")).toBeFocused();
});

test("the shopping journey supports quantities, persistence and a simulated order", async ({
    page,
}) => {
    const posts = [];
    page.on("request", (request) => {
        if (request.method() === "POST") posts.push(request.url());
    });
    await page.goto("/");
    await page.locator("#cart-toggle").click();
    await expect(page.locator("#cart-empty")).toBeVisible();
    await page.locator("#cart-dialog [data-close-dialog]").first().click();
    await openDetails(page);
    await active(page).locator("[data-action='add-to-cart']").click();
    await active(page).locator("[data-action='add-to-cart']").click();
    await expect(page.locator("#cart-count")).toHaveText("2");
    await page.locator("#cart-toggle").click();
    await expect(page.locator("#cart-total")).toHaveText("$258.00");
    await page.getByRole("button", { name: "Increase Studio Air quantity" }).click();
    await expect(page.locator("#cart-total")).toHaveText("$387.00");
    await page.getByRole("button", { name: "Decrease Studio Air quantity" }).click();
    await page.reload();
    await expect(page.locator("#cart-count")).toHaveText("2");
    await page.locator("#cart-toggle").click();
    await page.locator("#checkout-button").click();
    await expect(page.locator("#checkout-total")).toHaveText("$258.00");
    await page.locator("#place-order").click();
    await expect(page.locator("[data-cart-view='confirmation']")).toBeVisible();
    await expect(page.locator("#order-reference")).toHaveText(/^DEMO-/);
    await expect(page.locator("#cart-count")).toHaveText("0");
    expect(await page.evaluate(() => localStorage.getItem("headphones-demo-cart:v1"))).toBe("{}");
    expect(posts).toEqual([]);
});

test("direct checkout, removing the final item and corrupt storage recover cleanly", async ({
    page,
}) => {
    await page.goto("/");
    await openDetails(page);
    await active(page).locator("[data-action='buy-now']").click();
    await expect(page.locator("[data-cart-view='checkout']")).toBeVisible();
    await page.locator("[data-view-cart]").click();
    await page.getByRole("button", { name: "Remove Studio Air" }).click();
    await expect(page.locator("#cart-empty")).toBeVisible();
    await expect(page.locator("#cart-title")).toBeFocused();
    await page.evaluate(() => localStorage.setItem("headphones-demo-cart:v1", "{broken"));
    await page.reload();
    await expect(page.locator("#cart-count")).toHaveText("0");
});

test("shopping works when browser storage is blocked", async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(window, "localStorage", {
            get() {
                throw new DOMException("Blocked", "SecurityError");
            },
        });
    });
    await page.goto("/");
    await openDetails(page);
    await active(page).locator("[data-action='add-to-cart']").click();
    await page.locator("#cart-toggle").click();
    await expect(page.locator("#storage-note")).toBeVisible();
    await expect(page.locator("#cart-total")).toHaveText("$129.00");
});

test("reduced motion supports a full loop through the catalogue", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const visited = new Set();
    for (let index = 0; index < 5; index++) {
        visited.add(await active(page).getAttribute("data-product-id"));
        await page.locator("#next").click();
    }
    expect(visited.size).toBe(5);
    await expect(page.locator("#slide-current")).toHaveText("01");
});

test("a native horizontal touch gesture changes the product", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(active(page)).toHaveAttribute("data-product-id", "studio-air");
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 270, y: 180 }],
    });
    await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 130, y: 180 }],
    });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.locator("#slide-current")).toHaveText("02");
    await session.detach();
});

for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [1024, 600],
    [768, 1024],
    [601, 640],
    [600, 640],
    [390, 844],
    [375, 667],
    [320, 568],
    [320, 480],
    [844, 390],
    [667, 375],
]) {
    test(`navigation and product actions fit ${width} × ${height}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/");
        await expect(page.locator(".list .item")).toHaveCount(5);
        expect(
            await page.evaluate(
                () =>
                    document.documentElement.scrollHeight <= innerHeight &&
                    document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true);
        for (const selector of ["#next", "#prev"]) {
            const box = await page.locator(selector).boundingBox();
            expect(box.y + box.height).toBeLessThanOrEqual(height);
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(width);
            await page.locator(selector).click({ trial: true });
        }
        await openDetails(page);
        await active(page).locator("[data-action='buy-now']").scrollIntoViewIfNeeded();
        await active(page).locator("[data-action='buy-now']").click({ trial: true });
        const back = await page.locator("#back").boundingBox();
        expect(back.y + back.height).toBeLessThanOrEqual(height);
        await page.locator("#back").click();
    });
}

for (const width of [1366, 390]) {
    test(`automated accessibility checks pass on collection and dialogs at ${width}px`, async ({
        page,
    }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/");
        await expect(page.locator(".list .item")).toHaveCount(5);
        const scan = async () => {
            const result = await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
                .analyze();
            expect(
                result.violations.map((violation) => ({
                    id: violation.id,
                    nodes: violation.nodes.map((node) => ({
                        target: node.target,
                        summary: node.failureSummary,
                    })),
                })),
            ).toEqual([]);
        };
        await scan();
        await page.locator("#info-toggle").click();
        await scan();
        await page.keyboard.press("Escape");
        await openDetails(page);
        await active(page).locator("[data-action='buy-now']").click();
        await scan();
    });
}
