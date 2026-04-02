import { ArrowLeftOutlined } from '@ant-design/icons';
import CodeMirror from '@uiw/react-codemirror';
import { Button, Flex, Input, InputNumber, Layout, Select, Space, Tabs, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { BODY_LANGUAGES, HTTP_METHOD_VALUES } from '@/shared/constants';
import { getExtensions } from '@/shared/helpers';
import { useEntriesChange } from '@/shared/hooks.ts';
import type { BodyLanguage, StoredEntry } from '@/types';

import { HeadersTable } from './headers-table';
import {
  buildRawText,
  buildRequestFirstLine,
  buildResponseFirstLine,
  detectBodyLanguage,
  parseRawText,
  parseRequestFirstLine,
  parseResponseFirstLine,
  prettifyBody,
} from './helpers';
import styles from './modify-request-page.module.css';

export const ModifyRequestPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const entry = (location.state as { entry: StoredEntry }).entry;

  const isResponse = entry.status === 'response_pending';

  const [url, setUrl] = useState(entry.url);
  const [method, setMethod] = useState(entry.method);
  const [responseStatus, setResponseStatus] = useState<number>(entry.responseStatus ?? 200);
  const [headers, setHeaders] = useState<Record<string, string>>(
    isResponse ? (entry.responseHeaders ?? {}) : (entry.requestHeaders ?? {}),
  );
  const [bodyLanguage, setBodyLanguage] = useState<BodyLanguage>(() => {
    const headers = isResponse ? (entry.responseHeaders ?? {}) : (entry.requestHeaders ?? {});
    const body = isResponse ? (entry.responseBody ?? '') : (entry.requestBody ?? '');
    return detectBodyLanguage(headers, body);
  });
  const [body, setBody] = useState(() => {
    const rawBody = isResponse ? (entry.responseBody ?? '') : (entry.requestBody ?? '');
    const headers = isResponse ? (entry.responseHeaders ?? {}) : (entry.requestHeaders ?? {});
    const lang = detectBodyLanguage(headers, rawBody);
    return prettifyBody(rawBody, lang);
  });
  const [activeTab, setActiveTab] = useState<'form' | 'text'>('form');
  const [rawText, setRawText] = useState(() => {
    const firstLine = isResponse
      ? buildResponseFirstLine(entry.responseStatus ?? 200)
      : buildRequestFirstLine(entry.method, entry.url);
    return buildRawText(
      firstLine,
      isResponse ? (entry.responseHeaders ?? {}) : (entry.requestHeaders ?? {}),
      isResponse ? entry.responseBody : entry.requestBody,
    );
  });

  const handleTabChange = (key: string) => {
    if (key === 'text') {
      const firstLine = isResponse
        ? buildResponseFirstLine(responseStatus)
        : buildRequestFirstLine(method, url);
      setRawText(buildRawText(firstLine, headers, body));
    } else {
      const { firstLine, headers: parsedHeaders, body: parsedBody } = parseRawText(rawText);
      if (isResponse) {
        setResponseStatus(parseResponseFirstLine(firstLine));
      } else {
        const { method: parsedMethod, url: parsedUrl } = parseRequestFirstLine(firstLine);
        setMethod(parsedMethod);
        setUrl(parsedUrl);
      }
      setHeaders(parsedHeaders);
      setBody(parsedBody);
    }
    setActiveTab(key as 'form' | 'text');
  };

  const handleSubmit = () => {
    if (activeTab === 'text') {
      const { firstLine, headers: parsedHeaders, body: parsedBody } = parseRawText(rawText);
      if (isResponse) {
        void chrome.runtime.sendMessage({
          type: 'APPLY_RESPONSE',
          entryId: entry.id,
          editedBody: parsedBody || undefined,
          editedResponseHeaders: parsedHeaders,
          editedResponseStatus: parseResponseFirstLine(firstLine),
        });
      } else {
        const { method: parsedMethod, url: parsedUrl } = parseRequestFirstLine(firstLine);
        void chrome.runtime.sendMessage({
          type: 'PROCEED',
          entry,
          editedUrl: parsedUrl,
          editedMethod: parsedMethod,
          editedHeaders: parsedHeaders,
          editedBody: parsedBody || undefined,
        });
      }
    } else if (isResponse) {
      void chrome.runtime.sendMessage({
        type: 'APPLY_RESPONSE',
        entryId: entry.id,
        editedBody: body || undefined,
        editedResponseHeaders: headers,
        editedResponseStatus: responseStatus,
      });
    } else {
      void chrome.runtime.sendMessage({
        type: 'PROCEED',
        entry,
        editedUrl: url,
        editedMethod: method,
        editedHeaders: headers,
        editedBody: body || undefined,
      });
    }
    void navigate('/traffic');
  };

  useEntriesChange(
    useCallback(
      (entries) => {
        if (!entries.some((e) => e.id === entry.id)) void navigate('/traffic');
      },
      [entry.id, navigate],
    ),
  );

  const handleCancel = () => void navigate('/traffic');

  const methodOptions = HTTP_METHOD_VALUES.map((m) => ({ value: m, label: m }));

  const fieldsTab = (
    <Flex vertical gap={16} className={styles.fieldsContent}>
      <Flex vertical gap={8}>
        <Typography.Title level={5} className={styles.sectionTitle}>
          Адрес
        </Typography.Title>
        {isResponse ? (
          <Flex gap={8} align="center">
            <Input
              value={url}
              disabled
              className={styles.urlInput}
              data-testid="modify-url-input"
            />
            <InputNumber
              className={styles.statusInput}
              value={responseStatus}
              onChange={(v) => setResponseStatus(v ?? 200)}
              min={100}
              max={599}
              data-testid="modify-status-input"
            />
          </Flex>
        ) : (
          <Space.Compact>
            <Select
              value={method}
              options={methodOptions}
              onChange={setMethod}
              popupMatchSelectWidth={false}
              data-testid="modify-method-select"
            />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              data-testid="modify-url-input"
            />
          </Space.Compact>
        )}
      </Flex>

      <Flex vertical gap={8}>
        <Typography.Title level={5} className={styles.sectionTitle}>
          Заголовки
        </Typography.Title>
        <HeadersTable headers={headers} onChange={setHeaders} />
      </Flex>

      <Flex vertical gap={8}>
        <Typography.Title level={5} className={styles.sectionTitle}>
          Тело
        </Typography.Title>
        <Flex gap={8} align="center">
          <Select
            className={styles.langSelect}
            value={bodyLanguage}
            options={BODY_LANGUAGES}
            onChange={(lang: BodyLanguage) => setBodyLanguage(lang)}
          />
        </Flex>
        <div className={styles.editorWrapper}>
          <CodeMirror
            value={body}
            extensions={getExtensions(bodyLanguage)}
            onChange={setBody}
            minHeight="120px"
            basicSetup={{ lineNumbers: true, foldGutter: false }}
          />
        </div>
      </Flex>
    </Flex>
  );

  const rawTab = (
    <Flex vertical gap={8}>
      <div className={styles.editorWrapper}>
        <CodeMirror
          value={rawText}
          onChange={setRawText}
          minHeight="400px"
          basicSetup={{ lineNumbers: true, foldGutter: false }}
        />
      </div>
    </Flex>
  );

  return (
    <Layout className={styles.page}>
      <Flex align="center" gap={8} className={styles.header}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={handleCancel}
          data-testid="modify-back-btn"
        />
        <Flex vertical gap={1} className={styles.headerText}>
          <span className={styles.headerTitle}>
            {isResponse ? 'Модификация ответа' : 'Модификация запроса'}
          </span>
          <span className={styles.headerSubtitle}>
            {entry.method} {entry.url}
          </span>
        </Flex>
      </Flex>
      <Layout.Content className={styles.content}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'form',
              label: <span data-testid="modify-tab-form">Форма</span>,
              children: fieldsTab,
            },
            {
              key: 'text',
              label: <span data-testid="modify-tab-text">Текст</span>,
              children: rawTab,
            },
          ]}
        />
      </Layout.Content>
      <Layout.Footer className={styles.footer}>
        <Flex justify="flex-end" gap={8}>
          <Button onClick={handleCancel} data-testid="modify-cancel-btn">
            Отменить
          </Button>
          <Button type="primary" onClick={handleSubmit} data-testid="modify-submit-btn">
            Отправить
          </Button>
        </Flex>
      </Layout.Footer>
    </Layout>
  );
};
