import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("public navigation and responsive shell", () => {
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
  ]) {
    test(`landing has no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(page.getByRole("heading", { name: /BotUang Dashboard/i })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }

  test("internal public navigation uses app routes", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Login Admin|Masuk/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: /Selamat datang kembali|Buat akun admin/i }),
    ).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: /Buka Dashboard|Hubungkan Grup/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard|\/login/);
  });

  test("login page has no mobile overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await expectNoHorizontalOverflow(page);
  });
});
