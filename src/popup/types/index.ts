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
