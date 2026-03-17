import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export type AuthMode = 'guest' | 'authenticated' | null;

export const loadAuthMode = createAsyncThunk('auth/load', async (): Promise<AuthMode> => {
  const result = await chrome.storage.local.get('authMode');
  return (result.authMode as AuthMode) ?? null;
});

export const saveAuthMode = createAsyncThunk('auth/save', async (mode: AuthMode) => {
  if (mode === null) {
    await chrome.storage.local.remove('authMode');
  } else {
    await chrome.storage.local.set({ authMode: mode });
  }
  return mode;
});

interface AuthState {
  mode: AuthMode;
  loaded: boolean;
}

const authSlice = createSlice({
  name: 'auth',
  initialState: { mode: null, loaded: false } as AuthState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadAuthMode.fulfilled, (state, action) => {
        state.mode = action.payload;
        state.loaded = true;
      })
      .addCase(saveAuthMode.fulfilled, (state, action) => {
        state.mode = action.payload;
      });
  },
});

export default authSlice.reducer;
