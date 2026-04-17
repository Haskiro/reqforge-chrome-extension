import type { PopupToWorker } from '../shared/messages';
import { stringToBase64 } from './helpers';
import { handleRepeat } from './repeat';
import { cdpKeyToEntry, entryToCdp } from './state';
import { deleteEntries, deleteEntry, saveCdpMaps } from './storage-queue';

export const handleProceed = async (
  msg: Extract<PopupToWorker, { type: 'PROCEED' }>,
): Promise<void> => {
  const { entry, editedUrl, editedMethod, editedHeaders, editedBody } = msg;
  const cdpInfo = entryToCdp.get(entry.id);
  if (!cdpInfo) {
    console.warn(`[RF:sw] PROCEED: no CDP info for entry ${entry.id}`);
    return;
  }
  const { tabId, cdpRequestId } = cdpInfo;
  const continueParams: Record<string, unknown> = { requestId: cdpRequestId };
  if (editedUrl !== undefined) continueParams.url = editedUrl;
  if (editedMethod !== undefined) continueParams.method = editedMethod;
  if (editedHeaders !== undefined) {
    const finalHeaders = { ...editedHeaders };
    for (const key of Object.keys(entry.requestHeaders ?? {})) {
      if (!(key in finalHeaders)) finalHeaders[key] = '';
    }
    continueParams.headers = Object.entries(finalHeaders).map(([name, value]) => ({ name, value }));
  }
  if (editedBody !== undefined) {
    continueParams.postData = stringToBase64(editedBody);
  }
  try {
    await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', continueParams);
  } catch (e) {
    console.error('[RF:sw] continueRequest failed:', e);
  }
  await deleteEntry(entry.id);
};

export const handleApplyResponse = async (
  msg: Extract<PopupToWorker, { type: 'APPLY_RESPONSE' }>,
): Promise<void> => {
  const { entryId, editedBody, editedResponseHeaders, editedResponseStatus } = msg;
  const cdpInfo = entryToCdp.get(entryId);
  if (!cdpInfo) {
    console.warn(`[RF:sw] APPLY_RESPONSE: no CDP info for entry ${entryId}`);
    return;
  }
  const { tabId, cdpRequestId } = cdpInfo;
  const result = await chrome.storage.local.get('entries');
  const entries = (result.entries as import('@/types').StoredEntry[]) ?? [];
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return;
  try {
    const hasEdits = editedBody !== undefined || editedResponseHeaders !== undefined;
    if (hasEdits) {
      const statusCode = editedResponseStatus ?? entry.responseStatus ?? 200;
      const finalHeaders = editedResponseHeaders ?? entry.responseHeaders ?? {};
      const cdpHeaders = Object.entries(finalHeaders).map(([name, value]) => ({
        name,
        value: String(value),
      }));
      let bodyBase64: string;
      if (editedBody !== undefined) {
        bodyBase64 = stringToBase64(editedBody);
      } else {
        try {
          const r = (await chrome.debugger.sendCommand({ tabId }, 'Fetch.getResponseBody', {
            requestId: cdpRequestId,
          })) as { body: string; base64Encoded: boolean };
          bodyBase64 = r.base64Encoded ? r.body : stringToBase64(r.body);
        } catch {
          bodyBase64 = entry.responseBody ? stringToBase64(entry.responseBody) : stringToBase64('');
        }
      }
      await chrome.debugger.sendCommand({ tabId }, 'Fetch.fulfillRequest', {
        requestId: cdpRequestId,
        responseCode: statusCode,
        responseHeaders: cdpHeaders,
        body: bodyBase64,
      });
    } else {
      await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueResponse', {
        requestId: cdpRequestId,
      });
    }
  } catch (e) {
    console.error('[RF:sw] fulfillRequest failed:', e);
  }
  await deleteEntry(entryId);
  cdpKeyToEntry.delete(`${tabId}:${cdpRequestId}`);
  entryToCdp.delete(entryId);
  await saveCdpMaps();
};

export const handleReject = async (
  msg: Extract<PopupToWorker, { type: 'REJECT' }>,
): Promise<void> => {
  const { entryId } = msg;
  const cdpInfo = entryToCdp.get(entryId);
  if (!cdpInfo) {
    console.warn(`[RF:sw] REJECT: no CDP info for entry ${entryId}`);
    return;
  }
  const { tabId, cdpRequestId } = cdpInfo;
  try {
    await chrome.debugger.sendCommand({ tabId }, 'Fetch.failRequest', {
      requestId: cdpRequestId,
      errorReason: 'Failed',
    });
  } catch (e) {
    console.error('[RF:sw] failRequest failed:', e);
  }
  await deleteEntry(entryId);
  cdpKeyToEntry.delete(`${tabId}:${cdpRequestId}`);
  entryToCdp.delete(entryId);
  await saveCdpMaps();
};

export const handleRejectMany = async (
  msg: Extract<PopupToWorker, { type: 'REJECT_MANY' }>,
): Promise<void> => {
  const { entryIds } = msg;
  await Promise.all(
    entryIds.map(async (entryId) => {
      const cdpInfo = entryToCdp.get(entryId);
      if (!cdpInfo) return;
      const { tabId, cdpRequestId } = cdpInfo;
      try {
        await chrome.debugger.sendCommand({ tabId }, 'Fetch.failRequest', {
          requestId: cdpRequestId,
          errorReason: 'Failed',
        });
      } catch (e) {
        console.error('[RF:sw] failRequest failed:', e);
      }
      cdpKeyToEntry.delete(`${tabId}:${cdpRequestId}`);
      entryToCdp.delete(entryId);
    }),
  );
  await deleteEntries(entryIds);
  await saveCdpMaps();
};

export const handleApplyResponseMany = async (
  msg: Extract<PopupToWorker, { type: 'APPLY_RESPONSE_MANY' }>,
): Promise<void> => {
  const { entryIds } = msg;
  await Promise.all(
    entryIds.map(async (entryId) => {
      const cdpInfo = entryToCdp.get(entryId);
      if (!cdpInfo) return;
      const { tabId, cdpRequestId } = cdpInfo;
      try {
        await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueResponse', {
          requestId: cdpRequestId,
        });
      } catch (e) {
        console.error('[RF:sw] continueResponse failed:', e);
      }
      cdpKeyToEntry.delete(`${tabId}:${cdpRequestId}`);
      entryToCdp.delete(entryId);
    }),
  );
  await deleteEntries(entryIds);
  await saveCdpMaps();
};

export const handleProceedMany = async (
  msg: Extract<PopupToWorker, { type: 'PROCEED_MANY' }>,
): Promise<void> => {
  const { entries } = msg;
  await Promise.all(
    entries.map(async (entry) => {
      const cdpInfo = entryToCdp.get(entry.id);
      if (!cdpInfo) return;
      const { tabId, cdpRequestId } = cdpInfo;
      try {
        await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', {
          requestId: cdpRequestId,
        });
      } catch (e) {
        console.error('[RF:sw] continueRequest failed:', e);
      }
    }),
  );
  await deleteEntries(entries.map((e) => e.id));
};

export { handleRepeat };
