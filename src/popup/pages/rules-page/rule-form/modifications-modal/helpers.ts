import type { RuleDirection, RuleModification } from '@/types';

export const isModificationsValid = (mods: RuleModification[]) =>
  mods.every(
    (m) => m.value.trim() !== '' && (m.type !== 'ADD_HEADER' || (m.name ?? '').trim() !== ''),
  );

export const getDirectionConflict = (
  direction: RuleDirection,
  mods: RuleModification[],
): string | null => {
  if (direction === 'REQUEST' && mods.some((m) => m.type === 'REPLACE_STATUS')) {
    return 'Направление «Запрос» несовместимо с модификацией «Заменить статус» — статус применяется только к ответу';
  }
  if (direction === 'RESPONSE' && mods.some((m) => m.type === 'REPLACE_URL')) {
    return 'Направление «Ответ» несовместимо с модификацией «Заменить URL» — URL применяется только к запросу';
  }
  return null;
};
