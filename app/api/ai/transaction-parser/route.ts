type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type ParsedIntent = {
  action?: "transaction" | "reminder" | "todo" | "command";
  type?: "income" | "expense";
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

function getGeminiModels() {
  const configured = process.env.GOOGLE_AI_MODEL?.trim();
  return [
    configured,
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
  ].filter((model, index, models): model is string =>
    Boolean(model && models.indexOf(model) === index),
  );
}

function parseMoney(value: string) {
  const cleaned = value.toLowerCase().replace(",", ".");
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*(jt|juta|rb|ribu|k)?/);
  if (!match) return 0;

  const amount = Number(match[1]);
  const suffix = match[2];
  if (!Number.isFinite(amount)) return 0;
  if (suffix === "jt" || suffix === "juta") return amount * 1_000_000;
  if (suffix === "rb" || suffix === "ribu" || suffix === "k") return amount * 1_000;
  return amount;
}

function parseLocalIntent(text: string, today: string) {
  const lower = text.toLowerCase();

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

  if (/^r\s+/i.test(text) || /\b(reminder|ingatkan|jadwal|rapat)\b/.test(lower)) {
    const time = lower.match(/(\d{1,2}[:.]\d{2})/)?.[1]?.replace(".", ":");
    const date = lower.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/)?.[1];
    const textAfterAt = text.includes("@") ? text.split("@").slice(1).join("@") : "";
    const remindText = (textAfterAt || text)
      .replace(/^r\s+/i, "")
      .replace(/\b(tolong|buat|bikin|tambah|reminder|ingatkan|jadwal)\b/gi, "")
      .replace(/\b(besok|hari ini|nanti|jam)\b/gi, "")
      .replace(/(\d{1,2}[:.]\d{2})/g, "")
      .replace(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/g, "")
      .trim();
    return validateIntent({
      action: "reminder",
      remind_type: date ? "date" : "time",
      remind_value: [date, time].filter(Boolean).join(" ") || time || date || "",
      remind_text: remindText || text,
      note: remindText || text,
      date: today,
      confidence: 0.55,
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

  const amount = parseMoney(text);
  if (amount > 0) {
    const isIncome =
      text.trim().startsWith("+") ||
      (/\b(pemasukan|masuk|income|donasi|iuran|kas masuk|terima|plus)\b/.test(lower) &&
        !/\b(pengeluaran|keluar|expense|beli|bayar|minus|-)\b/.test(lower));
    const note = text
      .replace(/[-+]?\s*\d+(?:[.,]\d+)?\s*(jt|juta|rb|ribu|k)?/i, "")
      .replace(/\b(pemasukan|pengeluaran|income|expense|masuk|keluar|beli|bayar|catat|tambahkan|tambah|plus|minus)\b/gi, "")
      .trim();
    return validateIntent({
      action: "transaction",
      type: isIncome ? "income" : "expense",
      amount,
      note: note || text,
      date: today,
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
  if (!["transaction", "reminder", "todo", "command"].includes(action)) {
    return null;
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
  debug,
}: {
  text: string;
  today: string;
  debug?: string;
}) {
  const localIntent = parseLocalIntent(text, today);
  if (!localIntent) return null;

  return {
    ok: true,
    intent: localIntent,
    source: "local",
    debug,
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

  const today = new Date().toISOString().slice(0, 10);

  if (!apiKey) {
    const fallback = getFallbackResponse({
      text,
      today,
      debug: "GEMINI_API_KEY/GOOGLE_AI_API_KEY belum diset.",
    });
    if (fallback) {
      return Response.json(fallback, { status: 200 });
    }

    return Response.json(
      {
        ok: false,
        message: "API key Gemini belum diset dan parser lokal belum memahami perintah ini.",
      },
      { status: 200 },
    );
  }

  const prompt = [
    "Ubah perintah natural BotUang bahasa Indonesia menjadi JSON valid saja.",
    "Pilih action: transaction, reminder, todo, atau command.",
    "Schema umum: {\"action\":\"transaction|reminder|todo|command\",\"type\":\"income|expense\",\"amount\":number,\"note\":\"string\",\"date\":\"YYYY-MM-DD\",\"remind_type\":\"time|date|datetime|daily|weekly\",\"remind_value\":\"string\",\"remind_text\":\"string\",\"todo_text\":\"string\",\"keyword\":\"string\",\"response\":\"string\",\"confidence\":number}",
    "Aturan nominal: k/rb/ribu = x1000, jt/juta = x1000000.",
    "Jika kata mengarah keluar uang seperti pengeluaran, beli, bayar, konsumsi, minus, gunakan expense.",
    "Jika kata mengarah uang masuk seperti pemasukan, iuran, donasi, masuk, plus, gunakan income.",
    "Jika user minta ingatkan/reminder/jadwal, gunakan action reminder dan isi remind_value.",
    "Jika user minta tambah tugas/todo, gunakan action todo.",
    "Jika user minta buat command/keyword/respon otomatis, gunakan action command.",
    `Tanggal hari ini: ${today}.`,
    `Teks: ${text}`,
  ].join("\n");

  try {
    let lastError = "";

    for (const model of getGeminiModels()) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
        method: "POST",
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
        const denied = response.status === 403 || /denied|permission/i.test(lastError);
        if (denied) break;
        continue;
      }

      const output = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const parsed = JSON.parse(extractJson(output)) as ParsedIntent;
      const intent = validateIntent(parsed);

      if (!intent) {
        lastError = `Gemini ${model} tidak menghasilkan intent valid.`;
        continue;
      }

      return Response.json({ ok: true, intent, source: "gemini", model }, { status: 200 });
    }

    const fallback = getFallbackResponse({ text, today, debug: lastError });
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
    const fallback = getFallbackResponse({
      text,
      today,
      debug: "AI cloud tidak tersedia.",
    });
    if (fallback) {
      return Response.json(fallback, { status: 200 });
    }

    return Response.json(
      { ok: false, message: "AI parser tidak tersedia." },
      { status: 200 },
    );
  }
}
