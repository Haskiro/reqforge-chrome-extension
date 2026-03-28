import { configureStore } from '@reduxjs/toolkit';
import type { TypedUseSelectorHook } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';

import { savePersistedRules } from '@/services/rulesStorage';

import { api } from './api';
import authReducer from './authSlice';
import repeatReducer from './repeatSlice';
import rulesReducer from './rulesSlice';
import trafficReducer from './trafficSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    rules: rulesReducer,
    traffic: trafficReducer,
    repeat: repeatReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let prevRulesState = store.getState().rules;

store.subscribe(() => {
  const { rules } = store.getState();
  if (!rules.loaded) return;
  if (rules === prevRulesState) return;
  prevRulesState = rules;

  const { rules: ruleList, interactiveGroups, backgroundGroups } = rules;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void savePersistedRules({ rules: ruleList, interactiveGroups, backgroundGroups });
  }, 300);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
