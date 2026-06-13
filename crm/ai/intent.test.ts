import { runIntentValidationAgent } from "./intent";
import { getAIService } from "../lib/ai";

// Mock the AI service
jest.mock("../lib/ai", () => ({
  getAIService: jest.fn(),
}));

describe("Goal Confidence Validation Engine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Layer 1: Deterministic Filters", () => {
    it("rejects empty prompts", async () => {
      const result = await runIntentValidationAgent("   ");
      expect(result.confidenceScore).toBeLessThan(0.30);
      expect(result.explanation).toContain("Input rejected");
      expect(getAIService).not.toHaveBeenCalled();
    });

    it("rejects emoji-only prompts", async () => {
      const result = await runIntentValidationAgent("😂😂😂 👍");
      expect(result.confidenceScore).toBeLessThan(0.30);
      expect(getAIService).not.toHaveBeenCalled();
    });

    it("rejects keyboard mashing", async () => {
      const result = await runIntentValidationAgent("asdfghjkl");
      expect(result.confidenceScore).toBeLessThan(0.30);
      
      const result2 = await runIntentValidationAgent(";;;;;;;;");
      expect(result2.confidenceScore).toBeLessThan(0.30);
      expect(getAIService).not.toHaveBeenCalled();
    });
  });

  describe("Layer 2: Simple Intent Matcher", () => {
    it("auto-approves high-confidence shorthand without calling LLM", async () => {
      const inputs = [
        "vip customer email",
        "inactive users offer",
        "send msg old customer",
        "coffee coupon loyal",
        "repeat purchase campaign"
      ];

      for (const input of inputs) {
        const result = await runIntentValidationAgent(input);
        expect(result.confidenceScore).toBeGreaterThanOrEqual(0.95);
        expect(result.explanation).toContain("deterministic pattern matching");
      }
      expect(getAIService).not.toHaveBeenCalled();
    });
  });

  describe("Layer 3: LLM Intent Validator", () => {
    it("handles weak English gracefully (High Confidence)", async () => {
      (getAIService as jest.Mock).mockReturnValue({
        callModel: jest.fn().mockResolvedValue({
          text: JSON.stringify({
            normalizedGoal: "Send an email to active customers in Delhi.",
            confidenceScore: 0.88,
            explanation: "Goal is clear despite poor grammar."
          })
        })
      });

      const result = await runIntentValidationAgent("delhi ppl email send active");
      expect(result.confidenceScore).toBe(0.88);
      expect(result.normalizedGoal).toBe("Send an email to active customers in Delhi.");
    });

    it("flags vague requests for confirmation (Medium Confidence)", async () => {
      (getAIService as jest.Mock).mockReturnValue({
        callModel: jest.fn().mockResolvedValue({
          text: JSON.stringify({
            normalizedGoal: "Increase revenue",
            confidenceScore: 0.45,
            explanation: "Marketing intent is present, but extremely vague."
          })
        })
      });

      const result = await runIntentValidationAgent("increase revenue somehow");
      expect(result.confidenceScore).toBe(0.45);
    });

    it("rejects contradictory requests (Low Confidence)", async () => {
      (getAIService as jest.Mock).mockReturnValue({
        callModel: jest.fn().mockResolvedValue({
          text: JSON.stringify({
            normalizedGoal: "Send an email to no one but everyone.",
            confidenceScore: 0.10,
            explanation: "Logically contradictory request."
          })
        })
      });

      const result = await runIntentValidationAgent("Send an email to no one but make sure everyone gets it.");
      expect(result.confidenceScore).toBe(0.10);
    });

    it("rejects non-marketing requests (Low Confidence)", async () => {
      (getAIService as jest.Mock).mockReturnValue({
        callModel: jest.fn().mockResolvedValue({
          text: JSON.stringify({
            normalizedGoal: "Help me fix my printer.",
            confidenceScore: 0.05,
            explanation: "Not related to CRM marketing."
          })
        })
      });

      const result = await runIntentValidationAgent("help me fix my printer");
      expect(result.confidenceScore).toBe(0.05);
    });
  });
});
