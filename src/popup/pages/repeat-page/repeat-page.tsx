import { AppBar } from '@components/app-bar';
import { parseRawText, parseRequestFirstLine } from '@pages/modify-request-page/helpers';
import type { RepeatResponse } from '@shared/messages';
import { Button, Flex, Layout, Splitter, Tabs, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/store';
import { removeRepeatEntry, setActiveTabId, setRepeatResponse } from '@/store/repeatSlice';
import type { StoredEntry } from '@/types';

import { EntryEditor } from './entry-editor';
import { buildInitialEntryState, type EntryEditState } from './helpers';
import styles from './repeat-page.module.css';
import { ResponseViewer } from './response-viewer';

export const RepeatPage = () => {
  const dispatch = useAppDispatch();
  const entries = useAppSelector((s) => s.repeat.entries);

  const [editStates, setEditStates] = useState<Record<string, EntryEditState>>({});
  const responses = useAppSelector((s) => s.repeat.responses);
  const activeTabId = useAppSelector((s) => s.repeat.activeTabId);

  const effectiveActiveKey = useMemo(() => {
    if (entries.length === 0) return undefined;
    if (activeTabId && entries.some((e) => e.id === activeTabId)) return activeTabId;
    return entries[entries.length - 1].id;
  }, [entries, activeTabId]);

  const getEditState = (entry: StoredEntry): EntryEditState =>
    editStates[entry.id] ?? buildInitialEntryState(entry);

  const updateEditState = (id: string, patch: Partial<EntryEditState>) => {
    setEditStates((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? buildInitialEntryState(entries.find((e) => e.id === id)!)),
        ...patch,
      },
    }));
  };

  const resolveEditedFields = (es: EntryEditState) => {
    if (es.activeTab === 'text') {
      const { firstLine, headers, body } = parseRawText(es.rawText);
      const { method, url } = parseRequestFirstLine(firstLine);
      return { url, method, headers, body };
    }
    return { url: es.url, method: es.method, headers: es.headers, body: es.body };
  };

  const handleSend = () => {
    if (!effectiveActiveKey) return;
    const entry = entries.find((e) => e.id === effectiveActiveKey);
    if (!entry) return;
    const es = getEditState(entry);
    const { url, method, headers, body } = resolveEditedFields(es);

    updateEditState(effectiveActiveKey, { isSending: true });

    chrome.runtime.sendMessage(
      {
        type: 'REPEAT',
        entry,
        editedUrl: url,
        editedMethod: method,
        editedHeaders: headers,
        editedBody: body || undefined,
      },
      (response: RepeatResponse) => {
        updateEditState(effectiveActiveKey, { isSending: false });
        if (response.ok) {
          dispatch(
            setRepeatResponse({
              id: effectiveActiveKey,
              response: { status: response.status, headers: response.headers, body: response.body },
            }),
          );
        } else {
          dispatch(
            setRepeatResponse({
              id: effectiveActiveKey,
              response: { status: 0, headers: {}, body: '', error: response.error },
            }),
          );
        }
      },
    );
  };

  const handleTabEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove',
  ) => {
    if (action === 'remove' && typeof targetKey === 'string') {
      dispatch(removeRepeatEntry(targetKey));
    }
  };

  const names = useAppSelector((s) => s.repeat.names);

  const activeEntry = entries.find((e) => e.id === effectiveActiveKey);
  const activeEs = activeEntry ? getEditState(activeEntry) : null;

  const tabItems = entries.map((entry) => ({
    key: entry.id,
    label: names[entry.id] ?? entry.id,
    children: null,
  }));

  return (
    <Layout className={styles.page}>
      <AppBar active="repeat" />

      {entries.length === 0 ? (
        <Layout.Content className={styles.empty}>
          <Typography.Text type="secondary">
            Выберите запросы во вкладке «Трафик» и нажмите «Повторить»
          </Typography.Text>
        </Layout.Content>
      ) : (
        <>
          <Tabs
            type="editable-card"
            hideAdd
            activeKey={effectiveActiveKey}
            onChange={(key) => dispatch(setActiveTabId(key))}
            onEdit={handleTabEdit}
            size="middle"
            items={tabItems}
            className={styles.tabsNav}
          />

          {activeEntry && activeEs && (
            <Splitter className={styles.splitter}>
              <Splitter.Panel defaultSize="50%" min="30%" max="70%" className={styles.requestPanel}>
                <EntryEditor
                  editState={activeEs}
                  onChange={(patch) => updateEditState(activeEntry.id, patch)}
                />
              </Splitter.Panel>
              <Splitter.Panel className={styles.responsePanel}>
                <ResponseViewer response={responses[activeEntry.id] ?? null} />
              </Splitter.Panel>
            </Splitter>
          )}

          <Layout.Footer className={styles.footer}>
            <Flex justify="flex-end">
              <Button type="primary" loading={activeEs?.isSending ?? false} onClick={handleSend}>
                Отправить
              </Button>
            </Flex>
          </Layout.Footer>
        </>
      )}
    </Layout>
  );
};
