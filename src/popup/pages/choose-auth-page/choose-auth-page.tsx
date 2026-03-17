import { ArrowRightOutlined } from '@ant-design/icons';
import { AppLogo } from '@components/app-logo';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/store';
import { saveAuthMode } from '@/store/authSlice';

import styles from './choose-auth-page.module.css';

export const ChooseAuthPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleSkip = async () => {
    await dispatch(saveAuthMode('guest'));
    void navigate('/rules');
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.header}>
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
        </div>

        <div className={styles.card}>
          <Button type="primary" block size="large">
            Создать новый аккаунт
          </Button>
          <Button block size="large" className={styles.loginButton}>
            Уже есть аккаунт? Войти
          </Button>
        </div>
      </div>
    </div>
  );
};
