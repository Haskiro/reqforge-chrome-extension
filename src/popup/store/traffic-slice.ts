import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { StoredEntry } from '@/types';

interface TrafficState {
  entries: StoredEntry[];
  loaded: boolean;
}

const initialState: TrafficState = {
  entries: [],
  loaded: false,
};

export const loadTrafficFromStorage = createAsyncThunk('traffic/loadFromStorage', async () => {
  const result = await chrome.storage.local.get('entries');
  return (result.entries as StoredEntry[]) ?? [];
});

const trafficSlice = createSlice({
  name: 'traffic',
  initialState,
  reducers: {
    setTrafficEntries(state, action: PayloadAction<StoredEntry[]>) {
      state.entries = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadTrafficFromStorage.fulfilled, (state, action) => {
      state.entries = action.payload;
      state.loaded = true;
    });
  },
});

export const { setTrafficEntries } = trafficSlice.actions;
export default trafficSlice.reducer;
