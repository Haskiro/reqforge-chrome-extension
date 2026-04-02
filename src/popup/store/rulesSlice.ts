import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  serverGroupToLocal,
  serverRuleToLocal,
  toModificationsPayload,
} from '@/services/rulesApiMapper';
import { loadPersistedRules } from '@/services/rulesStorage';
import type { ServerGroup, ServerRule } from '@/store/api';
import type { Group, Rule, RuleMode } from '@/types';

const getUniqueName = (name: string, taken: string[]): string => {
  if (!taken.includes(name)) return name;
  let n = 2;
  while (taken.includes(`${name} (${n})`)) n++;
  return `${name} (${n})`;
};

export type ImportPayload = {
  interactiveGroups: Group[];
  backgroundGroups: Group[];
  rules: Rule[];
};

export const DEFAULT_GROUP_ID = 'default';
export const DEFAULT_BACKGROUND_GROUP_ID = 'default-background';

const RULE_TYPES = [
  { value: 'CONTAINS' as const, name: 'Содержит' },
  { value: 'EQUALS' as const, name: 'Равно' },
  { value: 'REGEX' as const, name: 'Regex' },
];

export { RULE_TYPES };

export const loadRulesFromStorage = createAsyncThunk('rules/loadFromStorage', async () => {
  return await loadPersistedRules();
});

export const loadRulesFromServer = createAsyncThunk(
  'rules/loadFromServer',
  async (token: string) => {
    const headers = { Authorization: `Bearer ${token}` };
    const [groupsRes, rulesRes] = await Promise.all([
      fetch('http://localhost:3000/groups', { headers }),
      fetch('http://localhost:3000/rules', { headers }),
    ]);
    const serverGroups = (await groupsRes.json()) as ServerGroup[];
    const serverRules = (await rulesRes.json()) as ServerRule[];
    return {
      rules: serverRules.map(serverRuleToLocal),
      interactiveGroups: serverGroups
        .filter((g) => g.variant === 'STOPPING')
        .map(serverGroupToLocal),
      backgroundGroups: serverGroups
        .filter((g) => g.variant === 'BACKGROUND')
        .map(serverGroupToLocal),
    };
  },
);

interface RulesState {
  rules: Rule[];
  interactiveGroups: Group[];
  backgroundGroups: Group[];
  selectedRuleId: string | null;
  activeMode: RuleMode;
  loaded: boolean;
}

const initialState: RulesState = {
  interactiveGroups: [{ id: DEFAULT_GROUP_ID, name: 'Группа по умолчанию' }],
  backgroundGroups: [{ id: DEFAULT_BACKGROUND_GROUP_ID, name: 'Группа по умолчанию' }],
  rules: [],
  selectedRuleId: null,
  activeMode: 'interactive',
  loaded: false,
};

