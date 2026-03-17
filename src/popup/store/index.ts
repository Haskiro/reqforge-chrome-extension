import { configureStore } from '@reduxjs/toolkit';
import type { TypedUseSelectorHook } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';

import { savePersistedRules } from '../services/rulesStorage';
import authReducer from './authSlice';
import rulesReducer from './rulesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    rules: rulesReducer,
  },
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

store.subscribe(() => {
  const {
    rules: { rules, groups, activeMode, loaded },
  } = store.getState();
  if (!loaded) return;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void savePersistedRules({ rules, groups, activeMode });
  }, 300);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
