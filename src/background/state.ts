import type { Rule } from '@/types';

export let popupWindowId: number | undefined;
export const setPopupWindowId = (id: number | undefined) => {
  popupWindowId = id;
};

export let targetTabId: number | undefined;
export const setTargetTabId = (id: number | undefined) => {
  targetTabId = id;
};

export let cachedRules: Rule[] = [];
export const setCachedRules = (rules: Rule[]) => {
  cachedRules = rules;
};

export const attachedTabs = new Set<number>();

export const cdpKeyToEntry = new Map<string, string>();
export const entryToCdp = new Map<string, { tabId: number; cdpRequestId: string }>();
export const networkToEntry = new Map<string, string>();
export const replaySkipUrls = new Map<string, number>();
