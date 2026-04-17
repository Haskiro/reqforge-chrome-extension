import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import type { ModificationType } from '@/types';

export interface SafeUser {
  id: number;
  fullName: string;
  email: string;
  registrationDate: string;
}

export type ServerGroup = {
  id: number;
  name: string;
  variant: 'STOPPING' | 'BACKGROUND';
  userId: number;
};

export type BodyLanguage = 'json' | 'xml' | 'html' | 'javascript' | 'formdata';

export type ServerRuleModification = {
  id: number;
  type: ModificationType;
  name: string | null;
  value: string;
  bodyLanguage: BodyLanguage | null;
  ruleId: number;
};

export type ServerRule = {
  id: number;
  name: string;
  method: string[];
  value: string;
  variant: 'STOPPING' | 'BACKGROUND';
  direction: 'REQUEST' | 'RESPONSE' | 'ANY';
  enabled: boolean;
  userId: number;
  groupId: number | null;
  ruleType: 'CONTAINS' | 'EQUALS' | 'REGEX';
  group: ServerGroup | null;
  modifications: ServerRuleModification[];
};

export type CreateStoppingRuleBody = {
  name: string;
  method: string[];
  value: string;
  ruleType: 'CONTAINS' | 'EQUALS' | 'REGEX';
  direction?: 'REQUEST' | 'RESPONSE' | 'ANY';
  groupId?: number | null;
  newGroupName?: string;
};

export type CreateBackgroundRuleBody = {
  name: string;
  method: string[];
  value: string;
  ruleType: 'CONTAINS' | 'EQUALS' | 'REGEX';
  direction: 'REQUEST' | 'RESPONSE';
  modifications: {
    type: ModificationType;
    name?: string;
    value: string;
    bodyLanguage?: BodyLanguage;
  }[];
  groupId?: number | null;
  newGroupName?: string;
};

export type UpdateStoppingRuleBody = Partial<CreateStoppingRuleBody> & { groupId?: number | null };
export type UpdateBackgroundRuleBody = Partial<CreateBackgroundRuleBody> & {
  groupId?: number | null;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL as string,
    prepareHeaders: async (headers) => {
      const { authToken } = await chrome.storage.local.get('authToken');
      if (typeof authToken === 'string' && authToken) {
        headers.set('Authorization', `Bearer ${authToken}`);
      }
      return headers;
    },
  }),
  endpoints: (build) => ({
    login: build.mutation<{ access_token: string }, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: build.mutation<
      SafeUser,
      { fullName: string; email: string; password: string; code: string }
    >({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    sendCode: build.mutation<void, { email: string; type: 'REGISTER' | 'RESET' }>({
      query: (body) => ({ url: '/auth/send-code', method: 'POST', body }),
    }),
    resetPassword: build.mutation<void, { email: string; code: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
    getMe: build.query<SafeUser, void>({
      query: () => '/users/me',
    }),
    updateMe: build.mutation<SafeUser, { fullName?: string; email?: string }>({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
    }),
    changePassword: build.mutation<void, { oldPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/users/me/password', method: 'PATCH', body }),
    }),
    getGroups: build.query<ServerGroup[], void>({
      query: () => '/groups',
    }),
    createGroup: build.mutation<ServerGroup, { name: string; variant: 'STOPPING' | 'BACKGROUND' }>({
      query: (body) => ({ url: '/groups', method: 'POST', body }),
    }),
    updateGroup: build.mutation<ServerGroup, { id: number; name: string }>({
      query: ({ id, ...body }) => ({ url: `/groups/${id}`, method: 'PATCH', body }),
    }),
    deleteGroup: build.mutation<ServerGroup, { id: number; moveToGroupId?: number | null }>({
      query: ({ id, ...body }) => ({ url: `/groups/${id}`, method: 'DELETE', body }),
    }),
    getRules: build.query<ServerRule[], void>({
      query: () => '/rules',
    }),
    createStoppingRule: build.mutation<ServerRule, CreateStoppingRuleBody>({
      query: (body) => ({ url: '/rules/stopping', method: 'POST', body }),
    }),
    createBackgroundRule: build.mutation<ServerRule, CreateBackgroundRuleBody>({
      query: (body) => ({ url: '/rules/background', method: 'POST', body }),
    }),
    updateStoppingRule: build.mutation<ServerRule, { id: number } & UpdateStoppingRuleBody>({
      query: ({ id, ...body }) => ({ url: `/rules/stopping/${id}`, method: 'PATCH', body }),
    }),
    updateBackgroundRule: build.mutation<ServerRule, { id: number } & UpdateBackgroundRuleBody>({
      query: ({ id, ...body }) => ({ url: `/rules/background/${id}`, method: 'PATCH', body }),
    }),
    deleteRule: build.mutation<unknown, number>({
      query: (id) => ({ url: `/rules/${id}`, method: 'DELETE' }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useSendCodeMutation,
  useResetPasswordMutation,
  useLazyGetMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useCreateStoppingRuleMutation,
  useCreateBackgroundRuleMutation,
  useUpdateStoppingRuleMutation,
  useUpdateBackgroundRuleMutation,
  useDeleteRuleMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
} = api;

export const getApiErrorMessage = (
  error: FetchBaseQueryError | SerializedError | undefined,
): string | null => {
  if (!error) return null;
  if ('status' in error) {
    if (error.status === 401) return 'Неверный email или пароль';
    if (error.status === 409) return 'Пользователь с таким email уже существует';
    if (error.status === 0 || error.status === 'FETCH_ERROR') return 'Сетевая ошибка';
    return 'Произошла ошибка';
  }
  return error.message ?? 'Произошла ошибка';
};
