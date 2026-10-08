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

test("Fernly shell navigates without reload and renders real empty states", async ({ page }, testInfo) => {
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
  await expect(page.getByText("Belum ada arus kas", { exact: true })).toBeVisible();

  const navigationEntries = [
    ["Transaksi", "Transaksi"],
    ["Analytics", "Analytics"],
    ["Tasks", "Tasks"],
    ["Kalender", "Kalender"],
    ["Team", "Anggota"],
    ["Otomasi", "Command"],
    ["Pengaturan", "Setting"],
    ["Bantuan", "Bantuan"],
  ] as const;

  for (const [linkName, headingName] of navigationEntries) {
    const links = page.getByRole("link", { name: linkName, exact: true });
    const link = testInfo.project.name === "mobile-390" ? links.last() : links.first();
    if (!(await link.isVisible())) {
      await page.getByRole("button", { name: "Buka menu", exact: true }).click();
      await expect(links.last()).toBeVisible();
    }
    await (testInfo.project.name === "mobile-390" ? links.last() : links.first()).click();
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

test("Fernly view motion progresses from reveal to rest", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/preview-dashboard#overview");
  await expect(page.getByRole("heading", { name: "Ringkasan", exact: true })).toBeVisible();
  await page.waitForTimeout(1_100);
  await page.clock.install();

  await page.getByRole("link", { name: "Transaksi", exact: true }).first().click();
  const heading = page.getByRole("heading", { name: "Transaksi", exact: true }).first();
  const firstCharacter = heading.locator("[data-fernly-character]").first();
  const lastCharacter = heading.locator("[data-fernly-character]").last();
  const firstReveal = page.locator('[data-fernly-reveal="compact"]').first();
  for (let frame = 0; frame < 90 && (await firstCharacter.count()) === 0; frame += 1) {
    await page.clock.runFor(16);
  }
  expect(await firstCharacter.count()).toBeGreaterThan(0);
  expect(await firstReveal.count()).toBeGreaterThan(0);

  const sample = () =>
    firstReveal.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        opacity: Number(style.opacity),
        transform: style.transform,
      };
    });
  const characterOffset = () =>
    lastCharacter.evaluate((element) => {
      const transform = getComputedStyle(element).transform;
      return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
    });

  const start = await sample();
  const startCharacterY = await characterOffset();
  await page.screenshot({
    path: `test-results/motion-${testInfo.project.name}-start.png`,
    fullPage: true,
  });

  await page.clock.runFor(120);
  const middle = await sample();
  const middleCharacterY = await characterOffset();
  await page.screenshot({
    path: `test-results/motion-${testInfo.project.name}-mid.png`,
    fullPage: true,
  });

  await page.clock.runFor(900);
  const end = await sample();
  const endCharacterY = await characterOffset();
  await page.screenshot({
    path: `test-results/motion-${testInfo.project.name}-end.png`,
    fullPage: true,
  });

  expect(middle.opacity).toBeGreaterThanOrEqual(start.opacity);
  expect(end.opacity).toBeGreaterThan(0.999);
  expect(Math.max(startCharacterY, middleCharacterY)).toBeGreaterThan(0.5);
  expect(middleCharacterY).toBeLessThanOrEqual(startCharacterY);
  expect(Math.abs(endCharacterY)).toBeLessThan(0.1);
  expect(end.transform === "none" || end.transform === "matrix(1, 0, 0, 1, 0, 0)").toBeTruthy();
});

test("Fernly motion respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/preview-dashboard#overview");
  const heading = page.getByRole("heading", { name: "Ringkasan", exact: true });
  await expect(heading).toBeVisible();
  await expect.poll(async () =>
    page.locator("[data-fernly-reveal]").evaluateAll((elements) => {
      const visible = elements.filter((element) => element.getClientRects().length > 0);
      return visible.length > 0 && visible.every((element) => {
        const style = getComputedStyle(element);
        return Number(style.opacity) === 1 &&
          (style.transform === "none" || style.transform === "matrix(1, 0, 0, 1, 0, 0)");
      });
    }),
  ).toBe(true);
});

test("financial analytics, Kanban, and calendar expose the Fernly structures", async ({ page }, testInfo) => {
  await page.goto("/preview-dashboard#reports");
  await expect(page.getByRole("heading", { name: "Analytics", exact: true })).toBeVisible();
  for (const label of ["Total Pemasukan", "Total Pengeluaran", "Saldo Periode", "Jumlah Transaksi"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Arus Kas", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pengeluaran per kategori", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aktivitas", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kontributor Teratas", exact: true })).toBeVisible();
  await expect(page.getByText("Periode ini", { exact: true })).toBeVisible();
  await expect(page.getByText("Sebelumnya", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Daftar Transaksi", exact: true })).toHaveCount(0);
  await page.waitForTimeout(1_100);
  await page.screenshot({ path: `test-results/analytics-${testInfo.project.name}.png`, fullPage: true });

  await page.goto("/preview-dashboard#todos");
  await expect(page.getByRole("heading", { name: "Tasks", exact: true })).toBeVisible();
  for (const label of ["To do", "In progress", "In review", "Done"]) {
    await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
  }
  await expect(page.locator(".fernly-col")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "New Task", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Due this week", exact: true })).toBeVisible();
  await page.waitForTimeout(1_100);
  await page.screenshot({ path: `test-results/tasks-${testInfo.project.name}.png`, fullPage: true });

  await page.goto("/preview-dashboard#reminders");
  await expect(page.getByRole("heading", { name: "Kalender", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Reminder \(/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Hari Libur \(/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Task \(/ })).toBeVisible();
  await expect(page.getByText("Tanggal merah", { exact: true }).first()).toBeVisible();
  await page.waitForTimeout(1_100);
  await page.screenshot({ path: `test-results/calendar-${testInfo.project.name}.png`, fullPage: true });
});
