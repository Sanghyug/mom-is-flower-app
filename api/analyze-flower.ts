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
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image is required" });
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
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: '사진 속 식물이나 꽃의 이름을 정확히 찾고, 해당 꽃의 일반적으로 알려진 대표 꽃말을 짧게 알려줘. 창작 위로문장은 만들지 마. 한국어 이름과 한국어 꽃말, 영어 이름과 영어 꽃말을 모두 제공해줘. 꽃말을 모르면 한국어는 "꽃말 정보 없음", 영어는 "No flower meaning found"라고 답해줘. 반드시 다음 JSON 포맷으로만 응답해줘: {"name": "한국어 꽃이름", "language": "한국어 대표 꽃말", "nameEn": "English flower name", "languageEn": "Representative flower meaning in English"}',
              },
              {
                type: "image_url",
                image_url: {
                  url: image,
                },
              },
            ],
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
        error: "OpenAI 응답에 분석 결과가 없습니다.",
      });
    }

    const parsedData = JSON.parse(choiceMessage);

    return res.status(200).json(parsedData);
  } catch (error) {
    console.error("analyze-flower error:", error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to analyze flower",
    });
  }
}
