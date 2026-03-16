import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { CollapseProps } from 'antd';
import { Button, Collapse, Switch, Tabs } from 'antd';

import { useAppDispatch, useAppSelector } from '../../../store';
import {
  deleteGroup,
  deleteRule,
  setActiveMode,
  setSelectedRuleId,
  toggleRule,
} from '../../../store/rulesSlice';
import type { RuleMode } from '../../../types';
import { RuleRow } from '../rule-row';
import styles from '../rules-page.module.css';

const MODE_TABS = [
  { key: 'interactive', label: 'Останавливающие' },
  { key: 'background', label: 'Фоновые' },
];

export function RulesList() {
  const dispatch = useAppDispatch();
  const { rules, groups, selectedRuleId, activeMode } = useAppSelector((s) => s.rules);

  const filteredRules = rules.filter((r) => r.mode === activeMode);

  const collapseItems: CollapseProps['items'] = groups.map((group) => {
    const groupRules = filteredRules.filter((r) => r.groupId === group.id);
    const allEnabled = groupRules.length > 0 && groupRules.every((r) => r.enabled);

    return {
      key: group.id,
      label: (
        <div className={styles.groupLabel}>
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
        </div>
      ),
      extra: (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <Button
            type="primary"
            shape="circle"
            size="small"
            icon={<EditOutlined />}
            onClick={() => dispatch(setSelectedRuleId(null))}
          />
          <Button
            danger
            shape="circle"
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => dispatch(deleteGroup(group.id))}
          />
        </div>
      ),
      children:
        groupRules.length === 0 ? (
          <div className={styles.emptyGroup}>Нет правил в этой группе</div>
        ) : (
          <div className={styles.rulesList}>
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
          </div>
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
        <Collapse items={collapseItems} defaultActiveKey={groups.map((g) => g.id)} bordered />
      </div>
    </div>
  );
}
