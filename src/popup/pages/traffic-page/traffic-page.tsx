import { DownOutlined, EllipsisOutlined } from '@ant-design/icons';
import { AppBar } from '@components/app-bar';
import { Button, Dropdown, Input, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SortOrder } from 'antd/es/table/interface';
import { useEffect, useMemo, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/store';
import { loadTrafficFromStorage, setTrafficEntries } from '@/store/trafficSlice';
import type { StoredEntry } from '@/types';

import { DIRECTION_FILTERS, formatTimestamp, METHOD_FILTERS } from './constants';
import styles from './traffic-page.module.css';

export const TrafficPage = () => {
  const dispatch = useAppDispatch();
  const entries = useAppSelector((s) => s.traffic.entries);

  const [searchValue, setSearchValue] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('descend');

  useEffect(() => {
    void dispatch(loadTrafficFromStorage());

    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !changes.entries) return;
      dispatch(setTrafficEntries((changes.entries.newValue as StoredEntry[]) ?? []));
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [dispatch]);

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
        { key: 'repeat', label: 'Повторить', disabled: true },
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

  const moreActions = {
    items: [
      {
        key: 'modify',
        label: 'Модифицировать',
        disabled: selectedRowKeys.length !== 1,
      },
      { key: 'repeat-all', label: 'Повторить', disabled: true },
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
    <div className={styles.page}>
      <AppBar active="traffic" />

      <div className={styles.toolbar}>
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
        <div className={styles.toolbarActions}>
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
        </div>
      </div>

      <div className={styles.content}>
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
      </div>
    </div>
  );
};
