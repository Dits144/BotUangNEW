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

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  const model = process.env.GOOGLE_AI_MODEL ?? "gemini-2.0-flash";

  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        message: "GOOGLE_AI_API_KEY belum diset di server.",
      },
      { status: 200 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { text?: string };
  const text = body.text?.trim() ?? "";

  if (!text) {
    return Response.json(
      { ok: false, message: "Teks transaksi masih kosong." },
      { status: 200 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      return Response.json(
        { ok: false, message: data.error?.message ?? "AI parser gagal." },
        { status: 200 },
      );
    }

    const output = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(extractJson(output)) as ParsedIntent;
    const intent = validateIntent(parsed);

    if (!intent) {
      return Response.json(
        { ok: false, message: "AI belum menemukan nominal transaksi." },
        { status: 200 },
      );
    }

    return Response.json({ ok: true, intent }, { status: 200 });
  } catch {
    return Response.json(
      { ok: false, message: "AI parser tidak tersedia." },
      { status: 200 },
    );
  }
}
