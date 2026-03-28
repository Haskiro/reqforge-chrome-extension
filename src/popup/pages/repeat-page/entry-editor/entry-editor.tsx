import { HeadersTable } from '@pages/modify-request-page/headers-table';
import {
  buildRawText,
  buildRequestFirstLine,
  parseRawText,
  parseRequestFirstLine,
} from '@pages/modify-request-page/helpers';
import CodeMirror from '@uiw/react-codemirror';
import { Flex, Input, Select, Space, Tabs, Typography } from 'antd';

import { BODY_LANGUAGES, HTTP_METHOD_VALUES } from '@/shared/constants';
import { getExtensions } from '@/shared/helpers';
import type { BodyLanguage } from '@/types';

import type { EntryEditState } from '../helpers';
import styles from './entry-editor.module.css';

type EntryEditorProps = {
  editState: EntryEditState;
  onChange: (patch: Partial<EntryEditState>) => void;
};

export const EntryEditor = ({ editState, onChange }: EntryEditorProps) => {
  const { url, method, headers, body, bodyLanguage, activeTab, rawText } = editState;

  const handleTabChange = (key: string) => {
    if (key === 'text') {
      onChange({
        rawText: buildRawText(buildRequestFirstLine(method, url), headers, body),
        activeTab: 'text',
      });
    } else {
      const { firstLine, headers: parsedHeaders, body: parsedBody } = parseRawText(rawText);
      const { method: parsedMethod, url: parsedUrl } = parseRequestFirstLine(firstLine);
      onChange({
        method: parsedMethod,
        url: parsedUrl,
        headers: parsedHeaders,
        body: parsedBody,
        activeTab: 'form',
      });
    }
  };

  const methodOptions = HTTP_METHOD_VALUES.map((m) => ({ value: m, label: m }));

  const fieldsTab = (
    <Flex vertical gap={16}>
      <Flex vertical className={styles.section}>
        <Typography.Title level={5} className={styles.sectionTitle}>
          Адрес
        </Typography.Title>
        <Space.Compact>
          <Select
            value={method}
            options={methodOptions}
            onChange={(v) => onChange({ method: v })}
            popupMatchSelectWidth={false}
          />
          <Input value={url} onChange={(e) => onChange({ url: e.target.value })} />
        </Space.Compact>
      </Flex>

      <Flex vertical className={styles.section}>
        <Typography.Title level={5} className={styles.sectionTitle}>
          Заголовки
        </Typography.Title>
        <HeadersTable headers={headers} onChange={(h) => onChange({ headers: h })} />
      </Flex>

      <Flex vertical className={styles.section}>
        <Typography.Title level={5} className={styles.sectionTitle}>
          Тело
        </Typography.Title>
        <Flex gap={8} align="center">
          <Select
            className={styles.langSelect}
            value={bodyLanguage}
            options={BODY_LANGUAGES}
            onChange={(lang: BodyLanguage) => onChange({ bodyLanguage: lang })}
          />
        </Flex>
        <div className={styles.editorWrapper}>
          <CodeMirror
            value={body}
            extensions={getExtensions(bodyLanguage)}
            onChange={(v) => onChange({ body: v })}
            minHeight="120px"
            basicSetup={{ lineNumbers: true, foldGutter: false }}
          />
        </div>
      </Flex>
    </Flex>
  );

  const rawTab = (
    <Flex vertical className={styles.section}>
      <div className={styles.editorWrapper}>
        <CodeMirror
          value={rawText}
          onChange={(v) => onChange({ rawText: v })}
          minHeight="400px"
          basicSetup={{ lineNumbers: true, foldGutter: false }}
        />
      </div>
    </Flex>
  );

  return (
    <Tabs
      activeKey={activeTab}
      onChange={handleTabChange}
      items={[
        { key: 'form', label: 'Форма', children: fieldsTab },
        { key: 'text', label: 'Текст', children: rawTab },
      ]}
    />
  );
};
