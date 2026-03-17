import { Input, Modal } from 'antd';
import { useState } from 'react';

type AddGroupModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
};

export const AddGroupModal = ({ open, onClose, onAdd }: AddGroupModalProps) => {
  const [name, setName] = useState('');

  const handleOk = () => {
    if (name.trim()) onAdd(name.trim());
    setName('');
    onClose();
  };

  const handleCancel = () => {
    setName('');
    onClose();
  };

  return (
    <Modal
      title="Новая группа"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Создать"
      cancelText="Отмена"
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Название группы"
        onPressEnter={handleOk}
      />
    </Modal>
  );
};
