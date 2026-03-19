import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './app-bar.module.css';

type AppBarProps = {
  active?: 'rules' | 'traffic' | 'repeat' | 'help';
  rightExtra?: ReactNode;
};

export const AppBar = ({ active, rightExtra }: AppBarProps) => {
  const navigate = useNavigate();

  return (
    <div className={styles.appBar}>
      <div className={styles.appBarLeft}>
        <div className={styles.logo} />
        <nav className={styles.nav}>
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
            Повтор
          </span>
          <span
            className={`${styles.navItem} ${active === 'help' ? styles.navItemActive : ''}`}
            onClick={() => navigate('/help')}
          >
            Помощь
          </span>
        </nav>
      </div>
      <div className={styles.appBarRight}>
        {rightExtra}
        <div className={styles.avatar}>П</div>
      </div>
    </div>
  );
};
