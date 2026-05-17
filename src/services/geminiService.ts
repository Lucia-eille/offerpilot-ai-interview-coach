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
    console.warn("Gemini API Key missing, skipping real API call.");
    return null;
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
    const response = await result.response;
    const text = response.text();
    if (!text) throw new Error("Empty response from AI");
    
    // Clean up markdown if present
    const jsonString = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn("Gemini Service Error:", error);
    return null; // Return null so the caller can fallback to mock
  }
}

export async function generateQuestions(role: string, analysis: any) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Gemini API Key missing for questions, using mock.");
    return null;
  }

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
    const response = await result.response;
    const text = response.text();
    if (!text) throw new Error("Empty response");

    const jsonString = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn("Gemini Generate Questions Error:", error);
    return null;
  }
}

export async function analyzeAnswer(role: string, question: string, answer: string, mode: 'text' | 'voice') {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Gemini API Key missing for answer analysis, using mock.");
    return null;
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Role: ${role}
    Question: ${question}
    Answer: ${answer} (Submitted via ${mode})

    Analyze the candidate's answer for an interview.
    Output a JSON object with these exact keys:
    {
      "score": number (0-100),
      "grade": "string (e.g. 卓越匹配, 表现良好, 仍需磨炼)",
      "summary": "string (a brief high-level diagnostic summary)",
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
    Rules:
    - If the answer is submitted via voice, prioritize assessing delivery metrics in "voiceMetrics".
    - Return ONLY the JSON object.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    if (!text) throw new Error("Empty response");

    const jsonString = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonString);
    return parsed;
  } catch (error) {
    console.warn("Gemini Analyze Answer Error:", error);
    return null;
  }
}
