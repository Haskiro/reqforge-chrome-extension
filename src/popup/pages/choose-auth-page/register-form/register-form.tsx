import { Alert, Button, Flex, Form, Input } from 'antd';
import { useState } from 'react';

import { getApiErrorMessage, useSendCodeMutation } from '@/store/api';

import styles from './register-form.module.css';

export type PendingRegisterData = {
  fullName: string;
  email: string;
  password: string;
};

export type RegisterFormProps = {
  onBack: () => void;
  onCodeSent: (data: PendingRegisterData) => void;
};

type FormValues = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export const RegisterForm = ({ onBack, onCodeSent }: RegisterFormProps) => {
  const [sendCode, { isLoading }] = useSendCodeMutation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (values: FormValues) => {
    setErrorMsg(null);
    try {
      await sendCode({ email: values.email, type: 'REGISTER' }).unwrap();
      onCodeSent({ fullName: values.fullName, email: values.email, password: values.password });
    } catch (err) {
      const apiErr = err as Parameters<typeof getApiErrorMessage>[0];
      setErrorMsg(getApiErrorMessage(apiErr) ?? 'Произошла ошибка');
    }
  };

  return (
    <Flex vertical gap={16} className={styles.form}>
      <Form
        layout="vertical"
        onFinish={(v: FormValues) => void handleSubmit(v)}
        requiredMark={false}
      >
        {errorMsg && <Alert type="error" title={errorMsg} className={styles.alert} showIcon />}
        <Form.Item
          name="fullName"
          label="Полное имя"
          rules={[{ required: true, max: 100, message: 'Введите имя (максимум 100 символов)' }]}
        >
          <Input placeholder="Иван Иванов" size="large" />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}
        >
          <Input placeholder="example@mail.com" size="large" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Пароль"
          rules={[{ required: true, min: 8, max: 128, message: 'От 8 до 128 символов' }]}
        >
          <Input.Password placeholder="••••••••" size="large" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Повторите пароль"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Подтвердите пароль' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error('Пароли не совпадают'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="••••••••" size="large" />
        </Form.Item>
        <Flex justify="space-between" align="center" className={styles.actions}>
          <Button type="link" onClick={onBack} disabled={isLoading}>
            ← Назад
          </Button>
          <Button type="primary" htmlType="submit" size="large" loading={isLoading}>
            Продолжить
          </Button>
        </Flex>
      </Form>
    </Flex>
  );
};
