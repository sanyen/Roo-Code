import { beforeEach, describe, expect, it, vi } from "vitest"

import { buildApiHandler, type ApiHandler } from "../../../api"
import type { ApiStreamChunk } from "../../../api/transform/stream"
import type { ProviderSettings } from "@roo-code/types"

import { reviewCommand } from "../commandReview"

vi.mock("../../../api", () => ({
	buildApiHandler: vi.fn(),
}))

const apiConfiguration: ProviderSettings = { apiProvider: "anthropic" }
const request = {
	apiConfiguration,
	command: "git status",
	cwd: "/workspace",
	includeDecision: true,
	taskId: "task-id",
}

function setApiResponse(chunks: ApiStreamChunk[]) {
	const createMessage = vi.fn(async function* () {
		yield* chunks
	})
	const handler: ApiHandler = {
		createMessage,
		getModel: () => ({
			id: "test-model",
			info: { contextWindow: 1, supportsPromptCache: false },
		}),
		countTokens: async () => 0,
	}
	vi.mocked(buildApiHandler).mockReturnValue(handler)
	return createMessage
}

describe("reviewCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("returns the explanation and decision from the selected API profile", async () => {
		const createMessage = setApiResponse([
			{ type: "text", text: '{"decision":"approve","explanation":"Shows the current Git changes."}' },
		])

		await expect(reviewCommand(request)).resolves.toEqual({
			decision: "approve",
			explanation: "Shows the current Git changes.",
		})
		expect(buildApiHandler).toHaveBeenCalledWith(apiConfiguration)
		expect(createMessage).toHaveBeenCalledWith(
			expect.stringContaining("Do not execute commands"),
			[{ role: "user", content: expect.stringContaining('"git status"') }],
			{ taskId: "task-id", store: false, suppressPreviousResponseId: true },
		)
	})

	it("supports explanation-only reviews without requiring an approval decision", async () => {
		setApiResponse([{ type: "text", text: '{"explanation":"Lists the current Git changes."}' }])

		await expect(reviewCommand({ ...request, includeDecision: false })).resolves.toEqual({
			explanation: "Lists the current Git changes.",
		})
	})

	it("rejects malformed or incomplete approval results", async () => {
		setApiResponse([{ type: "text", text: '{"decision":"maybe","explanation":"Unclear."}' }])

		await expect(reviewCommand(request)).rejects.toThrow("valid approval decision")
	})

	it("rejects provider errors instead of treating them as approval", async () => {
		setApiResponse([{ type: "error", error: "request_failed", message: "Provider unavailable" }])

		await expect(reviewCommand(request)).rejects.toThrow("Provider unavailable")
	})
})
