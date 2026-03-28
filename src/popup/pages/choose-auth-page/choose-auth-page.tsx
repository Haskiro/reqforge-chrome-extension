import { ArrowRightOutlined } from '@ant-design/icons';
import { AppLogo } from '@components/app-logo';
import { Button, Flex } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/store';
import { saveAuthMode } from '@/store/authSlice';

import styles from './choose-auth-page.module.css';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';

type View = 'landing' | 'login' | 'register';

export const ChooseAuthPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [view, setView] = useState<View>('landing');

  const handleSkip = async () => {
    await dispatch(saveAuthMode('guest'));
    void navigate('/rules');
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
          {view === 'login' && <LoginForm onBack={() => setView('landing')} />}
          {view === 'register' && <RegisterForm onBack={() => setView('landing')} />}
        </Flex>
      </Flex>
    </Flex>
  );
};
