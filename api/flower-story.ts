export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Flower name is required" });
    }

    const apiKey =
      process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OpenAI API Key가 Vercel Production 환경변수에 없습니다.",
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: `꽃 이름은 "${name}"입니다.

이 꽃에 대한 정보를 한국어로 정리해줘.

반드시 아래 JSON 형식으로만 응답해줘.

{
  "summary": "짧은 소개",
  "habitat": "주로 자라는 곳",
  "origin": "원산지 또는 유래",
  "season": "개화 시기",
  "features": "생김새와 특성",
  "meaningOrigin": "꽃말의 배경 또는 상징",
  "legend": "설화, 전설, 민속적 이야기",
  "art": "문학, 예술, 대중문화 속 의미"
}

주의사항:
- 시, 노래, 소설 등의 문장을 직접 인용하지 마.
- 작품명, 작가명, 상징적 의미 중심으로 설명해.
- 확실하지 않은 내용은 단정하지 말고 "널리 확인되지는 않음"이라고 써.
- 각 항목은 1~3문장으로 짧게 써.`,
          },
        ],
      }),
    });

    const result: any = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: result.error?.message || "OpenAI API 호출 실패",
      });
    }

    const choiceMessage = result.choices?.[0]?.message?.content;

    if (!choiceMessage) {
      return res.status(500).json({
        error: "OpenAI 응답에 꽃 이야기 결과가 없습니다.",
      });
    }

    const parsedData = JSON.parse(choiceMessage);

    return res.status(200).json(parsedData);
  } catch (error) {
    console.error("flower-story error:", error);
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to create flower story",
    });
  }
}
