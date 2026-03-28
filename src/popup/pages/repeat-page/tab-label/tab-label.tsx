import { EditOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';

import styles from './tab-label.module.css';

type TabLabelProps = {
  name: string;
  editing: boolean;
  onStartEdit: () => void;
  onFinishEdit: () => void;
  onRename: (newName: string) => void;
};

export const TabLabel = ({ name, editing, onStartEdit, onFinishEdit, onRename }: TabLabelProps) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    onFinishEdit();
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={styles.input}
        value={value}
        style={{ width: `${Math.max(value.length, 4)}ch` }}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') onFinishEdit();
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span className={styles.wrapper}>
      {name}
      <EditOutlined
        className={styles.editIcon}
        onClick={(e) => {
          e.stopPropagation();
          setValue(name);
          onStartEdit();
        }}
      />
    </span>
  );
};