const rulesSlice = createSlice({
  name: 'rules',
  initialState,
  reducers: {
    addRule(state, action: PayloadAction<Omit<Rule, 'id'>>) {
      const id = crypto.randomUUID();
      const existingNames = state.rules
        .filter((r) => r.groupId === action.payload.groupId)
        .map((r) => r.name);
      const name = getUniqueName(action.payload.name, existingNames);
      state.rules.push({ id, ...action.payload, name });
    },
    updateRule(state, action: PayloadAction<Rule>) {
      const idx = state.rules.findIndex((r) => r.id === action.payload.id);
      if (idx === -1) return;
      const original = state.rules[idx];
      const isMoving = original.groupId !== action.payload.groupId;
      if (isMoving) {
        const existingNames = state.rules
          .filter((r) => r.groupId === action.payload.groupId)
          .map((r) => r.name);
        state.rules[idx] = {
          ...action.payload,
          name: getUniqueName(action.payload.name, existingNames),
        };
      } else {
        state.rules[idx] = action.payload;
      }
    },
    deleteRule(state, action: PayloadAction<string>) {
      state.rules = state.rules.filter((r) => r.id !== action.payload);
      if (state.selectedRuleId === action.payload) state.selectedRuleId = null;
    },
    toggleRule(state, action: PayloadAction<string>) {
      const rule = state.rules.find((r) => r.id === action.payload);
      if (rule) rule.enabled = !rule.enabled;
    },
    addGroup(state, action: PayloadAction<Group>) {
      const arr =
        state.activeMode === 'interactive' ? state.interactiveGroups : state.backgroundGroups;
      const name = getUniqueName(
        action.payload.name,
        arr.map((g) => g.name),
      );
      arr.push({ ...action.payload, name });
    },
    deleteGroup(state, action: PayloadAction<{ id: string; moveToGroupId?: string }>) {
      const { id, moveToGroupId } = action.payload;
      state.interactiveGroups = state.interactiveGroups.filter((g) => g.id !== id);
      state.backgroundGroups = state.backgroundGroups.filter((g) => g.id !== id);
      if (moveToGroupId) {
        state.rules.forEach((r) => {
          if (r.groupId !== id) return;
          const takenNames = state.rules
            .filter((x) => x.groupId === moveToGroupId)
            .map((x) => x.name);
          r.name = getUniqueName(r.name, takenNames);
          r.groupId = moveToGroupId;
        });
      } else {
        state.rules = state.rules.filter((r) => r.groupId !== id);
      }
    },
    renameGroup(state, action: PayloadAction<{ id: string; name: string }>) {
      const group =
        state.interactiveGroups.find((g) => g.id === action.payload.id) ??
        state.backgroundGroups.find((g) => g.id === action.payload.id);
      if (group) group.name = action.payload.name;
    },
    setSelectedRuleId(state, action: PayloadAction<string | null>) {
      state.selectedRuleId = action.payload;
    },
    setActiveMode(state, action: PayloadAction<RuleMode>) {
      state.activeMode = action.payload;
      state.selectedRuleId = null;
    },
    importRules(state, action: PayloadAction<ImportPayload>) {
      const idMap: Record<string, string> = {};

      for (const group of action.payload.interactiveGroups) {
        const uniqueName = getUniqueName(
          group.name,
          state.interactiveGroups.map((g) => g.name),
        );
        const newId = crypto.randomUUID();
        idMap[group.id] = newId;
        state.interactiveGroups.push({ id: newId, name: uniqueName });
      }

      for (const group of action.payload.backgroundGroups) {
        const uniqueName = getUniqueName(
          group.name,
          state.backgroundGroups.map((g) => g.name),
        );
        const newId = crypto.randomUUID();
        idMap[group.id] = newId;
        state.backgroundGroups.push({ id: newId, name: uniqueName });
      }

      for (const rule of action.payload.rules) {
        const newGroupId = idMap[rule.groupId];
        if (!newGroupId) continue;
        const existingNames = state.rules
          .filter((r) => r.groupId === newGroupId)
          .map((r) => r.name);
        const uniqueName = getUniqueName(rule.name, existingNames);
        state.rules.push({
          ...rule,
          id: crypto.randomUUID(),
          groupId: newGroupId,
          name: uniqueName,
          modifications: rule.modifications.map((m) => ({ ...m, id: crypto.randomUUID() })),
        });
      }
    },
    clearAllRules(state) {
      state.rules = [];
      state.interactiveGroups = [{ id: DEFAULT_GROUP_ID, name: 'Группа по умолчанию' }];
      state.backgroundGroups = [{ id: DEFAULT_BACKGROUND_GROUP_ID, name: 'Группа по умолчанию' }];
      state.selectedRuleId = null;
    },
    upsertRuleFromServer(state, action: PayloadAction<Rule>) {
      const idx = state.rules.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) state.rules[idx] = action.payload;
      else state.rules.push(action.payload);
    },
    upsertGroupFromServer(
      state,
      action: PayloadAction<{ group: Group; variant: 'STOPPING' | 'BACKGROUND' }>,
    ) {
      const arr =
        action.payload.variant === 'STOPPING' ? state.interactiveGroups : state.backgroundGroups;
      const idx = arr.findIndex((g) => g.id === action.payload.group.id);
      if (idx !== -1) arr[idx] = action.payload.group;
      else arr.push(action.payload.group);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadRulesFromServer.fulfilled, (state, action) => {
      state.rules = action.payload.rules;
      state.interactiveGroups = [
        { id: DEFAULT_GROUP_ID, name: 'Группа по умолчанию' },
        ...action.payload.interactiveGroups,
      ];
      state.backgroundGroups = [
        { id: DEFAULT_BACKGROUND_GROUP_ID, name: 'Группа по умолчанию' },
        ...action.payload.backgroundGroups,
      ];
      state.selectedRuleId = null;
      state.loaded = true;
    });
    builder.addCase(loadRulesFromStorage.fulfilled, (state, action) => {
      if (action.payload) {
        state.rules = action.payload.rules.map((r) => ({
          ...r,
          modifications: [],
          direction: 'ANY' as const,
        }));
        state.interactiveGroups = action.payload.interactiveGroups ?? [
          { id: DEFAULT_GROUP_ID, name: 'Группа по умолчанию' },
        ];
        state.backgroundGroups = action.payload.backgroundGroups ?? [
          { id: DEFAULT_BACKGROUND_GROUP_ID, name: 'Группа по умолчанию' },
        ];
      }
      state.loaded = true;
    });
  },
});

