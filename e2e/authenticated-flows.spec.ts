import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const groupId = process.env.E2E_GROUP_ID;
const allowMutation = process.env.E2E_RUN_MUTATION === "true";
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const supabaseUrl =
  process.env.E2E_SUPABASE_URL || "https://xauwlfhlrtwblstgptyk.supabase.co";
const supabaseAnonKey =
  process.env.E2E_SUPABASE_ANON_KEY ||
  "sb_publishable_qBDNFMAgvB_MjhgqF8PCGg_rO-9bo42";
const supabaseServiceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;

type CleanupResource = "transactions" | "todos" | "reminders" | "commands";

async function cleanupSmokeData(resource: CleanupResource, marker: string) {
  if (!email || !password || !groupId) return;

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const auth = (await authResponse.json().catch(() => ({}))) as {
    access_token?: string;
  };
  const accessToken = auth.access_token;
  if (!accessToken) return;

  const query = new URLSearchParams({ resource, group_id: groupId });
  const botResponse = await fetch(`${baseURL}/api/bot/group-data?${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => null);
  const botPayload = botResponse
    ? ((await botResponse.json().catch(() => ({}))) as { data?: unknown })
    : {};
  const botItems = Array.isArray(botPayload.data) ? botPayload.data : [];
  const fieldsByResource: Record<CleanupResource, string[]> = {
    transactions: ["note"],
    todos: ["title", "todo_text"],
    reminders: ["message", "remind_text"],
    commands: ["keyword", "response"],
  };

  for (const item of botItems as Array<Record<string, unknown>>) {
    const matches = fieldsByResource[resource].some((field) =>
      String(item[field] ?? "").includes(marker),
    );
    if (!matches || item.id === undefined) continue;
    const deleteQuery = new URLSearchParams({
      resource,
      group_id: groupId,
      id: String(item.id),
    });
    await fetch(`${baseURL}/api/bot/group-data?${deleteQuery}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => undefined);
  }

  const tableConfig = {
    transactions: { table: "transactions", column: "note" },
    todos: { table: "todos", column: "todo_text" },
    reminders: { table: "reminders", column: "remind_text" },
    commands: { table: "custom_commands", column: "keyword" },
  } as const;
  const config = tableConfig[resource];
  const restQuery = new URLSearchParams({
    group_id: `eq.${groupId}`,
    [config.column]: `ilike.*${marker}*`,
  });
  const cleanupResponse = await fetch(`${supabaseUrl}/rest/v1/${config.table}?${restQuery}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseServiceRoleKey ?? supabaseAnonKey,
      ...(supabaseServiceRoleKey
        ? { "User-Agent": "BotUang-Production-Smoke/1.0" }
        : { Authorization: `Bearer ${accessToken}` }),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ deleted_at: new Date().toISOString() }),
  });
  if (!cleanupResponse.ok) {
    throw new Error(`Smoke cleanup failed for ${resource}: ${cleanupResponse.status}`);
  }
}

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
    await expect(page.getByRole("heading", { name: "Overview", exact: true }).first()).toBeVisible();

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
    await expect(page.getByLabel("Pilih grup aktif").first()).toHaveValue(groupId!);
  });

  test("logout clears the session and login restores group access", async ({ page }) => {
    test.skip(!groupId, "Set E2E_GROUP_ID to verify restored group access.");
    await login(page);
    await page.goto("/dashboard");
    await expect(page.getByLabel("Pilih grup aktif").first()).toHaveValue(groupId!);

    await page.getByRole("button", { name: /Logout/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("botuang.dashboard.session")))
      .toBeNull();

    await login(page);
    await page.goto("/dashboard");
    await expect(page.getByLabel("Pilih grup aktif").first()).toHaveValue(groupId!);
  });

  test("dashboard has no browser errors, failed requests, or exposed server secrets", async ({
    page,
  }) => {
    test.skip((page.viewportSize()?.width ?? 1000) <= 500, "Desktop navigation audit only.");
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    const errorResponses: string[] = [];
    const exposedSecrets: string[] = [];
    const secretPattern = /sb_secret_|KunciRahasiaBot|AIza|AQ\.Ab8/i;

    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        errorResponses.push(`${response.status()} ${response.url()}`);
      }
    });
    page.on("request", (request) => {
      const serialized = JSON.stringify({
        url: request.url(),
        headers: request.headers(),
        body: request.postData(),
      });
      if (secretPattern.test(serialized)) exposedSecrets.push(request.url());
    });

    await login(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Overview", exact: true }).first()).toBeVisible();
    await page.waitForLoadState("networkidle");

    for (const name of ["Transaksi", "Anggota", "Todo", "Reminder", "Command", "Setting"] as const) {
      await page.getByRole("link", { name, exact: true }).first().click();
      await expect(page.locator("main")).toBeVisible();
    }

    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
    expect(errorResponses).toEqual([]);
    expect(exposedSecrets).toEqual([]);
  });

  test("mobile shell keeps the center AI action usable without horizontal overflow", async ({
    page,
  }) => {
    test.skip((page.viewportSize()?.width ?? 1000) > 500, "Mobile viewport only.");
    await login(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Overview", exact: true }).first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    const aiButton = page.getByRole("button", { name: "Buka BotUang AI" });
    await expect(aiButton).toBeVisible();
    const box = await aiButton.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize();
    expect(Math.abs((box!.x + box!.width / 2) - (viewport!.width / 2))).toBeLessThan(32);

    await page.getByRole("link", { name: "Aktivitas", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Todo", exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Overview", exact: true }).first()).toBeVisible();

    const initialTheme = await page.locator("html").getAttribute("data-theme");
    await page.getByRole("button", { name: "Ganti tema" }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", initialTheme ?? "light");
  });
});

test.describe("safe mutation flows", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    test.skip(!allowMutation, "Set E2E_RUN_MUTATION=true only with a safe test group/database.");
    await login(page);
  });

  test("create/edit/delete transaction through dashboard", async ({ page }) => {
    const note = `PRODUCTION-SMOKE-TEST-${Date.now()}`;
    const editedNote = `${note}-EDITED`;
    try {
      await page.goto("/dashboard#transactions");
      await page.getByRole("button", { name: /Catat Transaksi/i }).first().click();
      await page.getByRole("tab", { name: "Pemasukan" }).click();
      await page.getByPlaceholder("Rp").fill("1234");
      await page.getByPlaceholder(/Contoh: Iuran bulanan/i).fill(note);
      await page.getByRole("button", { name: "Simpan Transaksi" }).click();
      await expect(page.getByRole("cell", { name: note, exact: true })).toBeVisible();

      await page.reload();
      await expect(page.getByRole("cell", { name: note, exact: true })).toBeVisible();
      const row = page.locator("tr").filter({ hasText: note });
      await row.getByRole("button", { name: "Edit transaksi" }).click();
      await page.getByPlaceholder("Catatan transaksi").fill(editedNote);
      await page.getByRole("button", { name: "Simpan Perubahan" }).click();
      await expect(page.getByRole("cell", { name: editedNote, exact: true })).toBeVisible();

      await page.reload();
      const editedRow = page.locator("tr").filter({ hasText: editedNote });
      await expect(editedRow).toBeVisible();
      await editedRow.getByRole("button", { name: "Hapus transaksi" }).click();
      await expect(page.getByRole("cell", { name: editedNote, exact: true })).toHaveCount(0);
    } finally {
      await cleanupSmokeData("transactions", note);
    }
  });

  test("todo CRUD through dashboard", async ({ page }) => {
    const title = `PRODUCTION-SMOKE-TODO-${Date.now()}`;
    const editedTitle = `${title}-EDITED`;
    try {
      await page.goto("/dashboard#todos");
      await page.getByRole("button", { name: "Tambah Tugas" }).click();
      await page.getByPlaceholder("Tugas baru").fill(title);
      await page.getByRole("button", { name: "Simpan Tugas" }).click();
      await expect(page.getByText(title, { exact: true })).toBeVisible();

      await page.reload();
      const todoRow = page.getByText(title, { exact: true }).locator("..");
      await todoRow.getByRole("button", { name: "Tandai selesai" }).click();
      await expect(todoRow.getByRole("button", { name: "Tandai belum selesai" })).toBeVisible();
      await todoRow.getByRole("button", { name: "Edit todo" }).click();
      await page.getByPlaceholder("Tugas").fill(editedTitle);
      await page.getByRole("button", { name: "Simpan Perubahan" }).click();
      await expect(page.getByText(editedTitle, { exact: true })).toBeVisible();

      await page.reload();
      const editedTodoRow = page.getByText(editedTitle, { exact: true }).locator("..");
      await editedTodoRow.getByRole("button", { name: "Hapus todo" }).click();
      await expect(page.getByText(editedTitle, { exact: true })).toHaveCount(0);
    } finally {
      await cleanupSmokeData("todos", title);
    }
  });

  test("reminder CRUD through dashboard", async ({ page }) => {
    const text = `PRODUCTION-SMOKE-REMINDER-${Date.now()}`;
    try {
      await page.goto("/dashboard#reminders");
      await page.getByRole("button", { name: "Buat Reminder" }).click();
      await page.getByLabel("Jam").fill("23:59");
      await page.getByPlaceholder("Isi reminder").fill(text);
      await page.getByRole("button", { name: "Simpan Reminder" }).click();
      await expect(page.getByText(text, { exact: true })).toBeVisible();

      await page.reload();
      const reminderRow = page.getByText(text, { exact: true }).locator("../..");
      await reminderRow.getByRole("button", { name: "Hapus reminder" }).click();
      await expect(page.getByText(text, { exact: true })).toHaveCount(0);
    } finally {
      await cleanupSmokeData("reminders", text);
    }
  });

  test("command CRUD through dashboard", async ({ page }) => {
    const keyword = `PRODUCTION-SMOKE-CMD-${Date.now()}`;
    const editedResponse = "BotUang production test edited";
    try {
      await page.goto("/dashboard#commands");
      await page.getByRole("button", { name: "Command Baru" }).click();
      await page.getByPlaceholder(/Keyword, contoh/i).fill(keyword);
      await page.getByPlaceholder("Respon otomatis").fill("BotUang production test");
      await page.getByRole("button", { name: "Simpan Command" }).click();
      await expect(page.getByText(keyword, { exact: true })).toBeVisible({ timeout: 20_000 });

      await page.reload();
      const commandCard = page.getByText(keyword, { exact: true }).locator("../..");
      await commandCard.getByRole("button", { name: "Edit command" }).click();
      await page.getByPlaceholder("Respon otomatis").fill(editedResponse);
      await page.getByRole("button", { name: "Simpan Perubahan" }).click();
      await expect(page.getByText(editedResponse, { exact: true })).toBeVisible();

      await page.reload();
      const editedCard = page.getByText(keyword, { exact: true }).locator("../..");
      await editedCard.getByRole("button", { name: "Hapus command" }).click();
      await expect(page.getByText(keyword, { exact: true })).toHaveCount(0);
    } finally {
      await cleanupSmokeData("commands", keyword);
    }
  });
});
