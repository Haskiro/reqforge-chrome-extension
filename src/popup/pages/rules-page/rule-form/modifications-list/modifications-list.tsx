import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';

import type { RuleModification } from '@/types';

import { ModificationRow } from '../modification-row';
import styles from './modifications-list.module.css';

export type ModificationsListProps = {
  value: RuleModification[];
  onChange: (mods: RuleModification[]) => void;
  error?: boolean;
};

export const ModificationsList = ({ value, onChange, error }: ModificationsListProps) => {
  const handleAdd = () => {
    onChange([
      ...value,
      { id: crypto.randomUUID(), type: 'ADD_HEADER', name: '', value: '', bodyLanguage: null },
    ]);
  };

  const handleChange = (index: number, updated: RuleModification) => {
    const next = [...value];
    next[index] = updated;
    onChange(next);
  };

  const handleDelete = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <Flex vertical gap={8} className={styles.container}>
      {error && value.length === 0 && (
        <Typography.Text type="danger" className={styles.error}>
          Добавьте хотя бы одну модификацию
        </Typography.Text>
      )}
      {value.map((mod, index) => (
        <ModificationRow
          key={mod.id}
          modification={mod}
          showErrors={error ?? false}
          onChange={(updated) => handleChange(index, updated)}
          onDelete={() => handleDelete(index)}
        />
      ))}
      <Button icon={<PlusOutlined />} onClick={handleAdd}>
        Добавить модификацию
      </Button>
    </Flex>
  );
};
