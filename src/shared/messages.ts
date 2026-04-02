import type { StoredEntry } from '../popup/types';

// popup → SW
export type PopupToWorker =
  | {
      type: 'PROCEED';
      entry: StoredEntry;
      editedUrl?: string;
      editedMethod?: string;
      editedHeaders?: Record<string, string>;
      editedBody?: string;
    }
  | {
      type: 'APPLY_RESPONSE';
      entryId: string;
      editedBody?: string;
      editedResponseHeaders?: Record<string, string>;
      editedResponseStatus?: number;
    }
  | { type: 'REJECT'; entryId: string }
  | { type: 'REJECT_MANY'; entryIds: string[] }
  | { type: 'PROCEED_MANY'; entries: StoredEntry[] }
  | { type: 'APPLY_RESPONSE_MANY'; entryIds: string[] }
  | {
      type: 'REPEAT';
      entry: StoredEntry;
      editedUrl?: string;
      editedMethod?: string;
      editedHeaders?: Record<string, string>;
      editedBody?: string;
    }
  | { type: 'REATTACH_DEBUGGER' };

// SW → popup
export type WorkerToPopup = { type: 'DEBUGGER_DETACHED' };

export type RepeatResponse =
  | {
      ok: true;
      status: number;
      headers: Record<string, string>;
      body: string;
    }
  | { ok: false; error: string };
