import Logo from '@assets/logo.svg?react';

import styles from './app-logo.module.css';

export function AppLogo() {
  return (
    <div className={styles.root}>
      <Logo width={40} height={40} />
      <span className={styles.name}>ReqForge</span>
    </div>
  );
}
