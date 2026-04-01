import { ArrowRightOutlined } from '@ant-design/icons';
import { AppLogo } from '@components/app-logo';
import { Button, Flex } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/store';
import { saveAuthMode } from '@/store/authSlice';

import styles from './choose-auth-page.module.css';
import { ForgotPasswordForm } from './forgot-password-form';
import { LoginForm } from './login-form';
import type { PendingRegisterData } from './register-form';
import { RegisterForm } from './register-form';
import { VerifyEmailForm } from './verify-email-form';

type View = 'landing' | 'login' | 'register' | 'verify-email' | 'forgot-password';

export const ChooseAuthPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [view, setView] = useState<View>('landing');
  const [pendingRegisterData, setPendingRegisterData] = useState<PendingRegisterData | null>(null);

  const handleSkip = async () => {
    await dispatch(saveAuthMode('guest'));
    void navigate('/rules');
  };

  const handleCodeSent = (data: PendingRegisterData) => {
    setPendingRegisterData(data);
    setView('verify-email');
  };

  return (
    <Flex align="center" justify="center" className={styles.page}>
      <Flex vertical align="stretch" className={styles.content}>
        <Flex align="center" justify="space-between" className={styles.header}>
          <AppLogo />
          <Button
            variant="outlined"
            color="primary"
            icon={<ArrowRightOutlined />}
            iconPlacement="end"
            onClick={() => void handleSkip()}
            data-testid="skip-auth-button"
          >
            Пропустить
          </Button>
        </Flex>

        <Flex vertical gap={16} className={styles.card}>
          {view === 'landing' && (
            <>
              <Button type="primary" block size="large" onClick={() => setView('register')}>
                Создать новый аккаунт
              </Button>
              <Button
                block
                size="large"
                className={styles.loginButton}
                onClick={() => setView('login')}
              >
                Уже есть аккаунт? Войти
              </Button>
            </>
          )}
          {view === 'login' && (
            <LoginForm
              onBack={() => setView('landing')}
              onForgotPassword={() => setView('forgot-password')}
            />
          )}
          {view === 'register' && (
            <RegisterForm onBack={() => setView('landing')} onCodeSent={handleCodeSent} />
          )}
          {view === 'verify-email' && pendingRegisterData && (
            <VerifyEmailForm pendingData={pendingRegisterData} onBack={() => setView('register')} />
          )}
          {view === 'forgot-password' && <ForgotPasswordForm onBack={() => setView('login')} />}
        </Flex>
      </Flex>
    </Flex>
  );
};
