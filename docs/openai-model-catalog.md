# Updating OpenAI Model Catalogs

Roo Code keeps OpenAI model metadata in the shared types package. The Codex catalog is useful for discovering model IDs and capabilities, but it is not the source of truth for native API pricing.

## Sources

- [OpenAI Codex model catalog](https://raw.githubusercontent.com/openai/codex/main/codex-rs/models-manager/models.json): model slugs, display names, visibility, default context windows, input modalities, and reasoning levels.
- [Codex model metadata implementation](https://github.com/openai/codex/blob/main/codex-rs/models-manager/src/model_info.rs): how Codex interprets its catalog fields and context limits.
- OpenAI's model documentation and pricing pages: native API availability, token limits, prices, service tiers, and long-context pricing.

## Local Catalogs

- [`packages/types/src/providers/openai-codex.ts`](../packages/types/src/providers/openai-codex.ts) lists models available through ChatGPT subscription authentication. Their token prices are `0` because billing is covered by the subscription.
- [`packages/types/src/providers/openai.ts`](../packages/types/src/providers/openai.ts) lists models available through the native OpenAI API. Add a model here only when native API availability and pricing are verified from OpenAI documentation.
- [`src/api/providers/openai-codex.ts`](../src/api/providers/openai-codex.ts) contains Codex-specific request behavior. Most catalog additions need no handler change, but models with special routing, headers, or Fast mode behavior may.

The `OpenAiCodexModelId` and `OpenAiNativeModelId` types are inferred from their respective catalog keys. Adding an entry makes the ID available to the corresponding provider; do not add duplicate IDs or change provider defaults as part of a model update unless that is intentional.

## Update Procedure

1. Inspect the upstream catalog and identify the exact `slug`. Include models whose `visibility` is `list`; do not expose entries marked `hide` or internal-purpose entries such as automatic review models.
2. Record the listed `display_name`, `description`, `input_modalities`, `supported_reasoning_levels`, and `default_reasoning_level`. Treat these as capability hints, not native API pricing data.
3. Verify context and output limits before copying them. The catalog's `context_window` can describe the default Codex compaction budget, not the largest supported context. Check model-specific Codex metadata and official documentation before configuring a larger `contextWindow`; document the basis when the configured limit intentionally differs.
4. Add the exact model slug to `openAiCodexModels` when it is available through Codex. Set subscription `inputPrice` and `outputPrice` to `0`, and configure its context, output limit, tools, image/cache support, reasoning efforts, required-effort flag, default effort, and description from verified model capabilities.
5. Add the model to `openAiNativeModels` only if it is also available through the native API. Verify input/output and cached-token prices, supported service tiers, long-context thresholds and multipliers, and native token limits. Do not infer these values from the Codex catalog or from a similarly named model.
6. Check the Codex handler for model-specific request requirements. Update routing or headers only when the upstream implementation or a verified request demonstrates that the model needs them.
7. Add or update catalog assertions and provider request tests. Keep existing default model IDs unchanged unless changing defaults is part of the request.

## Metadata Notes

- `contextWindow` is the maximum prompt context Roo Code will advertise/use for that catalog entry; verify it independently from a default compaction threshold.
- `maxTokens` is the maximum generated output token count.
- `supportsReasoningEffort` should list only efforts accepted by the model. Set `requiredReasoningEffort` when the API requires an effort value, and make `reasoningEffort` a supported default. Required-effort models must retain a valid default when the user disables reasoning or selects an unsupported value.
- `supportsImages`, `supportsPromptCache`, and `supportsVerbosity` describe model capabilities, not provider-wide defaults.
- Native `cacheReadsPrice` and `cacheWritesPrice` are per-million-token prices, like `inputPrice` and `outputPrice`. Keep service-tier prices and long-context multipliers consistent with OpenAI's published pricing.
- `includedTools` and `excludedTools` control Roo Code's tool choices for the model; confirm tool restrictions rather than assuming all OpenAI models behave alike.

## Validation

Run the focused catalog tests after editing model metadata:

```sh
pnpm --filter @roo-code/types exec vitest run src/__tests__/openai-models.test.ts
```

For Codex request behavior, run the relevant provider test, for example:

```sh
pnpm --dir src exec vitest run api/providers/__tests__/openai-codex.spec.ts
```

Then run the repository type check and verify there are no duplicate object keys or whitespace errors:

```sh
pnpm check-types
git diff --check
```
