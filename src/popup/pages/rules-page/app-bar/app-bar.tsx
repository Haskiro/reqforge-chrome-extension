import { AppBar as SharedAppBar } from '@components/app-bar';
import { Button, message } from 'antd';
import { useRef, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/store';
import { importRules, importRulesForServer } from '@/store/rulesSlice';
import { selectAuth, selectRulesState } from '@/store/selectors';

import { ExportModal } from '../export-modal';
import { isValidImportData } from './helpers';

export const AppBar = () => {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportKey, setExportKey] = useState(0);
  const { mode: authMode } = useAppSelector(selectAuth);
  const { interactiveGroups, backgroundGroups } = useAppSelector(selectRulesState);

  const handleOpenExport = () => {
    setExportKey((k) => k + 1);
    setExportOpen(true);
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      void (async () => {
        try {
          const data: unknown = JSON.parse(e.target?.result as string);
          if (!isValidImportData(data)) {
            void message.error('Неверный формат файла');
            return;
          }
          if (authMode !== 'authenticated') {
            dispatch(importRules(data));
            void message.success(`Импортировано правил: ${data.rules.length}`);
            return;
          }
          const result = await dispatch(
            importRulesForServer({ data, interactiveGroups, backgroundGroups }),
          );
          if (importRulesForServer.fulfilled.match(result)) {
            void message.success(`Импортировано правил: ${result.payload}`);
          } else {
            void message.error('Ошибка при импорте');
          }
        } catch {
          void message.error('Неверный формат файла');
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      })();
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
