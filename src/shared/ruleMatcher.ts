import type { Rule, RuleModification } from '@/types';

const REQUEST_MOD_TYPES = ['ADD_HEADER', 'REPLACE_BODY', 'REPLACE_URL'] as const;
const RESPONSE_MOD_TYPES = ['ADD_HEADER', 'REPLACE_BODY', 'REPLACE_STATUS'] as const;

const matchesUrl = (rule: Rule, url: string): boolean => {
  switch (rule.ruleTypeId) {
    case 1:
      return url.includes(rule.value);
    case 2:
      return url === rule.value;
    case 3:
      return new RegExp(rule.value).test(url);
    default:
      return false;
  }
};

const matchesMethod = (rule: Rule, method: string): boolean =>
  rule.method.includes('ANY') || rule.method.includes(method);

const directionMatches = (rule: Rule, stage: 'REQUEST' | 'RESPONSE'): boolean =>
  stage === 'REQUEST'
    ? rule.direction === 'REQUEST' || rule.direction === 'ANY'
    : rule.direction === 'RESPONSE' || rule.direction === 'ANY';

export const findBackgroundMods = (
  rules: Rule[],
  url: string,
  method: string,
  stage: 'REQUEST' | 'RESPONSE',
): RuleModification[] => {
  const applicableTypes = stage === 'REQUEST' ? REQUEST_MOD_TYPES : RESPONSE_MOD_TYPES;
  const result: RuleModification[] = [];
  for (const rule of rules) {
    if (!rule.enabled || rule.mode !== 'background') continue;
    if (!matchesUrl(rule, url)) continue;
    if (!matchesMethod(rule, method)) continue;
    if (!directionMatches(rule, stage)) continue;
    const mods = rule.modifications.filter((m) =>
      (applicableTypes as readonly string[]).includes(m.type),
    );
    result.push(...mods);
  }
  return result;
};

export const hasInteractiveMatch = (
  rules: Rule[],
  url: string,
  method: string,
  stage: 'REQUEST' | 'RESPONSE',
): boolean => {
  for (const rule of rules) {
    if (!rule.enabled || rule.mode !== 'interactive') continue;
    if (!matchesUrl(rule, url)) continue;
    if (!matchesMethod(rule, method)) continue;
    if (directionMatches(rule, stage)) return true;
  }
  return false;
};
