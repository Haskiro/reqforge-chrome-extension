import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { CollapseProps } from 'antd';
import { Button, Collapse, Flex, Space, Switch, Tabs } from 'antd';
import { useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/store';
import {
  DEFAULT_BACKGROUND_GROUP_ID,
  DEFAULT_GROUP_ID,
  deleteGroup,
  deleteRule,
  renameGroup,
  setActiveMode,
  setSelectedRuleId,
  toggleRule,
} from '@/store/rulesSlice.ts';
import { selectRulesState } from '@/store/selectors';
import type { Group, RuleMode } from '@/types';

import { DeleteGroupModal } from '../delete-group-modal';
import { EditGroupModal } from '../edit-group-modal';
import { RuleRow } from '../rule-row';
import styles from '../rules-page.module.css';
import { MODE_TABS } from './constants';

export const RulesList = () => {
  const dispatch = useAppDispatch();
  const { rules, interactiveGroups, backgroundGroups, selectedRuleId, activeMode } =
    useAppSelector(selectRulesState);
  const groups = activeMode === 'interactive' ? interactiveGroups : backgroundGroups;
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const filteredRules = rules.filter((r) => r.mode === activeMode);

  const handleDeleteConfirm = (moveToGroupId?: string) => {
    if (!deletingGroup) return;
    dispatch(deleteGroup({ id: deletingGroup.id, moveToGroupId }));
    setDeletingGroup(null);
  };

  const collapseItems: CollapseProps['items'] = groups.map((group) => {
    const groupRules = filteredRules.filter((r) => r.groupId === group.id);
    const allEnabled = groupRules.length > 0 && groupRules.every((r) => r.enabled);

    return {
      key: group.id,
      label: (
        <Flex align="center" gap={8}>
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              size="small"
              checked={allEnabled}
              onChange={() =>
                groupRules.forEach((r) => {
                  if (r.enabled !== !allEnabled) dispatch(toggleRule(r.id));
                })
              }
            />
          </div>
          <span className={styles.groupName}>{group.name}</span>
        </Flex>
      ),
      extra:
        group.id !== DEFAULT_GROUP_ID && group.id !== DEFAULT_BACKGROUND_GROUP_ID ? (
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            <Button
              color="primary"
              shape="circle"
              size="small"
              variant="outlined"
              icon={<EditOutlined />}
              onClick={() => setEditingGroup(group)}
            />
            <Button
              danger
              shape="circle"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => setDeletingGroup(group)}
            />
          </Space>
        ) : null,
      children:
        groupRules.length === 0 ? (
          <div className={styles.emptyGroup}>Нет правил в этой группе</div>
        ) : (
          <Flex vertical gap={2}>
            {groupRules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                selected={selectedRuleId === rule.id}
                onEdit={() => dispatch(setSelectedRuleId(rule.id))}
                onDelete={() => dispatch(deleteRule(rule.id))}
                onToggle={() => dispatch(toggleRule(rule.id))}
              />
            ))}
          </Flex>
        ),
    };
  });

  return (
    <div className={styles.leftPanel}>
      <Tabs
        activeKey={activeMode}
        onChange={(key) => dispatch(setActiveMode(key as RuleMode))}
        items={MODE_TABS}
        className={styles.modeTabs}
      />
      <div className={styles.collapseWrapper}>
        <Collapse
          key={activeMode}
          items={collapseItems}
          defaultActiveKey={groups.map((g) => g.id)}
          bordered
        />
      </div>

      <DeleteGroupModal
        open={deletingGroup !== null}
        group={deletingGroup}
        otherGroups={groups.filter((g) => g.id !== deletingGroup?.id)}
        rulesCount={filteredRules.filter((r) => r.groupId === deletingGroup?.id).length}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingGroup(null)}
      />

      <EditGroupModal
        open={editingGroup !== null}
        group={editingGroup}
        onConfirm={(name) => {
          if (editingGroup) dispatch(renameGroup({ id: editingGroup.id, name }));
          setEditingGroup(null);
        }}
        onCancel={() => setEditingGroup(null)}
      />
    </div>
  );
};