export const {
  addRule,
  updateRule,
  deleteRule,
  toggleRule,
  addGroup,
  deleteGroup,
  renameGroup,
  setSelectedRuleId,
  setActiveMode,
  importRules,
  clearAllRules,
  upsertRuleFromServer,
  upsertGroupFromServer,
} = rulesSlice.actions;

export const importRulesForServer = createAsyncThunk(
  'rules/importForServer',
  async (
    {
      data,
      interactiveGroups,
      backgroundGroups,
    }: { data: ImportPayload; interactiveGroups: Group[]; backgroundGroups: Group[] },
    { dispatch },
  ) => {
    const { authToken } = await chrome.storage.local.get('authToken');
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${String(authToken)}`,
    };
    const allCurrentGroups = [...interactiveGroups, ...backgroundGroups];
    const importedGroups = [...data.interactiveGroups, ...data.backgroundGroups];
    const groupIdMap = new Map<string, number | null>();
    groupIdMap.set(DEFAULT_GROUP_ID, null);
    groupIdMap.set(DEFAULT_BACKGROUND_GROUP_ID, null);

    let count = 0;
    for (const rule of data.rules) {
      const importedGroup = importedGroups.find((g) => g.id === rule.groupId);
      let groupPayload: { groupId?: number; newGroupName?: string } = {};

      if (
        importedGroup &&
        rule.groupId !== DEFAULT_GROUP_ID &&
        rule.groupId !== DEFAULT_BACKGROUND_GROUP_ID
      ) {
        if (groupIdMap.has(rule.groupId)) {
          const sid = groupIdMap.get(rule.groupId);
          if (sid !== null) groupPayload = { groupId: sid };
        } else {
          const existing = allCurrentGroups.find(
            (g) =>
              g.name === importedGroup.name &&
              g.id !== DEFAULT_GROUP_ID &&
              g.id !== DEFAULT_BACKGROUND_GROUP_ID,
          );
          if (existing) {
            const sid = Number(existing.id);
            groupIdMap.set(rule.groupId, sid);
            groupPayload = { groupId: sid };
          } else {
            groupPayload = { newGroupName: importedGroup.name };
          }
        }
      }

      try {
        const endpoint = rule.mode === 'background' ? '/rules/background' : '/rules/stopping';
        const body =
          rule.mode === 'background'
            ? {
                name: rule.name,
                method: rule.method,
                value: rule.value,
                ruleType: rule.ruleType,
                direction: rule.direction as 'REQUEST' | 'RESPONSE',
                modifications: toModificationsPayload(rule.modifications),
                ...groupPayload,
              }
            : {
                name: rule.name,
                method: rule.method,
                value: rule.value,
                ruleType: rule.ruleType,
                direction: rule.direction,
                ...groupPayload,
              };

        const res = await fetch(`http://localhost:3000${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) continue;

        const serverRule = (await res.json()) as ServerRule;

        if (serverRule.group && !groupIdMap.has(rule.groupId)) {
          groupIdMap.set(rule.groupId, serverRule.group.id);
        }
        if (serverRule.group) {
          dispatch(
            upsertGroupFromServer({
              group: serverGroupToLocal(serverRule.group),
              variant: serverRule.group.variant,
            }),
          );
        }
        dispatch(upsertRuleFromServer(serverRuleToLocal(serverRule)));
        count++;
      } catch {
        // skip failed rules
      }
    }
    return count;
  },
);

export default rulesSlice.reducer;
