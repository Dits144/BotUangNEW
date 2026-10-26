type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type ParsedIntent = {
  action?: "transaction" | "query" | "reminder" | "todo" | "command";
  type?: "income" | "expense";
  query_type?: "balance" | "income" | "expense" | "summary" | "search";
  amount?: number;
  note?: string;
  date?: string;
  remind_type?: string;
  remind_value?: string;
  remind_text?: string;
  todo_text?: string;
  keyword?: string;
  response?: string;
  confidence?: number;
};

function getGeminiModel() {
  // A single low-latency model avoids serial retries across multiple providers.
  return process.env.GOOGLE_AI_MODEL?.trim() || "gemini-3.5-flash-lite";
}

function parseMoney(value: string) {
  const normalized = value.toLowerCase()
    .replace(/\bjam\s+\d{1,2}(?:[:.]\d{2})?(?:\s*(?:pagi|siang|sore|malam))?\b/g, " ")
    .replace(/\b(?:tanggal\s*)?\d{1,2}\s+(?:jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|agu(?:stus)?|sep(?:tember)?|okt(?:ober)?|nov(?:ember)?|des(?:ember)?)(?:\s+\d{4})?\b/g, " ")
    .replace(/\b(?:tanggal\s*)?\d{4}-\d{1,2}-\d{1,2}\b|\b(?:tanggal\s*)?\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ");
  const match = normalized.match(/(?:^|[^\w:/.])(rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(jt|juta|rb|ribu|k)?\b/i);
  if (!match) return null;
  const [, rupiah, raw, suffix] = match;
  if (!rupiah && !suffix && !/\b(bayar|beli|pengeluaran|pemasukan|masuk|masukin|income|expense|donasi|iuran|kas|terima|catat|sewa|biaya|harga|habis|keluar)\b/i.test(value)) return null;
  const grouped = /^\d{1,3}(?:[.,]\d{3})+$/.test(raw);
  const amount = Number(grouped ? raw.replace(/[.,]/g, "") : raw.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const multiplier = suffix === "jt" || suffix === "juta" ? 1_000_000
    : suffix === "rb" || suffix === "ribu" || suffix === "k" ? 1_000 : 1;
  return { amount: amount * multiplier, raw: match[0].trim() };
}

function jakartaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

function addCalendarDays(dateKey: string, days: number) {
  const day = new Date(`${dateKey}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

function parseLocalIntent(text: string, today: string) {
  const lower = text.toLowerCase();

  if (/\b(saldo|kas sekarang|uang kas)\b/.test(lower)) {
    return validateIntent({
      action: "query",
      query_type: "balance",
      note: text,
      date: today,
      confidence: 0.75,
    });
  }

  if (/\b(pengeluaran|keluar|expense)\b/.test(lower) && /\b(berapa|total|rekap|ringkasan|laporan|bulan ini|minggu ini|hari ini)\b/.test(lower)
    && (!parseMoney(text) || /\b(berapa|total|rekap|ringkasan|laporan)\b/.test(lower))) {
    return validateIntent({
      action: "query",
      query_type: "expense",
      note: text,
      date: today,
      confidence: 0.7,
    });
  }

  if (/\b(pemasukan|masuk|income)\b/.test(lower) && /\b(berapa|total|bulan ini|minggu ini|hari ini)\b/.test(lower)
    && (!parseMoney(text) || /\b(berapa|total)\b/.test(lower))) {
    return validateIntent({
      action: "query",
      query_type: "income",
      note: text,
      date: today,
      confidence: 0.7,
    });
  }

  if (/\b(rekap|ringkasan|summary|laporan)\b/.test(lower)) {
    return validateIntent({ action: "query", query_type: "summary", note: text, date: today, confidence: 0.7 });
  }

  if (/^(todo\+|todo|tugas|task)\b/.test(lower) || /\b(todo|tugas|task)\b/.test(lower)) {
    const todoText = text
      .replace(/^(todo\+|todo|tugas|task)\b[:\-\s]*/i, "")
      .replace(/\b(tambah|buat|bikin)?\s*(todo|tugas|task)\b[:\-\s]*/i, "")
      .trim();
    return validateIntent({
      action: "todo",
      todo_text: todoText || text,
      note: todoText || text,
      date: today,
      confidence: 0.55,
    });
  }

  const timeMatch = lower.match(/\bjam\s*(\d{1,2})(?:[:.](\d{2}))?\s*(pagi|siang|sore|malam)?\b/)
    ?? lower.match(/\b(\d{1,2})[:.](\d{2})\b/);
  let hour = -1;
  let minute = 0;
  if (timeMatch) {
    const rawHour = Number(timeMatch[1]);
    minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
    const modifier = (timeMatch[3] ?? "").toLowerCase();
    if (modifier === "malam" && rawHour < 12) hour = rawHour + 12;
    else if (modifier === "sore" && rawHour < 12 && rawHour >= 1) hour = rawHour + 12;
    else if (modifier === "siang" && rawHour <= 5 && rawHour >= 1) hour = rawHour + 12;
    else hour = rawHour;
  }
  const time = hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
    ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    : "";
  const explicitReminder = /^r\s+/i.test(text) || /\b(reminder|ingatkan|pengingat|jangan lupa)\b/.test(lower);
  const financialAction = /\b(bayar|beli|pengeluaran|pemasukan|transfer|rp\.?|ribu|juta)\b/.test(lower);
  const reminderLanguage = explicitReminder || (!financialAction && /\b(jadwal|rapat|acara)\b/.test(lower));
  const contextualSchedule = Boolean(time) && /\b(besok|lusa|hari ini|nanti)\b/.test(lower)
    && !financialAction;
  if (reminderLanguage || contextualSchedule) {
    const explicitDate = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1]
      ?? (() => {
        const match = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
        if (!match) return "";
        const year = match[3] ? (match[3].length === 2 ? `20${match[3]}` : match[3]) : today.slice(0, 4);
        return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
      })();
    const date = /\blusa\b/.test(lower) ? addCalendarDays(today, 2)
      : /\bbesok\b/.test(lower) ? addCalendarDays(today, 1)
      : /\bhari ini\b/.test(lower) ? today : explicitDate;
    const textAfterAt = text.includes("@") ? text.split("@").slice(1).join("@") : "";
    const remindText = (textAfterAt || text)
      .replace(/^r\s+/i, "")
      .replace(/\b(tolong|buat|bikin|tambah|reminder|ingatkan|jadwal|pengingat)\b/gi, "")
      .replace(/\b(besok|lusa|hari ini|nanti|jam|pagi|siang|sore|malam|jangan lupa)\b/gi, "")
      .replace(/\b\d{1,2}(?:[:.]\d{2})?\b/g, "")
      .replace(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, "")
      .replace(/\s+/g, " ").trim();
    // One-off reminders use ISO+WIB, accepted by the bot's Luxon scheduler.
    const remindValue = date && time ? `${date}T${time}:00+07:00`
      : date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : time;
    if (!remindValue) return null;
    return validateIntent({
      action: "reminder",
      remind_type: date && time ? "datetime" : date ? "date" : "time",
      remind_value: remindValue,
      remind_text: remindText || text,
      note: remindText || text,
      date: today,
      confidence: 0.75,
    });
  }

  if (/^(cmd|command)\b/i.test(text) || /\b(command|cmd|keyword|respon|response)\b/.test(lower)) {
    const parts = text.split("@");
    const keyword = parts[0]
      ?.replace(/^(cmd|command)\b/gi, "")
      .replace(/\b(buat|bikin|tambah|command|cmd|keyword)\b/gi, "")
      .trim();
    const response = parts.slice(1).join("@").trim();
    return validateIntent({
      action: "command",
      keyword,
      response: response || text,
      note: response || text,
      date: today,
      confidence: 0.5,
    });
  }

  const money = parseMoney(text);
  if (money) {
    const isIncome =
      text.trim().startsWith("+") ||
      (/\b(pemasukan|masuk|masukin|income|donasi|iuran|kas masuk|terima|plus)\b/.test(lower) &&
        !/\b(pengeluaran|keluar|expense|beli|bayar|minus|-)\b/.test(lower));
    const note = text
      .replace(money.raw, "")
      .replace(/\b(pemasukan|pengeluaran|income|expense|masuk|masukin|keluar|beli|bayar|catat|tambahkan|tambah|buat|plus|minus)\b/gi, "")
      .trim();
    return validateIntent({
      action: "transaction",
      type: isIncome ? "income" : "expense",
      amount: money.amount,
      note: note || text,
      date: /\bkemarin\b/.test(lower) ? addCalendarDays(today, -1) : today,
      confidence: 0.6,
    });
  }

  return null;
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

function validateIntent(value: ParsedIntent) {
  const action = value.action ?? "transaction";
  if (!["transaction", "query", "reminder", "todo", "command"].includes(action)) {
    return null;
  }

  if (action === "query") {
    const queryType = value.query_type ?? "summary";
    if (!["balance", "income", "expense", "summary", "search"].includes(queryType)) {
      return null;
    }
    return {
      action,
      type: "expense" as const,
      query_type: queryType,
      amount: 0,
      note: String(value.note ?? "").slice(0, 180) || "Cek keuangan",
      date: value.date,
      confidence: Number(value.confidence ?? 0.7),
    };
  }

  if (action === "reminder") {
    const remindText = String(value.remind_text ?? value.note ?? "").trim();
    const remindValue = String(value.remind_value ?? "").trim();
    if (!remindText || !remindValue) return null;
    return {
      action,
      type: "expense" as const,
      amount: 0,
      note: remindText,
      remind_type: String(value.remind_type ?? "time"),
      remind_value: remindValue,
      remind_text: remindText,
      date: value.date,
      confidence: Number(value.confidence ?? 0.7),
    };
  }

  if (action === "todo") {
    const todoText = String(value.todo_text ?? value.note ?? "").trim();
    if (!todoText) return null;
    return {
      action,
      type: "expense" as const,
      amount: 0,
      note: todoText,
      todo_text: todoText,
      date: value.date,
      confidence: Number(value.confidence ?? 0.7),
    };
  }

  if (action === "command") {
    const keyword = String(value.keyword ?? "").trim();
    const response = String(value.response ?? value.note ?? "").trim();
    if (!keyword || !response) return null;
    return {
      action,
      type: "expense" as const,
      amount: 0,
      note: response,
      keyword,
      response,
      date: value.date,
      confidence: Number(value.confidence ?? 0.7),
    };
  }

  const amount = Number(value.amount ?? 0);
  const type = value.type === "income" ? "income" : "expense";

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    action: "transaction" as const,
    type,
    amount,
    note: String(value.note ?? "").slice(0, 180) || "Transaksi",
    date: value.date,
    confidence: Number(value.confidence ?? 0.7),
  };
}

function getFallbackResponse({
  text,
  today,
}: {
  text: string;
  today: string;
}) {
  const localIntent = parseLocalIntent(text, today);
  if (!localIntent) return null;

  return {
    ok: true,
    intent: localIntent,
    source: "local",
  };
}

function toUserSafeAiMessage(message: string) {
  if (/denied|permission|403/i.test(message)) {
    return "Project Gemini ditolak oleh Google. Buat API key dari project Google AI Studio/Cloud lain atau ajukan appeal di Google Cloud Console.";
  }
  return message || "AI parser gagal.";
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;

  const body = (await request.json().catch(() => ({}))) as { text?: string };
  const text = body.text?.trim() ?? "";

  if (!text) {
    return Response.json(
      { ok: false, message: "Teks transaksi masih kosong." },
      { status: 200 },
    );
  }

  const today = jakartaToday();
  const localIntent = parseLocalIntent(text, today);

  if (localIntent) {
    return Response.json(
      { ok: true, intent: localIntent, source: "local" },
      { status: 200 },
    );
  }

  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        message: "AI cloud belum aktif dan parser lokal belum memahami perintah ini.",
      },
      { status: 200 },
    );
  }

  const prompt = [
    "Ubah perintah natural BotUang bahasa Indonesia menjadi JSON valid saja.",
    "Pilih action: transaction, query, reminder, todo, atau command.",
    "Schema umum: {\"action\":\"transaction|query|reminder|todo|command\",\"type\":\"income|expense\",\"query_type\":\"balance|income|expense|summary|search\",\"amount\":number,\"note\":\"string\",\"date\":\"YYYY-MM-DD\",\"remind_type\":\"time|date|datetime|daily|weekly\",\"remind_value\":\"string\",\"remind_text\":\"string\",\"todo_text\":\"string\",\"keyword\":\"string\",\"response\":\"string\",\"confidence\":number}",
    "Aturan nominal: k/rb/ribu = x1000, jt/juta = x1000000.",
    "Jika kata mengarah keluar uang seperti pengeluaran, beli, bayar, konsumsi, minus, gunakan expense.",
    "Jika kata mengarah uang masuk seperti pemasukan, iuran, donasi, masuk, plus, gunakan income.",
    "Jika user menulis masukin/masukin uang, gunakan income kecuali ada kata beli/bayar/keluar.",
    "Jika user minta ingatkan/reminder/jadwal, gunakan action reminder dan isi remind_value.",
    "Jika user minta tambah tugas/todo, gunakan action todo.",
    "Jika user minta buat command/keyword/respon otomatis, gunakan action command.",
    "Jika user bertanya saldo, pemasukan, pengeluaran, rekap, atau cari transaksi, gunakan action query dan query_type yang sesuai.",
    `Tanggal hari ini: ${today}.`,
    `Teks: ${text}`,
  ].join("\n");

  try {
    let lastError = "";
    const model = getGeminiModel();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        signal: AbortSignal.timeout(4500),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    const data = (await response.json().catch(() => ({}))) as GeminiResponse & {
      error?: { message?: string };
    };
    if (!response.ok) {
      lastError = data.error?.message ?? `Gemini ${model} gagal (${response.status})`;
    } else {
      const output = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const parsed = JSON.parse(extractJson(output)) as ParsedIntent;
      const intent = validateIntent(parsed);
      if (intent) return Response.json({ ok: true, intent, source: "gemini", model }, { status: 200 });
      lastError = `Gemini ${model} tidak menghasilkan intent valid.`;
    }

    console.warn("[AI parser] Gemini fallback:", lastError);
    const fallback = getFallbackResponse({ text, today });
    if (fallback) {
      return Response.json(fallback, { status: 200 });
    }

    return Response.json(
      {
        ok: false,
        message: toUserSafeAiMessage(
          lastError || "AI parser gagal dan parser lokal belum memahami perintah ini.",
        ),
      },
      { status: 200 },
    );
  } catch {
    console.warn("[AI parser] AI cloud tidak tersedia.");
    const fallback = getFallbackResponse({ text, today });
    if (fallback) {
      return Response.json(fallback, { status: 200 });
    }

    return Response.json(
      { ok: false, message: "AI parser tidak tersedia." },
      { status: 200 },
    );
  }
}
