export const KNOWN_WHATSAPP_GROUPS: Record<string, string> = {
  "120363427961159443@g.us": "Pemasukan DitsStore",
  "120363414001969770@g.us": "Tabungan Dira",
  "120363427301916965@g.us": "Manage Keuangan Radit",
  "120363428798929277@g.us": "Keuangan Fadlan",
};

/**
 * Normalizes any generic placeholder group name ("Grup Keuangan", "Grup WhatsApp", "Grup BotUang")
 * to its authoritative WhatsApp group name.
 */
export function getCleanGroupName(
  groupName?: string | null,
  groupId?: string | null,
): string {
  const cleanId = (groupId ?? "").trim();
  const rawName = (groupName ?? "").trim();
  const lower = rawName.toLowerCase();

  const isGeneric =
    !rawName ||
    lower === "grup keuangan" ||
    lower === "grup whatsapp" ||
    lower === "grup botuang" ||
    rawName.includes("@g.us");

  if (!isGeneric) {
    return rawName;
  }

  if (cleanId && KNOWN_WHATSAPP_GROUPS[cleanId]) {
    return KNOWN_WHATSAPP_GROUPS[cleanId];
  }

  return rawName && !rawName.includes("@g.us") && lower !== "grup keuangan"
    ? rawName
    : "Grup WhatsApp";
}

export function displayGroupName(
  groupName?: string | null,
  groupId?: string | null,
): string {
  const clean = getCleanGroupName(groupName, groupId);
  const value = clean || groupId || "Grup WhatsApp";
  if (value.includes("@g.us")) return "Grup WhatsApp";
  if (value.length > 34) return `${value.slice(0, 31)}...`;
  return value;
}
