import type { Group, Rule, RuleMode } from '../types';

const STORAGE_KEY = 'rulesState';

export type PersistedRulesState = {
  rules: Rule[];
  groups: Group[];
  activeMode: RuleMode;
};

export async function loadPersistedRules(): Promise<PersistedRulesState | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as PersistedRulesState) ?? null;
}

export async function savePersistedRules(state: PersistedRulesState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}
