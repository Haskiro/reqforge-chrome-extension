import { Alert, Button, Flex, Form, Input } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/store';
import {
  getApiErrorMessage,
  useLazyGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
} from '@/store/api';
import { setAuthenticated } from '@/store/authSlice';
import { loadRulesFromServer } from '@/store/rulesSlice';

import styles from './register-form.module.css';

export type RegisterFormProps = {
  onBack: () => void;
};

type FormValues = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export const RegisterForm = ({ onBack }: RegisterFormProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [register, { isLoading, error: registerError }] = useRegisterMutation();
  const [login] = useLoginMutation();
  const [getMe] = useLazyGetMeQuery();
  const [flowError, setFlowError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: FormValues) => {
    setFlowError(null);
    setIsSubmitting(true);
    try {
      const { confirmPassword: _, ...registerData } = values;
      const registerResult = await register(registerData)
        .unwrap()
        .catch(() => null);
      if (!registerResult) return;

      const loginResult = await login({ email: values.email, password: values.password })
        .unwrap()
        .catch(() => null);
      if (!loginResult) {
        setFlowError('Аккаунт создан, но не удалось войти. Попробуйте войти вручную.');
        return;
      }

      await chrome.storage.local.set({
        authToken: loginResult.access_token,
        authMode: 'authenticated',
      });

      const user = await getMe(undefined, true)
        .unwrap()
        .catch(() => null);
      if (!user) {
        setFlowError('Не удалось загрузить профиль. Попробуйте войти вручную.');
        return;
      }

      dispatch(setAuthenticated({ token: loginResult.access_token, user }));
      await dispatch(loadRulesFromServer(loginResult.access_token));
      void navigate('/rules');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = flowError ?? (registerError ? getApiErrorMessage(registerError) : null);

  return (
    <Flex vertical gap={16} className={styles.form}>
      <Form
        layout="vertical"
        onFinish={(v: FormValues) => void handleSubmit(v)}
        requiredMark={false}
      >
        {displayError && <Alert type="error" title={displayError} className={styles.alert} />}
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
          <Button type="link" onClick={onBack} disabled={isSubmitting}>
            ← Назад
          </Button>
          <Button type="primary" htmlType="submit" size="large" loading={isLoading || isSubmitting}>
            Создать аккаунт
          </Button>
        </Flex>
      </Form>
    </Flex>
  );
};
