import Logo from '@assets/logo.svg?react';
import { Space } from 'antd';

import styles from './app-logo.module.css';

export const AppLogo = () => {
  return (
    <Space size={16} align="center">
      <Logo width={40} height={40} />
      <span className={styles.name}>ReqForge</span>
    </Space>
  );
};
