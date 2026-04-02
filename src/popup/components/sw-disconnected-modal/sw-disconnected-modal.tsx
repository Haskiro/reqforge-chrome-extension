import { WarningOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';

import styles from './sw-disconnected-modal.module.css';

export type SwDisconnectedModalProps = {
  open: boolean;
  onReconnect: () => Promise<void>;
};

export const SwDisconnectedModal = ({ open, onReconnect }: SwDisconnectedModalProps) => {
  const handleClick = async () => {
    await onReconnect();
  };

  return (
    <Modal open={open} closable={false} maskClosable={false} footer={null} centered width={400}>
      <div className={styles.content}>
        <WarningOutlined className={styles.icon} />
        <h3 className={styles.title}>Соединение прервано</h3>
        <p className={styles.description}>
          Отладка браузера была отключена. Перехват запросов и функция Повтора недоступны.
        </p>
        <Button type="primary" onClick={handleClick}>
          Переподключить
        </Button>
      </div>
    </Modal>
  );
};
