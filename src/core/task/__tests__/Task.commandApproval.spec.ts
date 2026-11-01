import { beforeEach, describe, expect, it, vi } from "vitest"

import { Task } from "../Task"

describe("Task command approval review", () => {
	let task: Task
	let reviewCommandApproval: ReturnType<typeof vi.fn>
	let say: ReturnType<typeof vi.fn>

	beforeEach(() => {
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
					getState: async () => ({
						autoApprovalEnabled: false,
						llmCommandApprovalEnabled: true,
						llmCommandApprovalAutoApprove: false,
					}),
					postMessageToWebview: vi.fn(),
				}),
			},
		})
		Object.defineProperty(task, "cwd", { value: "/workspace" })
		Object.assign(task, {
			addToClineMessages: vi.fn(async () => {}),
			saveClineMessages: vi.fn(async () => {}),
			updateClineMessage: vi.fn(async () => {}),
			cancelAutoApprovalTimeout: vi.fn(),
			emit: vi.fn(),
		})
		say = vi.fn(async () => undefined)
		reviewCommandApproval = vi.fn(async () => ({
			explanation: "Lists the current Git changes.",
		}))
		Object.assign(task, {
			say,
			reviewCommandApproval,
		})
	})

	it("reviews completed command approval asks passed with partial=false", async () => {
		const askPromise = task.ask("command", "git status", false)

		await vi.waitFor(() => expect(reviewCommandApproval).toHaveBeenCalledWith("git status", expect.any(Object)))
		expect(say).toHaveBeenCalledWith("text", "commandReview.result", undefined, undefined, undefined, undefined, {
			isNonInteractive: true,
		})

		task.approveAsk()
		await expect(askPromise).resolves.toMatchObject({ response: "yesButtonClicked" })
	})

	it("does not call the reviewer for streaming partial command asks", async () => {
		await expect(task.ask("command", "git sta", true)).rejects.toThrow("new partial")
		expect(reviewCommandApproval).not.toHaveBeenCalled()
	})
})
