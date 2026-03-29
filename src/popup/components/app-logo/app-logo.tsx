import logo from '@assets/logo.svg';
import { Space } from 'antd';

import styles from './app-logo.module.css';

export const AppLogo = () => {
  return (
    <Space size={16} align="center">
      <img src={logo} width={40} height={40} alt="ReqForge" />
      <span className={styles.name}>ReqForge</span>
    </Space>
  );
};
