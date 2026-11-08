import * as vscode from "vscode"
import type { ClineProvider } from "../../core/webview/ClineProvider"
import { generateCommitMessage } from "../registerCommitMessage"
import { singleCompletionHandler } from "../../utils/single-completion-handler"

vi.mock("vscode", () => ({
	commands: { registerCommand: vi.fn() },
	extensions: { getExtension: vi.fn() },
	workspace: {
		getConfiguration: vi.fn().mockReturnValue({ get: vi.fn().mockReturnValue("") }),
	},
	window: {
		activeTextEditor: undefined,
		showErrorMessage: vi.fn(),
		showInformationMessage: vi.fn(),
		showQuickPick: vi.fn(),
		showWarningMessage: vi.fn(),
	},
}))

vi.mock("../../utils/single-completion-handler", () => ({
	singleCompletionHandler: vi.fn(),
}))

vi.mock("../../i18n", () => ({
	t: (key: string, options?: { error: string }) =>
		key === "common:commit_message.failed" ? `${key}: ${options?.error}` : key,
}))

describe("generateCommitMessage", () => {
	const repository = {
		rootUri: { fsPath: "/workspace" },
		inputBox: { value: "" },
		diff: vi.fn(),
	}
	const outputChannel = { appendLine: vi.fn() }
	const provider = {
		getState: vi.fn().mockResolvedValue({ apiConfiguration: { apiProvider: "anthropic" } }),
		providerSettingsManager: {
			getProfile: vi.fn(),
		},
	}

	beforeEach(() => {
		vi.clearAllMocks()
		provider.getState.mockResolvedValue({ apiConfiguration: { apiProvider: "anthropic" } })
		provider.providerSettingsManager.getProfile.mockReset()
		vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
			get: vi.fn().mockReturnValue(""),
		} as never)
		repository.inputBox.value = ""
		repository.diff.mockResolvedValue("diff --git a/file b/file")
		vi.mocked(vscode.extensions.getExtension).mockReturnValue({
			activate: vi.fn().mockResolvedValue({ getAPI: () => ({ repositories: [repository] }) }),
		} as never)
		vi.mocked(singleCompletionHandler).mockResolvedValue("  feat: add feature\n")
	})

	it("generates a message from staged changes and writes it to the native Git input box", async () => {
		await generateCommitMessage({
			context: {} as vscode.ExtensionContext,
			outputChannel: outputChannel as unknown as vscode.OutputChannel,
			provider: provider as unknown as ClineProvider,
		})

		expect(repository.diff).toHaveBeenCalledWith(true)
		expect(singleCompletionHandler).toHaveBeenCalledWith(
			{ apiProvider: "anthropic" },
			expect.stringContaining("diff --git a/file b/file"),
		)
		expect(repository.inputBox.value).toBe("feat: add feature")
		expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("common:commit_message.generated")
	})

	it("does not call the model when there are no staged changes", async () => {
		repository.diff.mockResolvedValue("")

		await generateCommitMessage({
			context: {} as vscode.ExtensionContext,
			outputChannel: outputChannel as unknown as vscode.OutputChannel,
			provider: provider as unknown as ClineProvider,
		})

		expect(singleCompletionHandler).not.toHaveBeenCalled()
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith("common:commit_message.no_staged_changes")
	})

	it("uses the API profile configured in VS Code settings", async () => {
		const configuredProfile = { apiProvider: "openai", openAiModelId: "gpt-4.1" }
		provider.providerSettingsManager.getProfile.mockResolvedValue(configuredProfile)
		vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
			get: vi.fn().mockReturnValue("Commit profile"),
		} as never)

		await generateCommitMessage({
			context: {} as vscode.ExtensionContext,
			outputChannel: outputChannel as unknown as vscode.OutputChannel,
			provider: provider as unknown as ClineProvider,
		})

		expect(provider.providerSettingsManager.getProfile).toHaveBeenCalledWith({ name: "Commit profile" })
		expect(singleCompletionHandler).toHaveBeenCalledWith(
			configuredProfile,
			expect.stringContaining("diff --git a/file b/file"),
		)
	})
})
