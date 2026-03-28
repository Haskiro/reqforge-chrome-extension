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
    >
      <span className={styles.ruleDash}>–</span>
      <Switch size="small" checked={rule.enabled} onChange={onToggle} />
      <span className={styles.ruleName} onClick={onEdit}>
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
        />
        <Button danger shape="circle" size="small" icon={<DeleteOutlined />} onClick={onDelete} />
      </Space>
    </Flex>
  );
};
