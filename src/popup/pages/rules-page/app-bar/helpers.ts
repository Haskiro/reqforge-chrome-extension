import type { Group, Rule } from '@/types';

export type ImportFileData = {
  version: number;
  interactiveGroups: Group[];
  backgroundGroups: Group[];
  rules: Rule[];
};

export const isValidImportData = (data: unknown): data is ImportFileData =>
  typeof data === 'object' &&
  data !== null &&
  (data as ImportFileData).version === 1 &&
  Array.isArray((data as ImportFileData).interactiveGroups) &&
  Array.isArray((data as ImportFileData).backgroundGroups) &&
  Array.isArray((data as ImportFileData).rules);
