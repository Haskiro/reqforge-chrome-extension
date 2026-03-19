import type { RuleDirection } from '@/types';

export const HTTP_METHODS = [
  { value: 'ANY', label: 'Любой' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH', label: 'PATCH' },
];

export const INTERACTIVE_DIRECTION_OPTIONS: { value: RuleDirection; label: string }[] = [
  { value: 'ANY', label: 'Любое' },
  { value: 'REQUEST', label: 'Запрос' },
  { value: 'RESPONSE', label: 'Ответ' },
];

export const BACKGROUND_DIRECTION_OPTIONS: {
  value: Exclude<RuleDirection, 'ANY'>;
  label: string;
}[] = [
  { value: 'REQUEST', label: 'Запрос' },
  { value: 'RESPONSE', label: 'Ответ' },
];

export type RuleFormValues = {
  groupName: string;
  name: string;
  method: string[];
  ruleTypeId: number;
  value: string;
  direction: RuleDirection;
};
