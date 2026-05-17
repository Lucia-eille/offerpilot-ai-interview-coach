import { GoogleGenerativeAI } from "@google/generative-ai";

const getApiKey = () => {
  // Try VITE_ prefixed first (Vercel standard for vite client)
  // Then try non-prefixed (Vercel generic)
  return import.meta.env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || "";
};

const genAI = new GoogleGenerativeAI(getApiKey());

export async function analyzeJD(role: string, jd: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Missing Gemini API Key");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    You are an expert HR and Technical Recruiter. Analyze the following Target Role and Job Description (JD).
    Target Role: ${role}
    JD: ${jd}

    Output a JSON object with exactly this structure:
    {
      "responsibilities": ["string", ...],
      "competencies": ["string", ...],
      "skills": ["string", ...],
      "softSkills": ["string", ...],
      "focus": ["string", ...],
      "risks": ["string", ...]
    }

    Rules:
    - Focus on the most critical 3-5 items for each category.
    - Risks should be potential "traps" or difficult areas the candidate should prepare for.
    - Return ONLY the JSON object.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Clean up markdown if present
    const jsonString = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Gemini Analyze JD Error:", error);
    throw error;
  }
}

export async function generateQuestions(role: string, analysis: any) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Missing Gemini API Key");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Based on the following Job Analysis, generate 5 highly relevant interview questions.
    Role: ${role}
    Analysis: ${JSON.stringify(analysis)}

    Output a JSON array of objects with this structure:
    [
      { "id": "1", "text": "...", "type": "...", "focus": "..." },
      ...
    ]
    Return ONLY the JSON.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonString = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Gemini Generate Questions Error:", error);
    throw error;
  }
}

export async function analyzeAnswer(role: string, question: string, answer: string, mode: 'text' | 'voice') {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Missing Gemini API Key");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Role: ${role}
    Question: ${question}
    Answer: ${answer} (Submitted via ${mode})

    Analyze the candidate's answer for an interview.
    Output a JSON object:
    {
      "score": number (0-100),
      "matching": "string",
      "structure": "string",
      "completeness": "string",
      "clarity": "string",
      "pros": ["string", ...],
      "cons": ["string", ...],
      "suggestions": ["string", ...],
      "optimizedAnswer": "string (a better version of the answer using STAR framework)",
      "voiceMetrics": { "fluency": number, "stability": number, "confidence": number }
    }
    Return ONLY the JSON.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonString = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonString);
    return parsed;
  } catch (error) {
    console.error("Gemini Analyze Answer Error:", error);
    throw error;
  }
}
