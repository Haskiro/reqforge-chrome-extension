import type { StoredEntry } from '../popup/types';

// popup → SW
export type PopupToWorker =
  | {
      type: 'PROCEED';
      entry: StoredEntry;
      editedBody?: string;
    }
  | {
      type: 'APPLY_RESPONSE';
      entryId: string;
      editedBody?: string;
    };
