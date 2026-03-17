import { DeleteOutlined } from '@ant-design/icons';
import { Button, Input, Select } from 'antd';

import type { ModificationType, RuleModification } from '@/types';

import styles from './modification-row.module.css';

const MODIFICATION_TYPES: { value: ModificationType; label: string }[] = [
  { value: 'ADD_HEADER', label: 'Добавить заголовок' },
  { value: 'REPLACE_BODY', label: 'Заменить тело' },
  { value: 'REPLACE_URL', label: 'Заменить URL' },
  { value: 'REPLACE_STATUS', label: 'Заменить статус' },
];

export type ModificationRowProps = {
  modification: RuleModification;
  showErrors: boolean;
  onChange: (updated: RuleModification) => void;
  onDelete: () => void;
};

export const ModificationRow = ({
  modification,
  showErrors,
  onChange,
  onDelete,
}: ModificationRowProps) => {
  const handleTypeChange = (type: ModificationType) => {
    onChange({ ...modification, type, name: type === 'ADD_HEADER' ? modification.name : null });
  };

  const nameEmpty =
    showErrors && modification.type === 'ADD_HEADER' && !(modification.name ?? '').trim();
  const valueEmpty = showErrors && !modification.value.trim();

  return (
    <div className={styles.row}>
      <Select
        className={styles.typeSelect}
        value={modification.type}
        options={MODIFICATION_TYPES}
        onChange={handleTypeChange}
      />
      {modification.type === 'ADD_HEADER' && (
        <Input
          className={styles.nameInput}
          placeholder="Имя заголовка"
          status={nameEmpty ? 'error' : undefined}
          value={modification.name ?? ''}
          onChange={(e) => onChange({ ...modification, name: e.target.value })}
        />
      )}
      <Input
        className={styles.valueInput}
        placeholder="Значение"
        status={valueEmpty ? 'error' : undefined}
        value={modification.value}
        onChange={(e) => onChange({ ...modification, value: e.target.value })}
      />
      <Button danger icon={<DeleteOutlined />} onClick={onDelete} />
    </div>
  );
};
