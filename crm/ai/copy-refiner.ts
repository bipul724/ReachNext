import { getAIService } from "../lib/ai";
import { cleanJsonString } from "./schemas";

export async function refineCopyHybrid(
  instruction: string,
  currentSubject: string,
  currentBody: string,
  currentExplanation: string
): Promise<{ subject: string; body: string; explainContent: string; usedLLM: boolean }> {
  const lowercaseInstruction = instruction.toLowerCase();

  // 1. Local Deterministic Transforms
  if (lowercaseInstruction.includes("add emoji") || lowercaseInstruction.includes("emojis")) {
    return {
      subject: currentSubject ? `🔥 ${currentSubject} 🚀` : "",
      body: `✨ ${currentBody} ✨`,
      explainContent: `${currentExplanation} (Added emojis locally).`,
      usedLLM: false,
    };
  }

  if (lowercaseInstruction.includes("remove emoji")) {
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}]/gu;
    return {
      subject: currentSubject.replace(emojiRegex, '').trim(),
      body: currentBody.replace(emojiRegex, '').trim(),
      explainContent: `${currentExplanation} (Removed emojis locally).`,
      usedLLM: false,
    };
  }

  if (lowercaseInstruction.includes("shorten") || lowercaseInstruction.includes("shorter")) {
    const sentences = currentBody.split('. ');
    const shorterBody = sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join('. ') + (sentences.length > 1 ? '.' : '');
    return {
      subject: currentSubject,
      body: shorterBody,
      explainContent: `${currentExplanation} (Shortened locally).`,
      usedLLM: false,
    };
  }

  // 2. LLM Rewrites for Tone/Style
  const prompt = `
You are the Campaign Copilot for a CRM editing existing marketing copy.

Preserve:
* the offer exactly as written
* the campaign channel
* the target audience intent
* the CTA intent

Only modify:
* tone
* wording
* urgency
* style

Do not invent new promotions.

Current Subject: "${currentSubject}"
Current Body: "${currentBody}"

User Instruction: "${instruction}"

Output a JSON object with the exact keys:
{
  "subject": "The new subject line (if applicable, else empty string)",
  "body": "The rewritten message body based on the instruction",
  "explanation": "A short explanation of how you adapted the copy tone."
}
Return ONLY valid JSON without markdown fences.
`;

  try {
    const { text } = await getAIService().callModel({
      task: "copy_refinement",
      userPrompt: prompt,
      temperature: 0.7,
    });
    
    const parsed = JSON.parse(cleanJsonString(text));
    
    return {
      subject: parsed.subject || currentSubject,
      body: parsed.body || currentBody,
      explainContent: parsed.explanation || currentExplanation,
      usedLLM: true,
    };
  } catch (err) {
    console.error("LLM Copy Refinement failed, returning original:", err);
    return {
      subject: currentSubject,
      body: currentBody,
      explainContent: currentExplanation,
      usedLLM: false,
    };
  }
}
