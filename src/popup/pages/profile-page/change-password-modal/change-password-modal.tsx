import { Alert, Form, Input, message, Modal } from 'antd';
import { useState } from 'react';

import { getApiErrorMessage, useChangePasswordMutation } from '@/store/api';

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
};

type FormValues = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export const ChangePasswordModal = ({ open, onClose }: ChangePasswordModalProps) => {
  const [form] = Form.useForm<FormValues>();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClose = () => {
    form.resetFields();
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = async (values: FormValues) => {
    setErrorMsg(null);
    try {
      await changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      }).unwrap();
      void message.success('Пароль успешно изменён');
      handleClose();
    } catch (err) {
      const apiErr = err as Parameters<typeof getApiErrorMessage>[0];
      if (apiErr && 'status' in apiErr && apiErr.status === 401) {
        setErrorMsg('Неверный пароль');
      } else {
        setErrorMsg(getApiErrorMessage(apiErr) ?? 'Произошла ошибка');
      }
    }
  };

  return (
    <Modal
      title="Смена пароля"
      open={open}
      onCancel={handleClose}
      okText="Сохранить"
      cancelText="Отмена"
      confirmLoading={isLoading}
      onOk={() => form.submit()}
      destroyOnHidden={true}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v: FormValues) => void handleSubmit(v)}
        requiredMark={false}
      >
        {errorMsg && <Alert type="error" title={errorMsg} style={{ marginBottom: 16 }} showIcon />}
        <Form.Item
          name="oldPassword"
          label="Текущий пароль"
          rules={[{ required: true, min: 8, message: 'Минимум 8 символов' }]}
        >
          <Input.Password placeholder="••••••••" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="Новый пароль"
          rules={[{ required: true, min: 8, message: 'Минимум 8 символов' }]}
        >
          <Input.Password placeholder="••••••••" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Повторите новый пароль"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Повторите пароль' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Пароли не совпадают'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="••••••••" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
