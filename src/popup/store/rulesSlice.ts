import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { loadPersistedRules } from '../services/rulesStorage';
import type { Group, Rule, RuleMode } from '../types';

export const DEFAULT_GROUP_ID = 'default';

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
  groups: Group[];
  selectedRuleId: string | null;
  activeMode: RuleMode;
  loaded: boolean;
}

const initialState: RulesState = {
  groups: [{ id: DEFAULT_GROUP_ID, name: 'Группа по умолчанию' }],
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
      state.rules.push({ id, ...action.payload });
    },
    updateRule(state, action: PayloadAction<Rule>) {
      const idx = state.rules.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) state.rules[idx] = action.payload;
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
      state.groups.push(action.payload);
    },
    deleteGroup(state, action: PayloadAction<{ id: string; moveToGroupId?: string }>) {
      const { id, moveToGroupId } = action.payload;
      state.groups = state.groups.filter((g) => g.id !== id);
      if (moveToGroupId) {
        state.rules.forEach((r) => {
          if (r.groupId === id) r.groupId = moveToGroupId;
        });
      } else {
        state.rules = state.rules.filter((r) => r.groupId !== id);
      }
    },
    renameGroup(state, action: PayloadAction<{ id: string; name: string }>) {
      const group = state.groups.find((g) => g.id === action.payload.id);
      if (group) group.name = action.payload.name;
    },
    setSelectedRuleId(state, action: PayloadAction<string | null>) {
      state.selectedRuleId = action.payload;
    },
    setActiveMode(state, action: PayloadAction<RuleMode>) {
      state.activeMode = action.payload;
      state.selectedRuleId = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadRulesFromStorage.fulfilled, (state, action) => {
      if (action.payload) {
        state.rules = action.payload.rules;
        state.groups = action.payload.groups;
        state.activeMode = action.payload.activeMode;
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
} = rulesSlice.actions;

export default rulesSlice.reducer;
