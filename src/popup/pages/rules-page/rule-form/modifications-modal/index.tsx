import { Alert, Modal } from 'antd';
import { useState } from 'react';

import type { RuleDirection, RuleModification } from '@/types';

import { ModificationsList } from '../modifications-list';

const isModificationsValid = (mods: RuleModification[]) =>
  mods.every(
    (m) => m.value.trim() !== '' && (m.type !== 'ADD_HEADER' || (m.name ?? '').trim() !== ''),
  );

const getDirectionConflict = (
  direction: RuleDirection,
  mods: RuleModification[],
): string | null => {
  if (direction === 'REQUEST' && mods.some((m) => m.type === 'REPLACE_STATUS')) {
    return 'Направление «Запрос» несовместимо с модификацией «Заменить статус» — статус применяется только к ответу';
  }
  if (direction === 'RESPONSE' && mods.some((m) => m.type === 'REPLACE_URL')) {
    return 'Направление «Ответ» несовместимо с модификацией «Заменить URL» — URL применяется только к запросу';
  }
  return null;
};

export type ModificationsModalProps = {
  open: boolean;
  value: RuleModification[];
  direction: RuleDirection;
  showErrors: boolean;
  onSave: (mods: RuleModification[]) => void;
  onCancel: () => void;
};

export const ModificationsModal = ({
  open,
  value,
  direction,
  showErrors,
  onSave,
  onCancel,
}: ModificationsModalProps) => {
  const [local, setLocal] = useState<RuleModification[]>(value);
  const [modsError, setModsError] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const handleOk = () => {
    const empty = local.length === 0;
    const invalid = !empty && !isModificationsValid(local);
    const conflict = !empty ? getDirectionConflict(direction, local) : null;

    if (empty || invalid) {
      setModsError(true);
      setConflictError(null);
      return;
    }
    if (conflict) {
      setConflictError(conflict);
      setModsError(false);
      return;
    }

    onSave(local);
  };

  const handleChange = (mods: RuleModification[]) => {
    setLocal(mods);
    if (mods.length > 0 && isModificationsValid(mods)) setModsError(false);
    if (conflictError) setConflictError(getDirectionConflict(direction, mods));
  };

  return (
    <Modal
      title="Модификации"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText="Применить"
      cancelText="Отмена"
      width={800}
      destroyOnHidden
    >
      {conflictError && (
        <Alert type="error" description={conflictError} style={{ marginBottom: 12 }} />
      )}
      <ModificationsList
        value={local}
        onChange={handleChange}
        error={modsError || (showErrors && local.length === 0)}
      />
    </Modal>
  );
};
