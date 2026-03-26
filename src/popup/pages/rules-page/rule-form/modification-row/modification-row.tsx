import { DeleteOutlined } from '@ant-design/icons';
import CodeMirror from '@uiw/react-codemirror';
import { Button, Flex, Input, Select } from 'antd';

import type { BodyLanguage, ModificationType, RuleModification } from '@/types';

import { BODY_LANGUAGES, FORMDATA_HINT, MODIFICATION_TYPES } from './constants';
import { getExtensions } from './helpers';
import styles from './modification-row.module.css';

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
  const isReplaceBody = modification.type === 'REPLACE_BODY';

  const handleTypeChange = (type: ModificationType) => {
    if (type === 'REPLACE_BODY') {
      onChange({ ...modification, type, name: null, value: '', bodyLanguage: 'json' });
    } else {
      onChange({
        ...modification,
        type,
        name: type === 'ADD_HEADER' ? (modification.name ?? '') : null,
        bodyLanguage: null,
        value: isReplaceBody ? '' : modification.value,
      });
    }
  };

  const nameEmpty =
    showErrors && modification.type === 'ADD_HEADER' && !(modification.name ?? '').trim();
  const valueEmpty = showErrors && !modification.value.trim();

  if (isReplaceBody) {
    return (
      <Flex vertical gap={8} className={styles.bodyEditor}>
        <Flex gap={8} align="center">
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
        </Flex>
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
      </Flex>
    );
  }

  return (
    <Flex gap={8} align="center" className={styles.row}>
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
    </Flex>
  );
};
