import type { ExternalViewModelInput, HeadquartersViewModelInput } from "./projectSitesViewModels";

export function buildExternalProjectSitesWorkspaceInput(
  input: ExternalViewModelInput,
): ExternalViewModelInput {
  return {
    ...input,
    permissions: {
      ...input.permissions,
      canIssueUsage: false,
    },
  };
}

export function buildHeadquartersProjectSitesWorkspaceInput(
  input: HeadquartersViewModelInput,
): HeadquartersViewModelInput {
  return input;
}
