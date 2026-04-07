import type { CreateBackgroundRuleBody, ServerGroup, ServerRule } from '@/store/api';
import { DEFAULT_BACKGROUND_GROUP_ID, DEFAULT_GROUP_ID } from '@/store/rules-slice';
import type { Group, Rule, RuleModification } from '@/types';

export const serverGroupToLocal = (g: ServerGroup): Group => ({ id: String(g.id), name: g.name });

export const serverRuleToLocal = (r: ServerRule): Rule => ({
  id: String(r.id),
  name: r.name,
  method: r.method,
  value: r.value,
  ruleType: r.ruleType,
  groupId:
    r.groupId !== null
      ? String(r.groupId)
      : r.variant === 'STOPPING'
        ? DEFAULT_GROUP_ID
        : DEFAULT_BACKGROUND_GROUP_ID,
  enabled: r.enabled,
  mode: r.variant === 'STOPPING' ? 'interactive' : 'background',
  direction: r.direction,
  modifications: r.modifications.map((m) => ({
    id: String(m.id),
    type: m.type,
    name: m.name,
    value: m.value,
    bodyLanguage: m.bodyLanguage ?? null,
  })),
});

export const resolveGroupPayload = (
  groupName: string,
  groups: Group[],
): { groupId?: number; newGroupName?: string } => {
  const trimmed = groupName?.trim();
  if (!trimmed) return {};
  const existing = groups.find(
    (g) => g.name === trimmed && g.id !== DEFAULT_GROUP_ID && g.id !== DEFAULT_BACKGROUND_GROUP_ID,
  );
  if (existing) return { groupId: Number(existing.id) };
  const isVirtualDefaultName = groups.some(
    (g) =>
      (g.id === DEFAULT_GROUP_ID || g.id === DEFAULT_BACKGROUND_GROUP_ID) && g.name === trimmed,
  );
  if (isVirtualDefaultName) return {};
  return { newGroupName: trimmed };
};

export const toModificationsPayload = (
  mods: RuleModification[],
): CreateBackgroundRuleBody['modifications'] =>
  mods.map(({ type, name, value, bodyLanguage }) => ({
    type,
    ...(name ? { name } : {}),
    value,
    ...(bodyLanguage ? { bodyLanguage } : {}),
  }));
