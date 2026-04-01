import { Form, Input, Modal } from 'antd';
import { useEffect } from 'react';

import type { Group } from '@/types';

export type EditGroupModalProps = {
  open: boolean;
  group: Group | null;
  onConfirm: (name: string) => void;
  onCancel: () => void;
};

export const EditGroupModal = ({ open, group, onConfirm, onCancel }: EditGroupModalProps) => {
  const [form] = Form.useForm<{ name: string }>();

  useEffect(() => {
    if (open) form.setFieldsValue({ name: group?.name ?? '' });
  }, [open, group, form]);

  const handleOk = () => {
    void form.validateFields().then(({ name }) => {
      onConfirm(name.trim());
      form.resetFields();
    });
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Переименовать группу"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Сохранить"
      cancelText="Отмена"
      centered={true}
      data-testid="edit-group-modal"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Название"
          name="name"
          rules={[{ required: true, message: 'Введите название группы' }]}
        >
          <Input
            placeholder="Название группы"
            onPressEnter={handleOk}
            data-testid="edit-group-input"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
