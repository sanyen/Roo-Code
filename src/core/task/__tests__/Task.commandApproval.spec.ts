import { beforeEach, describe, expect, it, vi } from "vitest"
import * as i18n from "../../../i18n"

import { Task } from "../Task"

describe("Task command approval review", () => {
	let task: Task
	let reviewCommandApproval: ReturnType<typeof vi.fn>
	let providerState: Record<string, unknown>
	let postMessageToWebview: ReturnType<typeof vi.fn>

	beforeEach(() => {
		postMessageToWebview = vi.fn()
		providerState = {
			autoApprovalEnabled: false,
			llmCommandApprovalEnabled: true,
			llmCommandApprovalAutoApprove: true,
			llmCommandApprovalAutoApproveCommands: false,
			llmCommandApprovalAutoDenyCommands: false,
		}
		task = Object.create(Task.prototype) as Task
		Object.assign(task, {
			abort: false,
			clineMessages: [],
			askResponse: undefined,
			askResponseText: undefined,
			askResponseImages: undefined,
			lastMessageTs: undefined,
			messageQueueService: { isEmpty: () => true },
			providerRef: {
				deref: () => ({
					getState: async () => providerState,
					postMessageToWebview,
				}),
			},
		})
		Object.defineProperty(task, "cwd", { value: "/workspace" })
		Object.assign(task, {
			addToClineMessages: vi.fn(async (message) => task.clineMessages.push(message)),
			saveClineMessages: vi.fn(async () => {}),
			cancelAutoApprovalTimeout: vi.fn(),
			emit: vi.fn(),
		})
		reviewCommandApproval = vi.fn(async () => ({
			explanation: "Lists the current Git changes.",
			decision: "deny" as const,
		}))
		Object.assign(task, {
			reviewCommandApproval,
		})
	})

	it("shows the verdict and explanation on the command when automatic denial is disabled", async () => {
		const askPromise = task.ask("command", "git status", false)

		await vi.waitFor(() => expect(reviewCommandApproval).toHaveBeenCalledWith("git status", expect.any(Object)))
		expect(task.clineMessages[0].commandReview).toEqual({
			explanation: "Lists the current Git changes.",
			decision: "deny",
			automatic: false,
		})
		expect(postMessageToWebview).toHaveBeenCalledWith({
			type: "messageUpdated",
			clineMessage: task.clineMessages[0],
		})

		task.approveAsk()
		await expect(askPromise).resolves.toMatchObject({ response: "yesButtonClicked" })
	})

	it("passes the AI explanation back to the main model when auto-denying", async () => {
		const translateSpy = vi.spyOn(i18n, "t")
		providerState.llmCommandApprovalAutoDenyCommands = true

		await expect(task.ask("command", "rm -rf build", false)).resolves.toMatchObject({
			response: "noButtonClicked",
			text: "commandReview.denied",
		})
		expect(task.clineMessages[0].commandReview).toMatchObject({ automatic: true, decision: "deny" })
		expect(translateSpy).toHaveBeenCalledWith("tools:commandReview.denied", {
			explanation: "Lists the current Git changes.",
		})
	})

	it("auto-approves only when the AI verdict is approval and auto-approve is enabled", async () => {
		providerState.llmCommandApprovalAutoApproveCommands = true
		reviewCommandApproval.mockResolvedValue({
			explanation: "This only reads the repository status.",
			decision: "approve",
		})

		await expect(task.ask("command", "git status", false)).resolves.toMatchObject({
			response: "yesButtonClicked",
		})
		expect(task.clineMessages[0].commandReview).toMatchObject({ automatic: true, decision: "approve" })
	})

	it("does not call the reviewer for streaming partial command asks", async () => {
		await expect(task.ask("command", "git sta", true)).rejects.toThrow("new partial")
		expect(reviewCommandApproval).not.toHaveBeenCalled()
	})
})
