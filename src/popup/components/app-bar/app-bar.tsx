import { GuestExitModal } from '@components/guest-exit-modal';
import type { MenuProps } from 'antd';
import { Badge, Button, Dropdown, Flex, Space } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/store';
import { api } from '@/store/api';
import { logoutUser, saveAuthMode } from '@/store/authSlice';
import { clearAllRules } from '@/store/rulesSlice';
import { selectAuth, selectRepeatEntryCount, selectTrafficEntryCount } from '@/store/selectors';

import styles from './app-bar.module.css';
import { getInitials } from './helpers';

type AppBarProps = {
  active?: 'rules' | 'traffic' | 'repeat' | 'help';
  rightExtra?: ReactNode;
};

export const AppBar = ({ active, rightExtra }: AppBarProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const trafficCount = useAppSelector(selectTrafficEntryCount);
  const repeatCount = useAppSelector(selectRepeatEntryCount);
  const { mode, user, loaded: authLoaded } = useAppSelector(selectAuth);
  const [guestExitOpen, setGuestExitOpen] = useState(false);

  useEffect(() => {
    if (authLoaded && mode === null) {
      void navigate('/choose-auth');
    }
  }, [mode, authLoaded, navigate]);

  const handleGuestExitConfirm = () => {
    setGuestExitOpen(false);
    dispatch(clearAllRules());
    void dispatch(saveAuthMode(null)).then(() => {
      void navigate('/choose-auth');
    });
  };

  const logoutMenu: MenuProps['items'] = [
    { key: 'name', label: user?.fullName, disabled: true },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Выйти',
      danger: true,
      onClick: () => {
        void dispatch(logoutUser()).then(() => {
          dispatch(api.util.resetApiState());
        });
      },
    },
  ];

  return (
    <>
      <Flex align="center" justify="space-between" className={styles.appBar}>
        <Space size={16} align="center">
          <div className={styles.logo} />
          <Space size={24} align="center" className={styles.nav}>
            <span
              className={`${styles.navItem} ${active === 'rules' ? styles.navItemActive : ''}`}
              onClick={() => navigate('/rules')}
            >
              Правила
            </span>
            <span
              className={`${styles.navItem} ${active === 'traffic' ? styles.navItemActive : ''}`}
              onClick={() => navigate('/traffic')}
            >
              <Badge count={trafficCount} size="small" offset={[6, -2]}>
                Трафик
              </Badge>
            </span>
            <span
              className={`${styles.navItem} ${active === 'repeat' ? styles.navItemActive : ''}`}
              onClick={() => navigate('/repeat')}
            >
              <Badge count={repeatCount} size="small" offset={[6, -2]}>
                Повтор
              </Badge>
            </span>
            <span
              className={`${styles.navItem} ${active === 'help' ? styles.navItemActive : ''}`}
              onClick={() => navigate('/help')}
            >
              Помощь
            </span>
          </Space>
        </Space>
        <Space size={8} align="center">
          {rightExtra}
          {mode === 'guest' && (
            <Button size="small" onClick={() => setGuestExitOpen(true)}>
              Войти
            </Button>
          )}
          {mode === 'authenticated' && (
            <Dropdown menu={{ items: logoutMenu }} trigger={['click']}>
              <div className={`${styles.avatar} ${styles.avatarClickable}`}>
                {getInitials(user?.fullName)}
              </div>
            </Dropdown>
          )}
        </Space>
      </Flex>
      <GuestExitModal
        open={guestExitOpen}
        onCancel={() => setGuestExitOpen(false)}
        onConfirm={handleGuestExitConfirm}
      />
    </>
  );
};
