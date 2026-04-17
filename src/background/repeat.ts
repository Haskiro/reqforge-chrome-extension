import type { PopupToWorker, RepeatResponse } from '../shared/messages';
import { attachedTabs, replaySkipUrls } from './state';

const FORBIDDEN_HEADERS = new Set([
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie2',
  'date',
  'dnt',
  'expect',
  'host',
  'keep-alive',
  'origin',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'via',
]);

export const filterHeaders = (headers: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers).filter(
      ([k]) =>
        !FORBIDDEN_HEADERS.has(k.toLowerCase()) &&
        !k.toLowerCase().startsWith('proxy-') &&
        !k.toLowerCase().startsWith('sec-'),
    ),
  );

type FetchResult = { status: number; headers: Record<string, string>; body: string };

const tabFetch = async (
  tabId: number,
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | undefined,
): Promise<FetchResult> => {
  const count = replaySkipUrls.get(url) ?? 0;
  replaySkipUrls.set(url, count + 1);
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (
        fetchUrl: string,
        fetchMethod: string,
        fetchHeaders: Record<string, string>,
        fetchBody: string | null,
      ): Promise<FetchResult> => {
        const init: RequestInit = { method: fetchMethod, headers: fetchHeaders };
        if (fetchBody && !['GET', 'HEAD'].includes(fetchMethod)) init.body = fetchBody;
        const r = await fetch(fetchUrl, init);
        const rb = await r.text();
        const rh: Record<string, string> = {};
        r.headers.forEach((v, k) => {
          rh[k] = v;
        });
        return { status: r.status, headers: rh, body: rb };
      },
      args: [url, method, headers, body ?? null],
    });
    const result = results[0].result;
    if (!result) throw new Error('executeScript returned no result');
    return result;
  } finally {
    const remaining = (replaySkipUrls.get(url) ?? 1) - 1;
    if (remaining <= 0) replaySkipUrls.delete(url);
    else replaySkipUrls.set(url, remaining);
  }
};

const swFetch = async (
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | undefined,
): Promise<FetchResult> => {
  const init: RequestInit = { method, headers };
  if (body && !['GET', 'HEAD'].includes(method)) init.body = body;
  const r = await fetch(url, init);
  const rb = await r.text();
  const rh: Record<string, string> = {};
  r.headers.forEach((v, k) => {
    rh[k] = v;
  });
  return { status: r.status, headers: rh, body: rb };
};

export const handleRepeat = async (
  msg: Extract<PopupToWorker, { type: 'REPEAT' }>,
  sendResponse: (r: RepeatResponse) => void,
): Promise<void> => {
  const url = msg.editedUrl ?? msg.entry.url;
  const method = msg.editedMethod ?? msg.entry.method;
  const rawHeaders = msg.editedHeaders ?? msg.entry.requestHeaders;
  const headers = filterHeaders(rawHeaders);
  const body = msg.editedBody ?? msg.entry.requestBody;

  try {
    let result: FetchResult;
    if (msg.entry.tabId != null && attachedTabs.has(msg.entry.tabId)) {
      try {
        result = await tabFetch(msg.entry.tabId, url, method, headers, body);
      } catch {
        result = await swFetch(url, method, headers, body);
      }
    } else {
      result = await swFetch(url, method, headers, body);
    }
    sendResponse({ ok: true, status: result.status, headers: result.headers, body: result.body });
  } catch (e) {
    sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
};
