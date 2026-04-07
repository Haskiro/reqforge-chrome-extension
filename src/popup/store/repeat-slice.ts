import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { StoredEntry } from '@/types';

export type RepeatResponseState = {
  status: number;
  headers: Record<string, string>;
  body: string;
  error?: string;
};

type RepeatState = {
  entries: StoredEntry[];
  responses: Record<string, RepeatResponseState>;
  names: Record<string, string>;
  activeTabId: string | null;
};

const initialState: RepeatState = {
  entries: [],
  responses: {},
  names: {},
  activeTabId: null,
};

const getMaxTabNumber = (names: Record<string, string>): number => {
  let max = 0;
  for (const name of Object.values(names)) {
    const match = /^Запрос(\d+)$/.exec(name);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return max;
};

const repeatSlice = createSlice({
  name: 'repeat',
  initialState,
  reducers: {
    addRepeatEntries: (state, action: PayloadAction<StoredEntry[]>) => {
      let idx = getMaxTabNumber(state.names) + 1;
      let lastSlotId: string | null = null;
      for (const entry of action.payload) {
        const slotId = crypto.randomUUID();
        state.names[slotId] = `Запрос${idx}`;
        idx++;
        state.entries.push({ ...entry, id: slotId });
        lastSlotId = slotId;
      }
      if (lastSlotId) state.activeTabId = lastSlotId;
    },
    removeRepeatEntry: (state, action: PayloadAction<string>) => {
      state.entries = state.entries.filter((e) => e.id !== action.payload);
      delete state.responses[action.payload];
      delete state.names[action.payload];
      if (state.activeTabId === action.payload) state.activeTabId = null;
    },
    setActiveTabId: (state, action: PayloadAction<string | null>) => {
      state.activeTabId = action.payload;
    },
    setRepeatResponse: (
      state,
      action: PayloadAction<{ id: string; response: RepeatResponseState }>,
    ) => {
      state.responses[action.payload.id] = action.payload.response;
    },
  },
});

export const { addRepeatEntries, removeRepeatEntry, setRepeatResponse, setActiveTabId } =
  repeatSlice.actions;
export default repeatSlice.reducer;
