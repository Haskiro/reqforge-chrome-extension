import { ExportOutlined, ImportOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

import styles from '../rules-page.module.css';

export function AppBar() {
  const navigate = useNavigate();

  return (
    <div className={styles.appBar}>
      <div className={styles.appBarLeft}>
        <div className={styles.logo} />
        <nav className={styles.nav}>
          <span className={`${styles.navItem} ${styles.navItemActive}`}>Правила</span>
          <span className={styles.navItem} onClick={() => navigate('/traffic')}>
            Трафик
          </span>
          <span className={styles.navItem} onClick={() => navigate('/repeat')}>
            Повтор
          </span>
        </nav>
      </div>
      <div className={styles.appBarRight}>
        <Button type="primary" size="small" icon={<ImportOutlined />}>
          Импорт
        </Button>
        <Button size="small" icon={<ExportOutlined />}>
          Экспорт
        </Button>
        <div className={styles.avatar}>П</div>
      </div>
    </div>
  );
}
