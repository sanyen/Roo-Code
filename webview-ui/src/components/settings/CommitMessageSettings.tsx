import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import type { ProviderSettingsEntry } from "@roo-code/types"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import type { SetCachedStateField } from "./types"

interface CommitMessageSettingsProps {
	commitMessageApiConfig?: string
	currentApiConfigName?: string
	listApiConfigMeta?: ProviderSettingsEntry[]
	setCachedStateField: SetCachedStateField<"commitMessageApiConfig">
}

export const CommitMessageSettings = ({
	commitMessageApiConfig,
	currentApiConfigName,
	listApiConfigMeta = [],
	setCachedStateField,
}: CommitMessageSettingsProps) => {
	const { t } = useAppTranslation()

	return (
		<div>
			<label className="block font-medium mb-1">{t("settings:experimental.commitMessage.modelLabel")}</label>
			<VSCodeDropdown
				data-testid="commit-message-profile-select"
				value={commitMessageApiConfig ?? ""}
				onChange={(event: any) => setCachedStateField("commitMessageApiConfig", event.target.value)}
				className="w-full">
				<VSCodeOption value="">
					{currentApiConfigName
						? t("settings:experimental.commitMessage.activeProfile", { profileName: currentApiConfigName })
						: t("settings:experimental.commitMessage.activeProfileFallback")}
				</VSCodeOption>
				{listApiConfigMeta.map((profile) => (
					<VSCodeOption key={profile.id} value={profile.name}>
						{profile.modelId ? `${profile.name} (${profile.modelId})` : profile.name}
					</VSCodeOption>
				))}
			</VSCodeDropdown>
			<p className="text-vscode-descriptionForeground text-sm mt-1">
				{t("settings:experimental.commitMessage.modelDescription")}
			</p>
		</div>
	)
}
