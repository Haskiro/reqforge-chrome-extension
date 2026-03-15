export type RuleMode = 'interactive' | 'background';

export type RuleType = {
  id: number;
  value: 'contains' | 'equals' | 'regex';
  name: string;
};

export type Group = {
  id: string;
  name: string;
};

export type Rule = {
  id: string;
  name: string;
  method: string[];
  value: string;
  ruleTypeId: number;
  groupId: string;
  enabled: boolean;
  mode: RuleMode;
};

export type TrafficEntry = {
  id: string;
  timestamp: number;
  direction: 'request' | 'response';
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  statusCode?: number;
};

export type StoredEntry = {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  /** pending = held waiting for send; sent = in-flight; response_pending = response held for edit; complete = delivered to page */
  status: 'pending' | 'sent' | 'response_pending' | 'complete';
  /** Tab that made the request — needed to route PROCEED back to the right page */
  tabId?: number;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
};
