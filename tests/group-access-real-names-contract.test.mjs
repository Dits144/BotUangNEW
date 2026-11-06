import test from "node:test";
import assert from "node:assert/strict";

/**
 * Contract test for resolving real group names instead of generic "Grup Keuangan" placeholders.
 */

// Helper to simulate the merging logic that should happen in /api/access/groups and fernly-dashboard
export function mergeGroupsWithBotRuntime(userGroups, botGroups) {
  const botMap = new Map();
  for (const bg of botGroups || []) {
    const id = bg.group_id || bg.id;
    if (id) {
      botMap.set(id, bg.group_name || bg.name || "");
    }
  }

  const result = [];
  const seenIds = new Set();

  for (const ug of userGroups || []) {
    const id = ug.group_id || ug.id;
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);

    const botName = botMap.get(id);
    let resolvedName = ug.group_name || ug.name || "";

    // If existing name is generic, empty, or bot has a better name, prioritize botName
    const isGeneric =
      !resolvedName ||
      resolvedName.trim().toLowerCase() === "grup keuangan" ||
      resolvedName.trim().toLowerCase() === "grup whatsapp" ||
      resolvedName.trim().toLowerCase() === "grup botuang";

    if (botName && (isGeneric || botName !== resolvedName)) {
      resolvedName = botName;
    }

    result.push({
      ...ug,
      group_id: id,
      group_name: resolvedName || "Grup WhatsApp",
    });
  }

  return result;
}

test("mergeGroupsWithBotRuntime replaces generic 'Grup Keuangan' with real WhatsApp names", () => {
  const userGroups = [
    { group_id: "120363428798929277@g.us", group_name: "Grup Keuangan", role: "admin" },
    { group_id: "120363427961159443@g.us", group_name: "Grup Keuangan", role: "admin" },
    { group_id: "120363414001969770@g.us", group_name: "Grup Keuangan", role: "admin" },
    { group_id: "120363427301916965@g.us", group_name: "Manage Keuangan Radit", role: "owner" },
  ];

  const botGroups = [
    { group_id: "120363428798929277@g.us", group_name: "Keuangan Fadlan" },
    { group_id: "120363427301916965@g.us", group_name: "Manage Keuangan Radit" },
    { group_id: "120363427961159443@g.us", group_name: "Pemasukan DitsStore" },
    { group_id: "120363414001969770@g.us", group_name: "Tabungan Dira" },
  ];

  const merged = mergeGroupsWithBotRuntime(userGroups, botGroups);

  assert.equal(merged.length, 4);

  const fadlan = merged.find((g) => g.group_id === "120363428798929277@g.us");
  assert.equal(fadlan?.group_name, "Keuangan Fadlan");

  const dits = merged.find((g) => g.group_id === "120363427961159443@g.us");
  assert.equal(dits?.group_name, "Pemasukan DitsStore");

  const dira = merged.find((g) => g.group_id === "120363414001969770@g.us");
  assert.equal(dira?.group_name, "Tabungan Dira");

  const radit = merged.find((g) => g.group_id === "120363427301916965@g.us");
  assert.equal(radit?.group_name, "Manage Keuangan Radit");

  // Ensure no group is left with the generic placeholder
  const genericCount = merged.filter((g) => g.group_name.toLowerCase() === "grup keuangan").length;
  assert.equal(genericCount, 0, "No group should be left with 'Grup Keuangan'");
});

test("mergeGroupsWithBotRuntime deduplicates by group_id", () => {
  const userGroups = [
    { group_id: "120363427301916965@g.us", group_name: "Manage Keuangan Radit" },
    { group_id: "120363427301916965@g.us", group_name: "Grup Keuangan" },
  ];

  const botGroups = [
    { group_id: "120363427301916965@g.us", group_name: "Manage Keuangan Radit" },
  ];

  const merged = mergeGroupsWithBotRuntime(userGroups, botGroups);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].group_name, "Manage Keuangan Radit");
});
