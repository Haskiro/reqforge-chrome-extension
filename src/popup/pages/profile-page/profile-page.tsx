import { AppBar } from '@components/app-bar';
import { Alert, Button, Flex, Form, Input, Layout, message, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/store';
import { getApiErrorMessage, useUpdateMeMutation } from '@/store/api';
import { updateUser } from '@/store/authSlice';
import { selectAuth } from '@/store/selectors';

import { ChangePasswordModal } from './change-password-modal';
import styles from './profile-page.module.css';

type FormValues = {
  fullName: string;
  email: string;
};

export const ProfilePage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(selectAuth);
  const [form] = Form.useForm<FormValues>();
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({ fullName: user.fullName, email: user.email });
    }
  }, [user, form]);

  const handleSubmit = async (values: FormValues) => {
    setErrorMsg(null);
    try {
      const updated = await updateMe(values).unwrap();
      dispatch(updateUser({ id: updated.id, fullName: updated.fullName, email: updated.email }));
      void message.success('Профиль обновлён');
    } catch (err) {
      const msg = getApiErrorMessage(err as Parameters<typeof getApiErrorMessage>[0]);
      setErrorMsg(msg ?? 'Произошла ошибка');
    }
  };

  return (
    <Layout className={styles.page}>
      <AppBar />

      <Layout.Content className={styles.content}>
        <Typography.Title level={4} style={{ marginBottom: 24 }}>
          Профиль
        </Typography.Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={(v: FormValues) => void handleSubmit(v)}
          requiredMark={false}
        >
          {errorMsg && (
            <Alert type="error" title={errorMsg} style={{ marginBottom: 16 }} showIcon />
          )}
          <Form.Item
            name="fullName"
            label="ФИО"
            rules={[
              { required: true, message: 'Введите имя' },
              { max: 100, message: 'Максимум 100 символов' },
            ]}
          >
            <Input size="large" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}
          >
            <Input size="large" />
          </Form.Item>
          <Flex gap={8}>
            <Button onClick={() => setPasswordModalOpen(true)}>Сменить пароль</Button>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              Сохранить
            </Button>
          </Flex>
        </Form>
      </Layout.Content>

      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </Layout>
  );
};
