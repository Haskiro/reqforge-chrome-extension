import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { Group, Rule, RuleMode } from '../types';

const DEFAULT_GROUP_ID = 'default';

const RULE_TYPES = [
  { id: 1, value: 'contains' as const, name: 'Содержит' },
  { id: 2, value: 'equals' as const, name: 'Равно' },
  { id: 3, value: 'regex' as const, name: 'Regex' },
];

export { RULE_TYPES };

interface RulesState {
  rules: Rule[];
  groups: Group[];
  selectedRuleId: string | null;
  activeMode: RuleMode;
}

const initialState: RulesState = {
  groups: [{ id: DEFAULT_GROUP_ID, name: 'Группа по умолчанию' }],
  rules: [],
  selectedRuleId: null,
  activeMode: 'interactive',
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
    addGroup(state, action: PayloadAction<string>) {
      state.groups.push({ id: crypto.randomUUID(), name: action.payload });
    },
    deleteGroup(state, action: PayloadAction<string>) {
      state.groups = state.groups.filter((g) => g.id !== action.payload);
      // Move orphaned rules to default group
      state.rules.forEach((r) => {
        if (r.groupId === action.payload) r.groupId = DEFAULT_GROUP_ID;
      });
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
