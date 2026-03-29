import { Alert, Modal } from 'antd';
import { useEffect, useState } from 'react';

import type { RuleDirection, RuleModification } from '@/types';

import { ModificationsList } from '../modifications-list';
import { getDirectionConflict, isModificationsValid } from './helpers';

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

  useEffect(() => {
    if (!open) return;
    setLocal(value);
    setModsError(false);
    setConflictError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      centered={true}
    >
      {conflictError && (
        <Alert type="error" description={conflictError} style={{ marginBottom: 12 }} showIcon />
      )}
      <ModificationsList
        value={local}
        onChange={handleChange}
        error={modsError || (showErrors && local.length === 0)}
      />
    </Modal>
  );
};
