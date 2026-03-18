import { DeleteOutlined } from '@ant-design/icons';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import CodeMirror from '@uiw/react-codemirror';
import { Button, Input, Select } from 'antd';

import type { BodyLanguage, ModificationType, RuleModification } from '@/types';

import styles from './modification-row.module.css';

const MODIFICATION_TYPES: { value: ModificationType; label: string }[] = [
  { value: 'ADD_HEADER', label: 'Добавить заголовок' },
  { value: 'REPLACE_BODY', label: 'Заменить тело' },
  { value: 'REPLACE_URL', label: 'Заменить URL' },
  { value: 'REPLACE_STATUS', label: 'Заменить статус' },
];

const BODY_LANGUAGES: { value: BodyLanguage; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'html', label: 'HTML' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'formdata', label: 'Form Data' },
];

const FORMDATA_HINT =
  'Формат: key1=value1&key2=value2. Спецсимволы необходимо кодировать вручную (%20 — пробел, %40 — @, и т.д.)';

const getExtensions = (lang: BodyLanguage) => {
  switch (lang) {
    case 'json':
      return [json()];
    case 'xml':
      return [xml()];
    case 'html':
      return [html()];
    case 'javascript':
      return [javascript()];
    case 'formdata':
      return [];
  }
};

export type ModificationRowProps = {
  modification: RuleModification;
  showErrors: boolean;
  onChange: (updated: RuleModification) => void;
  onDelete: () => void;
};

export const ModificationRow = ({
  modification,
  showErrors,
  onChange,
  onDelete,
}: ModificationRowProps) => {
  const handleTypeChange = (type: ModificationType) => {
    if (type === 'REPLACE_BODY') {
      onChange({ ...modification, type, name: null, value: '', bodyLanguage: 'json' });
    } else {
      onChange({
        ...modification,
        type,
        name: type === 'ADD_HEADER' ? (modification.name ?? '') : null,
        bodyLanguage: null,
        value: modification.type === 'REPLACE_BODY' ? '' : modification.value,
      });
    }
  };

  const nameEmpty =
    showErrors && modification.type === 'ADD_HEADER' && !(modification.name ?? '').trim();
  const valueEmpty = showErrors && !modification.value.trim();

  if (modification.type === 'REPLACE_BODY') {
    return (
      <div className={styles.bodyEditor}>
        <div className={styles.bodyToolbar}>
          <Select
            className={styles.typeSelect}
            value={modification.type}
            options={MODIFICATION_TYPES}
            onChange={handleTypeChange}
          />
          <Select
            className={styles.langSelect}
            value={modification.bodyLanguage ?? 'json'}
            options={BODY_LANGUAGES}
            onChange={(lang: BodyLanguage) =>
              onChange({ ...modification, bodyLanguage: lang, value: '' })
            }
          />
          <Button danger icon={<DeleteOutlined />} onClick={onDelete} />
        </div>
        {modification.bodyLanguage === 'formdata' && (
          <div className={styles.formdataHint}>{FORMDATA_HINT}</div>
        )}
        <div className={valueEmpty ? styles.editorWrapperError : styles.editorWrapper}>
          <CodeMirror
            value={modification.value}
            extensions={getExtensions(modification.bodyLanguage ?? 'json')}
            onChange={(val) => onChange({ ...modification, value: val })}
            minHeight="120px"
            basicSetup={{ lineNumbers: true, foldGutter: false }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.row}>
      <Select
        className={styles.typeSelect}
        value={modification.type}
        options={MODIFICATION_TYPES}
        onChange={handleTypeChange}
      />
      {modification.type === 'ADD_HEADER' && (
        <Input
          className={styles.nameInput}
          placeholder="Имя заголовка"
          status={nameEmpty ? 'error' : undefined}
          value={modification.name ?? ''}
          onChange={(e) => onChange({ ...modification, name: e.target.value })}
        />
      )}
      <Input
        className={styles.valueInput}
        placeholder="Значение"
        status={valueEmpty ? 'error' : undefined}
        value={modification.value}
        onChange={(e) => onChange({ ...modification, value: e.target.value })}
      />
      <Button danger icon={<DeleteOutlined />} onClick={onDelete} />
    </div>
  );
};
