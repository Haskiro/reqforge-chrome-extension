import { Button, message } from 'antd';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/store';
import { importRules } from '@/store/rulesSlice';

import { ExportModal } from '../export-modal';
import styles from '../rules-page.module.css';
import { isValidImportData } from './helpers';

export const AppBar = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportKey, setExportKey] = useState(0);

  const handleOpenExport = () => {
    setExportKey((k) => k + 1);
    setExportOpen(true);
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data: unknown = JSON.parse(e.target?.result as string);
        if (!isValidImportData(data)) {
          message.error('Неверный формат файла');
          return;
        }
        dispatch(importRules(data));
        message.success(`Импортировано правил: ${data.rules.length}`);
      } catch {
        message.error('Неверный формат файла');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

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
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
          }}
        />
        <Button type="primary" size="small" onClick={() => fileInputRef.current?.click()}>
          Импорт
        </Button>
        <Button size="small" onClick={handleOpenExport}>
          Экспорт
        </Button>
        <div className={styles.avatar}>П</div>
      </div>

      <ExportModal key={exportKey} open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
};
