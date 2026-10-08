import { expect, test } from "@playwright/test";

const groupId = "120363427301916965@g.us";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/access/groups", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        platform_role: "owner",
        groups: [
          {
            group_id: groupId,
            group_name: "Manage Keuangan Radit",
            role: "owner",
          },
        ],
      }),
    }),
  );
  await page.route("**/api/bot/status**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, status: "connected" }),
    }),
  );
  await page.route("**/api/bot/group-data**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data: [] }),
    }),
  );
  await page.route("https://xauwlfhlrtwblstgptyk.supabase.co/rest/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/group_rentals")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          group_id: groupId,
          group_name: "Manage Keuangan Radit",
          is_active: true,
          start_at: "2026-09-23T18:53:18.779+07:00",
          expire_at: "2029-06-18T23:59:00.000+07:00",
          password: null,
          updated_by: null,
          updated_at: "2026-10-01T00:00:00.000Z",
        }),
      });
    }
    if (path.endsWith("/group_settings")) {
      return route.fulfill({ contentType: "application/json", body: "null" });
    }
    return route.fulfill({ contentType: "application/json", body: "[]" });
  });
});

test("Fernly shell navigates without reload and renders real empty states", async ({ page }) => {
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/preview-dashboard#overview");
  await page.waitForTimeout(500);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
  await expect(page.getByRole("heading", { name: "Ringkasan", exact: true })).toBeVisible();
  await expect(page.getByText("Rp 0", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Belum ada cash flow", { exact: true })).toBeVisible();

  const navigationEntries = [
    ["Transaksi", "Transaksi"],
    ["Laporan", "Laporan"],
    ["Todo", "Todo"],
    ["Kalender", "Reminder"],
    ["Anggota", "Anggota"],
    ["Otomasi", "Command"],
    ["Pengaturan", "Setting"],
    ["Bantuan", "Bantuan"],
  ] as const;

  for (const [linkName, headingName] of navigationEntries) {
    await page.getByRole("link", { name: linkName, exact: true }).first().click();
    await expect(page.getByRole("heading", { name: headingName, exact: true }).first()).toBeVisible();
    expect(new URL(page.url()).hash).not.toBe("");
  }
});

test("Fernly shell has no horizontal overflow at target viewports", async ({ page }) => {
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1366, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/preview-dashboard#overview");
    await expect(page.getByRole("heading", { name: "Ringkasan", exact: true })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${viewport.width}px viewport overflow`).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `test-results/fernly-${viewport.width}.png`,
      fullPage: true,
    });
  }
});
