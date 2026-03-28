import { Alert, Button, Flex, Form, Input } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/store';
import { getApiErrorMessage, useLazyGetMeQuery, useLoginMutation } from '@/store/api';
import { setAuthenticated } from '@/store/authSlice';
import { loadRulesFromServer } from '@/store/rulesSlice';

import styles from './login-form.module.css';

export type LoginFormProps = {
  onBack: () => void;
};

type FormValues = {
  email: string;
  password: string;
};

export const LoginForm = ({ onBack }: LoginFormProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [login, { isLoading, error }] = useLoginMutation();
  const [getMe] = useLazyGetMeQuery();
  const [flowError, setFlowError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: FormValues) => {
    setFlowError(null);
    setIsSubmitting(true);
    try {
      const loginResult = await login(values)
        .unwrap()
        .catch(() => null);
      if (!loginResult) return;

      await chrome.storage.local.set({
        authToken: loginResult.access_token,
        authMode: 'authenticated',
      });

      const user = await getMe(undefined, true)
        .unwrap()
        .catch(() => null);
      if (!user) {
        setFlowError('Не удалось загрузить профиль. Попробуйте снова.');
        return;
      }

      dispatch(setAuthenticated({ token: loginResult.access_token, user }));
      await dispatch(loadRulesFromServer(loginResult.access_token));
      void navigate('/rules');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = flowError ?? (error ? getApiErrorMessage(error) : null);

  return (
    <Flex vertical gap={16} className={styles.form}>
      <Form
        layout="vertical"
        onFinish={(v: FormValues) => void handleSubmit(v)}
        requiredMark={false}
      >
        {displayError && <Alert type="error" title={displayError} className={styles.alert} />}
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
          rules={[{ required: true, min: 8, message: 'Минимум 8 символов' }]}
        >
          <Input.Password placeholder="••••••••" size="large" />
        </Form.Item>
        <Flex justify="space-between" align="center" className={styles.actions}>
          <Button type="link" onClick={onBack} disabled={isSubmitting}>
            ← Назад
          </Button>
          <Button type="primary" htmlType="submit" size="large" loading={isLoading || isSubmitting}>
            Войти
          </Button>
        </Flex>
      </Form>
    </Flex>
  );
};
