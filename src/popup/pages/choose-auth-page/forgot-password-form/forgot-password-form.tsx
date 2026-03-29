import { Alert, Button, Flex, Form, Input, message, Typography } from 'antd';
import { useState } from 'react';

import { getApiErrorMessage, useResetPasswordMutation, useSendCodeMutation } from '@/store/api';

import styles from './forgot-password-form.module.css';

export type ForgotPasswordFormProps = {
  onBack: () => void;
};

type EmailFormValues = {
  email: string;
};

type ResetFormValues = {
  code: string;
  newPassword: string;
  confirmPassword: string;
};

export const ForgotPasswordForm = ({ onBack }: ForgotPasswordFormProps) => {
  const [sendCode, { isLoading: isSending }] = useSendCodeMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSendCode = async (values: EmailFormValues) => {
    setErrorMsg(null);
    try {
      await sendCode({ email: values.email, type: 'RESET' }).unwrap();
      setEmail(values.email);
      setStep('reset');
    } catch (err) {
      const apiErr = err as Parameters<typeof getApiErrorMessage>[0];
      if (apiErr && 'status' in apiErr && apiErr.status === 404) {
        setErrorMsg('Пользователь с таким email не найден');
      } else {
        setErrorMsg(getApiErrorMessage(apiErr) ?? 'Произошла ошибка');
      }
    }
  };

  const handleReset = async (values: ResetFormValues) => {
    setErrorMsg(null);
    try {
      await resetPassword({ email, code: values.code, newPassword: values.newPassword }).unwrap();
      void message.success('Пароль успешно изменён');
      onBack();
    } catch (err) {
      const apiErr = err as Parameters<typeof getApiErrorMessage>[0];
      if (apiErr && 'status' in apiErr && apiErr.status === 401) {
        setErrorMsg('Неверный или просроченный код');
      } else {
        setErrorMsg(getApiErrorMessage(apiErr) ?? 'Произошла ошибка');
      }
    }
  };

  const handleResend = async () => {
    setErrorMsg(null);
    try {
      await sendCode({ email, type: 'RESET' }).unwrap();
    } catch (err) {
      const apiErr = err as Parameters<typeof getApiErrorMessage>[0];
      setErrorMsg(getApiErrorMessage(apiErr) ?? 'Произошла ошибка');
    }
  };

  if (step === 'email') {
    return (
      <Flex vertical gap={16} className={styles.form}>
        <Form
          layout="vertical"
          onFinish={(v: EmailFormValues) => void handleSendCode(v)}
          requiredMark={false}
        >
          {errorMsg && <Alert type="error" title={errorMsg} className={styles.alert} showIcon />}
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}
          >
            <Input placeholder="example@mail.com" size="large" />
          </Form.Item>
          <Flex justify="space-between" align="center" className={styles.actions}>
            <Button type="link" onClick={onBack} disabled={isSending}>
              ← Назад
            </Button>
            <Button type="primary" htmlType="submit" loading={isSending}>
              Отправить код
            </Button>
          </Flex>
        </Form>
      </Flex>
    );
  }

  return (
    <Flex vertical gap={16} className={styles.form}>
      <Typography.Text type="secondary">
        Код отправлен на <strong>{email}</strong>
      </Typography.Text>
      <Form
        layout="vertical"
        onFinish={(v: ResetFormValues) => void handleReset(v)}
        requiredMark={false}
      >
        {errorMsg && <Alert type="error" title={errorMsg} className={styles.alert} showIcon />}
        <Form.Item
          name="code"
          label="Код из письма"
          rules={[{ required: true, message: 'Введите код' }]}
        >
          <Input placeholder="123456" size="large" maxLength={6} />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="Новый пароль"
          rules={[{ required: true, min: 8, max: 128, message: 'От 8 до 128 символов' }]}
        >
          <Input.Password placeholder="••••••••" size="large" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Повторите пароль"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Подтвердите пароль' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                return Promise.reject(new Error('Пароли не совпадают'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="••••••••" size="large" />
        </Form.Item>
        <Flex justify="space-between" align="center" className={styles.actions}>
          <Button
            type="link"
            onClick={() => void handleResend()}
            disabled={isResetting}
            loading={isSending}
          >
            Отправить повторно
          </Button>
          <Button type="primary" htmlType="submit" loading={isResetting}>
            Сохранить
          </Button>
        </Flex>
      </Form>
    </Flex>
  );
};
