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
  | { type: 'APPLY_RESPONSE_MANY'; entryIds: string[] };
