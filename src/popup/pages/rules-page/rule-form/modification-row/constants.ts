import type { ModificationType } from '@/types';

export { BODY_LANGUAGES } from '@/shared/constants';

export const MODIFICATION_TYPES: { value: ModificationType; label: string }[] = [
  { value: 'ADD_HEADER', label: 'Добавить заголовок' },
  { value: 'REPLACE_BODY', label: 'Заменить тело' },
  { value: 'REPLACE_URL', label: 'Заменить URL' },
  { value: 'REPLACE_STATUS', label: 'Заменить статус' },
];

export const FORMDATA_HINT =
  'Формат: key1=value1&key2=value2. Спецсимволы необходимо кодировать вручную (%20 — пробел, %40 — @, и т.д.)';
