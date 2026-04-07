import { Alert, Button, Flex, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/store';
import {
  getApiErrorMessage,
  useLazyGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useSendCodeMutation,
} from '@/store/api';
import { setAuthenticated } from '@/store/auth-slice';
import { loadRulesFromServer } from '@/store/rules-slice';

import type { PendingRegisterData } from '../register-form';
import styles from './verify-email-form.module.css';

export type VerifyEmailFormProps = {
  pendingData: PendingRegisterData;
  onBack: () => void;
};

type FormValues = {
  code: string;
};

export const VerifyEmailForm = ({ pendingData, onBack }: VerifyEmailFormProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [register] = useRegisterMutation();
  const [login] = useLoginMutation();
  const [getMe] = useLazyGetMeQuery();
  const [sendCode, { isLoading: isSending }] = useSendCodeMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (values: FormValues) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await register({ ...pendingData, code: values.code }).unwrap();

      const loginResult = await login({ email: pendingData.email, password: pendingData.password })
        .unwrap()
        .catch(() => null);
      if (!loginResult) {
        setErrorMsg('Аккаунт создан, но не удалось войти. Попробуйте войти вручную.');
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
        setErrorMsg('Не удалось загрузить профиль. Попробуйте войти вручную.');
        return;
      }

      dispatch(setAuthenticated({ token: loginResult.access_token, user }));
      await dispatch(loadRulesFromServer(loginResult.access_token));
      void navigate('/rules');
    } catch (err) {
      const apiErr = err as Parameters<typeof getApiErrorMessage>[0];
      if (apiErr && 'status' in apiErr && apiErr.status === 401) {
        setErrorMsg('Неверный или просроченный код');
      } else {
        setErrorMsg(getApiErrorMessage(apiErr) ?? 'Произошла ошибка');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg(null);
    try {
      await sendCode({ email: pendingData.email, type: 'REGISTER' }).unwrap();
    } catch (err) {
      const apiErr = err as Parameters<typeof getApiErrorMessage>[0];
      setErrorMsg(getApiErrorMessage(apiErr) ?? 'Произошла ошибка');
    }
  };

  return (
    <Flex vertical gap={16} className={styles.form}>
      <Typography.Text type="secondary">
        Код отправлен на <strong>{pendingData.email}</strong>
      </Typography.Text>
      <Form
        layout="vertical"
        onFinish={(v: FormValues) => void handleSubmit(v)}
        requiredMark={false}
      >
        {errorMsg && <Alert type="error" title={errorMsg} className={styles.alert} showIcon />}
        <Form.Item
          name="code"
          label="Код подтверждения"
          rules={[{ required: true, message: 'Введите код' }]}
        >
          <Input placeholder="123456" size="large" maxLength={6} />
        </Form.Item>
        <Flex vertical gap={8} className={styles.actions}>
          <Button type="primary" htmlType="submit" loading={isSubmitting} block>
            Подтвердить
          </Button>
          <Flex justify="space-between" align="center">
            <Button type="link" onClick={onBack} disabled={isSubmitting || isSending}>
              ← Назад
            </Button>
            <Button
              type="link"
              onClick={() => void handleResend()}
              disabled={isSubmitting}
              loading={isSending}
            >
              Отправить повторно
            </Button>
          </Flex>
        </Flex>
      </Form>
    </Flex>
  );
};
