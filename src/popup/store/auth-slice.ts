import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { SafeUser } from './api';

export type AuthMode = 'guest' | 'authenticated' | null;

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
}

interface AuthLoadResult {
  mode: AuthMode;
  token: string | null;
  user: AuthUser | null;
}

export const loadAuthMode = createAsyncThunk<AuthLoadResult>(
  'auth/load',
  async (): Promise<AuthLoadResult> => {
    const result = await chrome.storage.local.get(['authMode', 'authToken']);
    const mode = result.authMode as AuthMode | undefined;
    const token = result.authToken as string | undefined;

    if (mode === 'authenticated' && token) {
      const response = await fetch(`${import.meta.env.VITE_API_URL as string}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);

      if (response?.ok) {
        const data = (await response.json()) as SafeUser;
        return {
          mode: 'authenticated',
          token,
          user: { id: data.id, fullName: data.fullName, email: data.email },
        };
      }

      await chrome.storage.local.remove(['authMode', 'authToken']);
      return { mode: null, token: null, user: null };
    }

    if (mode === 'guest') {
      return { mode: 'guest', token: null, user: null };
    }

    return { mode: null, token: null, user: null };
  },
);

export const saveAuthMode = createAsyncThunk('auth/save', async (mode: AuthMode) => {
  if (mode === null) {
    await chrome.storage.local.remove('authMode');
  } else {
    await chrome.storage.local.set({ authMode: mode });
  }
  return mode;
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await chrome.storage.local.remove(['authMode', 'authToken']);
});

interface AuthState {
  mode: AuthMode;
  loaded: boolean;
  token: string | null;
  user: AuthUser | null;
}

const authSlice = createSlice({
  name: 'auth',
  initialState: { mode: null, loaded: false, token: null, user: null } as AuthState,
  reducers: {
    setAuthenticated(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
      state.mode = 'authenticated';
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    updateUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAuthMode.fulfilled, (state, action) => {
        state.mode = action.payload.mode;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.loaded = true;
      })
      .addCase(saveAuthMode.fulfilled, (state, action) => {
        state.mode = action.payload;
        if (action.payload === null) {
          state.token = null;
          state.user = null;
        }
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.mode = null;
        state.token = null;
        state.user = null;
      });
  },
});

export const { setAuthenticated, updateUser } = authSlice.actions;
export default authSlice.reducer;
