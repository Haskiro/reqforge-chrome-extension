import { AppBar as SharedAppBar } from '@components/app-bar';
import { Button, message } from 'antd';
import { useRef, useState } from 'react';

import { useAppDispatch } from '@/store';
import { importRules } from '@/store/rulesSlice';

import { ExportModal } from '../export-modal';
import { isValidImportData } from './helpers';

export const AppBar = () => {
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

  const rightExtra = (
    <>
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
    </>
  );

  return (
    <>
      <SharedAppBar active="rules" rightExtra={rightExtra} />
      <ExportModal key={exportKey} open={exportOpen} onClose={() => setExportOpen(false)} />
    </>
  );
};
