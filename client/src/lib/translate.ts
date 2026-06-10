export async function translateText(text: string, targetLang: string, sourceLang: string = "auto"): Promise<string> {
  if (!text.trim()) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    // Response format: [[["translated","original",...],...],...]
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((s: any) => s[0]).join("");
    }
    return text;
  } catch {
    return text;
  }
}
