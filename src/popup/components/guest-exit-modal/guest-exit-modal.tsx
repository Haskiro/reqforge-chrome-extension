import { Alert, Flex, Modal } from 'antd';

import styles from './guest-exit-modal.module.css';

export type GuestExitModalProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const GuestExitModal = ({ open, onCancel, onConfirm }: GuestExitModalProps) => {
  return (
    <Modal
      title="Вы находитесь в гостевом режиме"
      open={open}
      okText="Продолжить"
      cancelText="Отмена"
      onOk={onConfirm}
      onCancel={onCancel}
      centered={true}
    >
      <Flex vertical gap={12} className={styles.body}>
        <Alert
          type="warning"
          title="При выходе из него все созданные правила будут удалены. Если вы не хотите потерять их, то воспользуйтесь функционалом экспорта"
          showIcon
        />
      </Flex>
    </Modal>
  );
};
