import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { loadPersistedRules } from '@/services/rulesStorage';
import type { Group, Rule, RuleMode } from '@/types';

const getUniqueName = (name: string, taken: string[]): string => {
  if (!taken.includes(name)) return name;
  let n = 2;
  while (taken.includes(`${name} (${n})`)) n++;
  return `${name} (${n})`;
};

type ImportPayload = {
  interactiveGroups: Group[];
  backgroundGroups: Group[];
  rules: Rule[];
};

export const DEFAULT_GROUP_ID = 'default';
export const DEFAULT_BACKGROUND_GROUP_ID = 'default-background';

const RULE_TYPES = [
  { id: 1, value: 'contains' as const, name: 'Содержит' },
  { id: 2, value: 'equals' as const, name: 'Равно' },
  { id: 3, value: 'regex' as const, name: 'Regex' },
];

export { RULE_TYPES };

export const loadRulesFromStorage = createAsyncThunk('rules/loadFromStorage', async () => {
  return await loadPersistedRules();
});

interface RulesState {
  rules: Rule[];
  interactiveGroups: Group[];
  backgroundGroups: Group[];
  selectedRuleId: string | null;
  selectionVersion: number;
  activeMode: RuleMode;
  loaded: boolean;
}

const initialState: RulesState = {
  interactiveGroups: [{ id: DEFAULT_GROUP_ID, name: 'Группа по умолчанию' }],
  backgroundGroups: [{ id: DEFAULT_BACKGROUND_GROUP_ID, name: 'Группа по умолчанию' }],
  rules: [],
  selectedRuleId: null,
  selectionVersion: 0,
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
      state.selectionVersion += 1;
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
  },
  extraReducers: (builder) => {
    builder.addCase(loadRulesFromStorage.fulfilled, (state, action) => {
      if (action.payload) {
        state.rules = action.payload.rules.map((r) => ({
          modifications: [],
          direction: 'ANY' as const,
          ...r,
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
} = rulesSlice.actions;

export default rulesSlice.reducer;
