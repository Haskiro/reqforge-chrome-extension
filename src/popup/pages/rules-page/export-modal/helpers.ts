import type { DataNode } from 'antd/es/tree';

import type { Group, Rule } from '@/types';

export const buildTreeData = (
  interactiveGroups: Group[],
  backgroundGroups: Group[],
  rules: Rule[],
): DataNode[] => {
  const buildGroupNode = (group: Group, mode: 'interactive' | 'background'): DataNode => ({
    title: group.name,
    key: `group-${group.id}`,
    children: rules
      .filter((r) => r.groupId === group.id && r.mode === mode)
      .map((rule) => ({ title: rule.name, key: `rule-${rule.id}`, isLeaf: true })),
  });

  return [
    {
      title: 'Останавливающие',
      key: 'mode-interactive',
      children: interactiveGroups.map((g) => buildGroupNode(g, 'interactive')),
    },
    {
      title: 'Фоновые',
      key: 'mode-background',
      children: backgroundGroups.map((g) => buildGroupNode(g, 'background')),
    },
  ];
};

export const downloadJson = (data: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
