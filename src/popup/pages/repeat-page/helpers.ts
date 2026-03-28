import {
  buildRawText,
  buildRequestFirstLine,
  tryPrettify,
} from '@pages/modify-request-page/helpers';

import type { BodyLanguage, StoredEntry } from '@/types';

export type EntryEditState = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  bodyLanguage: BodyLanguage;
  activeTab: 'form' | 'text';
  rawText: string;
  isSending: boolean;
};

export const buildInitialEntryState = (entry: StoredEntry): EntryEditState => {
  const url = entry.url;
  const method = entry.method;
  const headers = entry.requestHeaders ?? {};
  const body = tryPrettify(entry.requestBody ?? '');
  const firstLine = buildRequestFirstLine(method, url);
  return {
    url,
    method,
    headers,
    body,
    bodyLanguage: 'json',
    activeTab: 'form',
    rawText: buildRawText(firstLine, headers, entry.requestBody),
    isSending: false,
  };
};

export const truncateUrl = (url: string, maxLen: number): string => {
  try {
    const { pathname } = new URL(url);
    const label = pathname.length > 1 ? pathname : url;
    return label.length > maxLen ? `${label.slice(0, maxLen)}…` : label;
  } catch {
    return url.length > maxLen ? `${url.slice(0, maxLen)}…` : url;
  }
};
