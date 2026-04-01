import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Flex, Space, Switch } from 'antd';

import type { Rule } from '@/types';

import styles from '../rules-page.module.css';

export type RuleRowProps = {
  rule: Rule;
  selected: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
};

export const RuleRow = ({ rule, selected, onEdit, onDelete, onToggle }: RuleRowProps) => {
  return (
    <Flex
      align="center"
      gap={8}
      className={`${styles.ruleRow} ${selected ? styles.ruleRowSelected : ''}`}
      data-testid={`rule-row-${rule.id}`}
    >
      <span className={styles.ruleDash}>–</span>
      <Switch
        size="small"
        checked={rule.enabled}
        onChange={onToggle}
        data-testid={`rule-toggle-${rule.id}`}
      />
      <span className={styles.ruleName} onClick={onEdit} data-testid={`rule-name-${rule.id}`}>
        {rule.name}
      </span>
      <Space size={4}>
        <Button
          color="primary"
          shape="circle"
          size="small"
          variant="outlined"
          icon={<EditOutlined />}
          onClick={onEdit}
          data-testid={`rule-edit-btn-${rule.id}`}
        />
        <Button
          danger
          shape="circle"
          size="small"
          icon={<DeleteOutlined />}
          onClick={onDelete}
          data-testid={`rule-delete-btn-${rule.id}`}
        />
      </Space>
    </Flex>
  );
};
