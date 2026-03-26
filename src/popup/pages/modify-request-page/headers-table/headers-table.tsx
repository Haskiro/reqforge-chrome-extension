import { PlusOutlined } from '@ant-design/icons';
import type { InputRef, TableColumnsType } from 'antd';
import { Button, Input, Table } from 'antd';
import { useEffect, useRef } from 'react';

import styles from './headers-table.module.css';
import type { HeaderRow } from './helpers';
import { recordToRows, rowsToRecord } from './helpers';

export type HeadersTableProps = {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
};

export const HeadersTable = ({ headers, onChange }: HeadersTableProps) => {
  const rows = recordToRows(headers);
  const focusIndexRef = useRef<number | null>(null);
  const inputRefs = useRef<Record<number, InputRef | null>>({});

  useEffect(() => {
    if (focusIndexRef.current === null) return;
    const ref = inputRefs.current[focusIndexRef.current];
    ref?.focus();
    ref?.input?.scrollIntoView({ block: 'nearest' });
    focusIndexRef.current = null;
  }, [rows.length]);

  const handleNameChange = (index: number, name: string) => {
    onChange(rowsToRecord(rows.map((r, i) => (i === index ? { ...r, name } : r))));
  };

  const handleValueChange = (index: number, value: string) => {
    onChange(rowsToRecord(rows.map((r, i) => (i === index ? { ...r, value } : r))));
  };

  const handleDelete = (index: number) => {
    onChange(rowsToRecord(rows.filter((_, i) => i !== index)));
  };

  const handleAdd = () => {
    onChange(rowsToRecord([...rows, { name: '', value: '' }]));
    focusIndexRef.current = rows.length;
  };

  const columns: TableColumnsType<HeaderRow> = [
    {
      title: 'Ключ',
      dataIndex: 'name',
      render: (val: string, _, index) => (
        <Input
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          value={val}
          placeholder="Ключ"
          onChange={(e) => handleNameChange(index, e.target.value)}
        />
      ),
    },
    {
      title: 'Значение',
      dataIndex: 'value',
      render: (val: string, _, index) => (
        <Input.TextArea
          value={val}
          placeholder="Значение"
          rows={1}
          className={styles.valueTextarea}
          onChange={(e) => handleValueChange(index, e.target.value)}
        />
      ),
    },
    {
      key: 'actions',
      title: (
        <Button
          type="primary"
          shape="circle"
          size="small"
          icon={<PlusOutlined />}
          className={styles.addButton}
          onClick={handleAdd}
        />
      ),
      align: 'center',
      width: 80,
      render: (_, __, index) => (
        <Button type="link" size="small" onClick={() => handleDelete(index)}>
          Удалить
        </Button>
      ),
    },
  ];

  return (
    <Table<HeaderRow>
      dataSource={rows}
      columns={columns}
      rowKey={(_, index) => String(index ?? 0)}
      pagination={false}
      bordered={true}
      size="small"
    />
  );
};
