import type { RootState } from '.';

export const selectAuth = (state: RootState) => state.auth;
export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectAuthToken = (state: RootState) => state.auth.token;

export const selectRulesState = (state: RootState) => state.rules;

export const selectTrafficEntries = (state: RootState) => state.traffic.entries;
export const selectTrafficEntryCount = (state: RootState) => state.traffic.entries.length;

export const selectRepeatEntries = (state: RootState) => state.repeat.entries;
export const selectRepeatEntryCount = (state: RootState) => state.repeat.entries.length;
export const selectRepeatResponses = (state: RootState) => state.repeat.responses;
export const selectRepeatActiveTabId = (state: RootState) => state.repeat.activeTabId;
export const selectRepeatNames = (state: RootState) => state.repeat.names;
