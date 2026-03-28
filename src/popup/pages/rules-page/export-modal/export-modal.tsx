import { Modal, Tree } from 'antd';
import type { Key } from 'react';
import { useState } from 'react';

import { useAppSelector } from '@/store';
import { selectRulesState } from '@/store/selectors';

import { buildTreeData, downloadJson } from './helpers';

export type ExportModalProps = {
  open: boolean;
  onClose: () => void;
};

export const ExportModal = ({ open, onClose }: ExportModalProps) => {
  const { rules, interactiveGroups, backgroundGroups } = useAppSelector(selectRulesState);
  const [checkedKeys, setCheckedKeys] = useState<Key[]>(() => rules.map((r) => `rule-${r.id}`));

  const treeData = buildTreeData(interactiveGroups, backgroundGroups, rules);

  const selectedRuleIds = checkedKeys
    .filter((k) => String(k).startsWith('rule-'))
    .map((k) => String(k).slice('rule-'.length));

  const handleOk = () => {
    const selectedRules = rules.filter((r) => selectedRuleIds.includes(r.id));
    const usedGroupIds = new Set(selectedRules.map((r) => r.groupId));

    downloadJson(
      {
        version: 1,
        interactiveGroups: interactiveGroups.filter((g) => usedGroupIds.has(g.id)),
        backgroundGroups: backgroundGroups.filter((g) => usedGroupIds.has(g.id)),
        rules: selectedRules,
      },
      'reqforge-rules.json',
    );
    onClose();
  };

  const handleCheck = (checked: Key[] | { checked: Key[]; halfChecked: Key[] }) => {
    setCheckedKeys(Array.isArray(checked) ? checked : checked.checked);
  };

  return (
    <Modal
      title="Экспорт правил"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="OK"
      cancelText="Отменить"
      okButtonProps={{ disabled: selectedRuleIds.length === 0 }}
    >
      <Tree
        checkable
        defaultExpandAll
        treeData={treeData}
        checkedKeys={checkedKeys}
        onCheck={handleCheck}
      />
    </Modal>
  );
};
