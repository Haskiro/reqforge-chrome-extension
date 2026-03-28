import { DownOutlined, EllipsisOutlined } from '@ant-design/icons';
import { AppBar } from '@components/app-bar';
import { Button, Dropdown, Flex, Input, Layout, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SortOrder } from 'antd/es/table/interface';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useEntriesChange } from '@/shared/hooks';
import { useAppDispatch, useAppSelector } from '@/store';
import { addRepeatEntries } from '@/store/repeatSlice';
import { selectTrafficEntries } from '@/store/selectors';
import { loadTrafficFromStorage, setTrafficEntries } from '@/store/trafficSlice';
import type { StoredEntry } from '@/types';

import { DIRECTION_FILTERS, formatTimestamp, METHOD_FILTERS } from './constants';
import styles from './traffic-page.module.css';

export const TrafficPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const entries = useAppSelector(selectTrafficEntries);

  const [searchValue, setSearchValue] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('descend');

  useEffect(() => {
    void dispatch(loadTrafficFromStorage());
  }, [dispatch]);

  useEntriesChange(useCallback((entries) => dispatch(setTrafficEntries(entries)), [dispatch]));

  const filteredEntries = useMemo(
    () =>
      searchValue
        ? entries.filter((e) => e.url.toLowerCase().includes(searchValue.toLowerCase()))
        : entries,
    [entries, searchValue],
  );

  const rowActions = (entry: StoredEntry) => {
    const isPending = entry.status === 'pending';
    const isResponsePending = entry.status === 'response_pending';
    return {
      items: [
        {
          key: 'proceed',
          label: 'Пропустить',
          disabled: !isPending && !isResponsePending,
          onClick: () => {
            if (isResponsePending) {
              void chrome.runtime.sendMessage({ type: 'APPLY_RESPONSE', entryId: entry.id });
            } else if (isPending) {
              void chrome.runtime.sendMessage({ type: 'PROCEED', entry });
            }
          },
        },
        {
          key: 'reject',
          label: 'Отклонить',
          disabled: !isPending && !isResponsePending,
          onClick: () => {
            if (isPending || isResponsePending) {
              void chrome.runtime.sendMessage({ type: 'REJECT', entryId: entry.id });
            }
          },
        },
        {
          key: 'modify',
          label: 'Модифицировать',
          disabled: !isPending && !isResponsePending,
          onClick: () => void navigate('/modify-request', { state: { entry } }),
        },
        {
          key: 'repeat',
          label: 'Повторить',
          disabled: isResponsePending,
          onClick: () => {
            dispatch(addRepeatEntries([entry]));
            void navigate('/repeat');
          },
        },
      ],
    };
  };

  const handleProceedSelected = () => {
    const selected = entries.filter((e) => selectedRowKeys.includes(e.id));
    const toRequest = selected.filter((e) => e.status === 'pending');
    const toResponse = selected.filter((e) => e.status === 'response_pending').map((e) => e.id);
    if (toRequest.length > 0) {
      void chrome.runtime.sendMessage({ type: 'PROCEED_MANY', entries: toRequest });
    }
    if (toResponse.length > 0) {
      void chrome.runtime.sendMessage({ type: 'APPLY_RESPONSE_MANY', entryIds: toResponse });
    }
    setSelectedRowKeys([]);
  };

  const handleRejectSelected = () => {
    const selected = entries.filter((e) => selectedRowKeys.includes(e.id));
    const entryIds = selected
      .filter((e) => e.status === 'pending' || e.status === 'response_pending')
      .map((e) => e.id);
    if (entryIds.length > 0) {
      void chrome.runtime.sendMessage({ type: 'REJECT_MANY', entryIds });
    }
    setSelectedRowKeys([]);
  };

  const handleModifySelected = () => {
    const entry = entries.find((e) => e.id === selectedRowKeys[0]);
    if (entry) void navigate('/modify-request', { state: { entry } });
  };

  const handleRepeatSelected = () => {
    const selected = entries.filter((e) => selectedRowKeys.includes(e.id));
    if (selected.length > 0) {
      dispatch(addRepeatEntries(selected));
      void navigate('/repeat');
    }
  };

  const moreActions = {
    items: [
      {
        key: 'modify',
        label: 'Модифицировать',
        disabled: selectedRowKeys.length !== 1,
        onClick: handleModifySelected,
      },
      {
        key: 'repeat-all',
        label: 'Повторить',
        disabled: selectedRowKeys.length === 0,
        onClick: handleRepeatSelected,
      },
    ],
  };

  const columns: ColumnsType<StoredEntry> = [
    {
      title: 'Время',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (ts: number) => formatTimestamp(ts),
      sorter: (a, b) => a.timestamp - b.timestamp,
      sortOrder,
      onHeaderCell: () => ({
        onClick: () => setSortOrder((prev) => (prev === 'ascend' ? 'descend' : 'ascend')),
      }),
    },
    {
      title: 'Направление',
      dataIndex: 'status',
      key: 'direction',
      width: 130,
      render: (_: unknown, record: StoredEntry) =>
        record.responseStatus !== undefined ? 'Ответ' : 'Запрос',
      filters: DIRECTION_FILTERS,
      onFilter: (value, record) => {
        const dir = record.responseStatus !== undefined ? 'response' : 'request';
        return dir === value;
      },
    },
    {
      title: 'Метод',
      dataIndex: 'method',
      key: 'method',
      width: 90,
      filters: METHOD_FILTERS,
      onFilter: (value, record) => record.method === value,
    },
    {
      title: 'Статус',
      dataIndex: 'responseStatus',
      key: 'responseStatus',
      width: 80,
      render: (status: number | undefined) => status ?? '',
    },
    {
      title: 'Адрес',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
    },
    {
      title: '',
      key: 'actions',
      width: 40,
      fixed: 'end',
      render: (_: unknown, record: StoredEntry) => (
        <Dropdown menu={rowActions(record)} trigger={['click']}>
          <Button icon={<EllipsisOutlined />} type="text" size="small" />
        </Dropdown>
      ),
    },
  ];

  return (
    <Layout className={styles.page}>
      <AppBar active="traffic" />

      <Flex gap={8} align="center" className={styles.toolbar}>
        <Input.Search
          className={styles.toolbarSearch}
          placeholder="Адрес"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onSearch={(v) => setSearchValue(v)}
          allowClear={true}
          enterButton={true}
          size="large"
        />
        <Space className={styles.toolbarActions}>
          <Button
            variant="text"
            color="primary"
            size="small"
            disabled={selectedRowKeys.length === 0}
            onClick={handleProceedSelected}
          >
            Пропустить
          </Button>
          <Button
            variant="text"
            color="primary"
            size="small"
            disabled={selectedRowKeys.length === 0}
            onClick={handleRejectSelected}
          >
            Отклонить
          </Button>
          <Dropdown menu={moreActions} disabled={selectedRowKeys.length === 0}>
            <Button>
              Ещё <DownOutlined />
            </Button>
          </Dropdown>
        </Space>
      </Flex>

      <Layout.Content className={styles.content}>
        <Table<StoredEntry>
          size="small"
          rowKey="id"
          dataSource={filteredEntries}
          columns={columns}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
          }}
          scroll={{ x: true }}
          pagination={false}
          bordered={true}
          locale={{ emptyText: 'Нет перехваченных запросов' }}
        />
      </Layout.Content>
    </Layout>
  );
};
