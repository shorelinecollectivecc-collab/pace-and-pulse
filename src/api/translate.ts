declare const process: {
  env: Record<string, string | undefined>;
};

type TranslateRequest = {
  method?: string;
  body?: {
    to?: unknown;
    texts?: unknown;
  };
};

type TranslateResponse = {
  status: (code: number) => TranslateResponse;
  json: (value: unknown) => void;
};

export default async function handler(
  request: TranslateRequest,
  response: TranslateResponse
) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "method not allowed" });
    return;
  }

  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  const to =
    typeof request.body?.to === "string"
      ? request.body.to.trim()
      : "";
  const texts = Array.isArray(request.body?.texts)
    ? request.body.texts
        .filter((text): text is string => typeof text === "string")
        .map((text) => text.trim())
        .filter(Boolean)
        .slice(0, 100)
    : [];

  if (!key || !region) {
    response
      .status(503)
      .json({ error: "translation service is not configured" });
    return;
  }

  if (!to || !/^[a-z0-9-]{2,16}$/i.test(to) || texts.length === 0) {
    response.status(400).json({ error: "invalid translation request" });
    return;
  }

  try {
    const azureResponse = await fetch(
      `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${encodeURIComponent(
        to
      )}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "ocp-apim-subscription-key": key,
          "ocp-apim-subscription-region": region,
        },
        body: JSON.stringify(
          texts.map((text) => ({
            text,
          }))
        ),
      }
    );

    if (!azureResponse.ok) {
      response
        .status(azureResponse.status)
        .json({ error: "translation request failed" });
      return;
    }

    const result = (await azureResponse.json()) as Array<{
      translations?: Array<{ text?: string }>;
    }>;

    response.status(200).json({
      translations: result.map(
        (item, index) =>
          item.translations?.[0]?.text ?? texts[index] ?? ""
      ),
    });
  } catch {
    response.status(500).json({ error: "translation request failed" });
  }
}
