import type { Rule } from '@/types';

import { attachedTabs, cachedRules } from './state';
import { cleanupTabMaps } from './storage-queue';

export const hasEnabledBackgroundRules = (): boolean =>
  cachedRules.some((r) => r.enabled && r.mode === 'background');

export const hasEnabledInteractiveRules = (): boolean =>
  cachedRules.some((r) => r.enabled && r.mode === 'interactive');

export const shouldIntercept = (): boolean =>
  hasEnabledBackgroundRules() || hasEnabledInteractiveRules();

const escapeGlob = (s: string): string => s.replace(/[*?\\]/g, '\\$&');

const ruleToGlobPattern = (rule: Rule): string => {
  switch (rule.ruleType) {
    case 'CONTAINS':
      return `*${escapeGlob(rule.value)}*`;
    case 'EQUALS':
      return escapeGlob(rule.value);
    case 'REGEX':
      return rule.value;
  }
};

export const enableFetch = async (tabId: number): Promise<void> => {
  const patterns: Array<{ urlPattern: string; requestStage: string }> = [];
  for (const rule of cachedRules) {
    if (!rule.enabled) continue;
    const urlPattern = ruleToGlobPattern(rule);
    const needsRequest = rule.direction === 'REQUEST' || rule.direction === 'ANY';
    const needsResponse = rule.direction === 'RESPONSE' || rule.direction === 'ANY';
    if (needsRequest) patterns.push({ urlPattern, requestStage: 'Request' });
    if (needsResponse) patterns.push({ urlPattern, requestStage: 'Response' });
  }
  await chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', { patterns });
};

export const tryAttachTab = async (tabId: number): Promise<void> => {
  try {
    await chrome.debugger.attach({ tabId }, '1.3');
    await chrome.debugger.sendCommand({ tabId }, 'Network.enable', {});
    await enableFetch(tabId);
    attachedTabs.add(tabId);
  } catch (e) {
    console.warn(`[RF:sw] cannot attach to tab ${tabId}:`, e);
  }
};

export const tryDetachTab = async (tabId: number): Promise<void> => {
  try {
    await chrome.debugger.detach({ tabId });
  } catch {
    // Ignore — tab may already be closed
  }
  attachedTabs.delete(tabId);
  await cleanupTabMaps(tabId);
};
