import { openAiCodexDefaultModelId, openAiCodexModels } from "../providers/openai-codex.js"
import { openAiNativeDefaultModelId, openAiNativeModels } from "../providers/openai.js"

describe("OpenAI model catalogs", () => {
	it("adds the public GPT-6 Codex models without changing defaults", () => {
		expect(openAiNativeDefaultModelId).toBe("gpt-5.6-sol")
		expect(openAiCodexDefaultModelId).toBe("gpt-5.6-sol")

		expect(openAiCodexModels["gpt-6.1-sol"]).toMatchObject({
			contextWindow: 872000,
			maxTokens: 128000,
			requiredReasoningEffort: true,
			reasoningEffort: "low",
		})
		expect(openAiCodexModels["gpt-6.1-terra"]).toMatchObject({
			contextWindow: 872000,
			maxTokens: 128000,
			supportsReasoningEffort: ["low", "medium", "high", "xhigh", "max"],
			reasoningEffort: "low",
		})
		expect(openAiCodexModels["gpt-6-sol"]).toMatchObject({
			contextWindow: 872000,
			supportsReasoningEffort: ["low", "medium", "high", "xhigh", "max"],
		})
		expect(openAiCodexModels["gpt-6-luna"]).toMatchObject({
			contextWindow: 872000,
			supportsImages: true,
		})
	})

	it("includes GPT-6.1 Sol in the native API catalog with published pricing", () => {
		expect(openAiNativeModels["gpt-6.1-sol"]).toMatchObject({
			contextWindow: 1_050_000,
			maxTokens: 128000,
			inputPrice: 2,
			outputPrice: 10,
			cacheWritesPrice: 2.5,
			cacheReadsPrice: 0.1,
			requiredReasoningEffort: true,
		})
	})

	it("includes GPT-6.1 Terra in the native API catalog with published pricing", () => {
		expect(openAiNativeModels["gpt-6.1-terra"]).toMatchObject({
			contextWindow: 1_050_000,
			maxTokens: 128000,
			inputPrice: 1,
			outputPrice: 5,
			cacheWritesPrice: 1.25,
			cacheReadsPrice: 0.05,
			longContextPricing: {
				thresholdTokens: 272_000,
				inputPriceMultiplier: 2,
				outputPriceMultiplier: 1.5,
			},
			tiers: [
				{
					name: "flex",
					inputPrice: 0.5,
					outputPrice: 2.5,
				},
			],
		})
	})
})
