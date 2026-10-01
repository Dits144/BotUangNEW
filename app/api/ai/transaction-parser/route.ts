type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type ParsedIntent = {
  type?: "income" | "expense";
  amount?: number;
  note?: string;
  date?: string;
  confidence?: number;
};

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

function validateIntent(value: ParsedIntent) {
  const amount = Number(value.amount ?? 0);
  const type = value.type === "income" ? "income" : "expense";

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
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
    "Ubah teks transaksi kas grup Indonesia menjadi JSON valid saja.",
    "Schema: {\"type\":\"income|expense\",\"amount\":number,\"note\":\"string\",\"date\":\"YYYY-MM-DD\",\"confidence\":number}",
    "Aturan nominal: k/rb/ribu = x1000, jt/juta = x1000000.",
    "Jika kata mengarah keluar uang seperti pengeluaran, beli, bayar, konsumsi, minus, gunakan expense.",
    "Jika kata mengarah uang masuk seperti pemasukan, iuran, donasi, masuk, plus, gunakan income.",
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
