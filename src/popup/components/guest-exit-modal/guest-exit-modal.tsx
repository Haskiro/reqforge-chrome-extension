import { ExportModal } from '@pages/rules-page/export-modal';
import { Alert, Button, Flex, Modal } from 'antd';
import { useState } from 'react';

import { useAppSelector } from '@/store';
import { selectRulesState } from '@/store/selectors';

import styles from './guest-exit-modal.module.css';

export type GuestExitModalProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const GuestExitModal = ({ open, onCancel, onConfirm }: GuestExitModalProps) => {
  const { rules } = useAppSelector(selectRulesState);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportKey, setExportKey] = useState(0);

  const handleExport = () => {
    setExportKey((k) => k + 1);
    setExportOpen(true);
  };

  return (
    <>
      <Modal
        title="Выход из гостевого режима"
        open={open}
        okText="Продолжить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
        onOk={onConfirm}
        onCancel={onCancel}
      >
        <Flex vertical gap={12} className={styles.body}>
          {rules.length > 0 && (
            <>
              <Alert
                type="warning"
                title="Все правила гостевого режима будут удалены при входе в аккаунт."
                showIcon
              />
              <Button type="link" className={styles.exportLink} onClick={handleExport}>
                Экспортировать правила перед выходом
              </Button>
            </>
          )}
          {rules.length === 0 && <p className={styles.text}>Войти в аккаунт?</p>}
        </Flex>
      </Modal>
      <ExportModal key={exportKey} open={exportOpen} onClose={() => setExportOpen(false)} />
    </>
  );
};
