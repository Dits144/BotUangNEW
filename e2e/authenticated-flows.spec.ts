import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const groupId = process.env.E2E_GROUP_ID;
const allowMutation = process.env.E2E_RUN_MUTATION === "true";

async function login(page: import("@playwright/test").Page) {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for authenticated tests.");

  await page.goto("/login");
  await page.getByPlaceholder(/dits144@gmail.com|email/i).fill(email!);
  await page.getByPlaceholder(/Minimal 6 karakter|password/i).fill(password!);
  await page.getByRole("button", { name: /Masuk|Login/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/connect/);
}

test.describe("authenticated dashboard smoke", () => {
  test("session restores and dashboard navigation is SPA-like", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await expect(page.getByText(/Overview|Status Bot|Your Groups/i).first()).toBeVisible();

    for (const path of [
      "/dashboard/transactions",
      "/dashboard/participants",
      "/dashboard/todos",
      "/dashboard/reminders",
      "/dashboard/commands",
      "/dashboard/settings",
    ]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
    }

    await page.reload();
    await expect(page.locator("main")).toBeVisible();
  });

  test("group switcher exposes real group id when a test group is available", async ({ page }) => {
    test.skip(!groupId, "Set E2E_GROUP_ID to verify multi-group selection.");
    await login(page);
    await page.goto("/dashboard");
    await expect(page.getByText(groupId!)).toBeVisible();
  });
});

test.describe("safe mutation flows", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!allowMutation, "Set E2E_RUN_MUTATION=true only with a safe test group/database.");
    await login(page);
  });

  test("create/edit/delete transaction through dashboard", async ({ page }) => {
    const note = `E2E transaksi ${Date.now()}`;
    await page.goto("/dashboard/transactions");
    await page.getByRole("button", { name: /Catat Transaksi|Transaksi/i }).first().click();
    await page.getByText(/Pengeluaran/i).click();
    await page.getByPlaceholder(/Rp/i).fill("1234");
    await page.getByPlaceholder(/Catatan|Contoh/i).fill(note);
    await page.getByRole("button", { name: /Simpan Transaksi/i }).click();
    await expect(page.getByText(note)).toBeVisible();
  });

  test("todo CRUD through dashboard", async ({ page }) => {
    const title = `E2E todo ${Date.now()}`;
    await page.goto("/dashboard/todos");
    await page.getByRole("button", { name: /Tambah Tugas/i }).click();
    await page.getByPlaceholder(/Tugas baru/i).fill(title);
    await page.getByRole("button", { name: /Simpan Tugas/i }).click();
    await expect(page.getByText(title)).toBeVisible();
  });

  test("reminder CRUD through dashboard", async ({ page }) => {
    const text = `E2E reminder ${Date.now()}`;
    await page.goto("/dashboard/reminders");
    await page.getByRole("button", { name: /Buat Reminder/i }).click();
    await page.getByLabel(/Jam/i).fill("23:59");
    await page.getByPlaceholder(/Isi reminder/i).fill(text);
    await page.getByRole("button", { name: /Simpan Reminder/i }).click();
    await expect(page.getByText(text)).toBeVisible();
  });

  test("command CRUD through dashboard", async ({ page }) => {
    const keyword = `E2E${Date.now()}`;
    await page.goto("/dashboard/commands");
    await page.getByRole("button", { name: /Command Baru/i }).click();
    await page.getByPlaceholder(/Keyword/i).fill(keyword);
    await page.getByPlaceholder(/Respon otomatis/i).fill("Respon test E2E");
    await page.getByRole("button", { name: /Simpan Command/i }).click();
    await expect(page.getByText(keyword)).toBeVisible();
  });
});
