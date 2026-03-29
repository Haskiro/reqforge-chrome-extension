import { tryPrettify } from '@pages/modify-request-page/helpers';
import CodeMirror from '@uiw/react-codemirror';
import { Alert, Flex, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { getExtensions } from '@/shared/helpers';
import type { RepeatResponseState } from '@/store/repeatSlice';

import styles from './response-viewer.module.css';

type ResponseViewerProps = {
  response: RepeatResponseState | null;
};

type HeaderRow = { name: string; value: string };

const statusColor = (status: number): string => {
  if (status >= 500) return 'red';
  if (status >= 400) return 'orange';
  if (status >= 300) return 'blue';
  if (status >= 200) return 'green';
  return 'default';
};

const headerColumns: ColumnsType<HeaderRow> = [
  { title: 'Имя', dataIndex: 'name', key: 'name', width: '40%', ellipsis: true },
  { title: 'Значение', dataIndex: 'value', key: 'value', ellipsis: true },
];

export const ResponseViewer = ({ response }: ResponseViewerProps) => {
  if (response === null) {
    return (
      <Flex align="center" justify="center" className={styles.placeholder}>
        <Typography.Text type="secondary">
          Нажмите «Отправить» для выполнения запроса
        </Typography.Text>
      </Flex>
    );
  }

  if (response.error) {
    return (
      <div className={styles.errorWrapper}>
        <Alert type="error" title="Ошибка запроса" description={response.error} showIcon />
      </div>
    );
  }

  const headerRows: HeaderRow[] = Object.entries(response.headers).map(([name, value]) => ({
    name,
    value,
  }));

  const prettifiedBody = tryPrettify(response.body);
  const isJson = (() => {
    try {
      JSON.parse(response.body);
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <Flex vertical gap={16} className={styles.viewer}>
      <Flex align="center" gap={8}>
        <Tag color={statusColor(response.status)}>{response.status}</Tag>
      </Flex>

      <Flex vertical gap={8}>
        <Typography.Title level={5} className={styles.sectionTitle}>
          Заголовки
        </Typography.Title>
        <Table<HeaderRow>
          dataSource={headerRows}
          columns={headerColumns}
          rowKey="name"
          size="small"
          bordered
          pagination={false}
          scroll={{ y: 150 }}
        />
      </Flex>

      <Flex vertical gap={8}>
        <Typography.Title level={5} className={styles.sectionTitle}>
          Тело
        </Typography.Title>
        <div className={styles.editorWrapper}>
          <CodeMirror
            value={prettifiedBody}
            extensions={getExtensions(isJson ? 'json' : 'html')}
            editable={false}
            minHeight="120px"
            basicSetup={{ lineNumbers: true, foldGutter: false }}
          />
        </div>
      </Flex>
    </Flex>
  );
};
