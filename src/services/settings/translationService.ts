export async function translateTextBatch(
  language: string,
  texts: string[]
): Promise<string[]> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ to: language, texts }),
  });

  if (!response.ok) throw new Error("translation request failed");
  const result = (await response.json()) as { translations?: string[] };
  return texts.map((text, index) => result.translations?.[index] ?? text);
}
