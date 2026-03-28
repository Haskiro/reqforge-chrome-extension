import { Badge, Flex, Space } from 'antd';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppSelector } from '@/store';

import styles from './app-bar.module.css';

type AppBarProps = {
  active?: 'rules' | 'traffic' | 'repeat' | 'help';
  rightExtra?: ReactNode;
};

export const AppBar = ({ active, rightExtra }: AppBarProps) => {
  const navigate = useNavigate();
  const repeatCount = useAppSelector((s) => s.repeat.entries.length);

  return (
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
            Трафик
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
        <div className={styles.avatar}>П</div>
      </Space>
    </Flex>
  );
};
