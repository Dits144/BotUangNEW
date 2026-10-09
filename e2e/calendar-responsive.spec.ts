import { expect, test } from "@playwright/test";

for (const viewport of [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`calendar stays usable on ${viewport.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.setViewportSize(viewport);
    await page.goto("/preview-dashboard", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Buka Kalender", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Kalender", exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    expect(errors, errors.join("\n")).toEqual([]);
  });
}
