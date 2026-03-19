import { PlusOutlined } from '@ant-design/icons';
import { AutoComplete, Button, Form, Input, Select, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/store';
import {
  addGroup,
  addRule,
  DEFAULT_BACKGROUND_GROUP_ID,
  DEFAULT_GROUP_ID,
  RULE_TYPES,
  setSelectedRuleId,
  updateRule,
} from '@/store/rulesSlice';
import type { RuleDirection, RuleModification } from '@/types';

import styles from '../rules-page.module.css';
import type { RuleFormValues } from './constants';
import {
  BACKGROUND_DIRECTION_OPTIONS,
  HTTP_METHODS,
  INTERACTIVE_DIRECTION_OPTIONS,
} from './constants';
import { ModificationsModal } from './modifications-modal';

export const RuleForm = () => {
  const dispatch = useAppDispatch();
  const {
    rules,
    interactiveGroups,
    backgroundGroups,
    selectedRuleId,
    selectionVersion,
    activeMode,
  } = useAppSelector((s) => s.rules);
  const groups = activeMode === 'interactive' ? interactiveGroups : backgroundGroups;
  const [form] = Form.useForm<RuleFormValues>();
  const [modifications, setModifications] = useState<RuleModification[]>([]);
  const direction = Form.useWatch('direction', form) as RuleDirection | undefined;
  const [modsError, setModsError] = useState(false);
  const [modsModalOpen, setModsModalOpen] = useState(false);

  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? null;

  const [prevSelectionVersion, setPrevSelectionVersion] = useState(selectionVersion);
  if (selectionVersion !== prevSelectionVersion) {
    setPrevSelectionVersion(selectionVersion);
    setModifications(selectedRule?.modifications ?? []);
    setModsError(false);
    setModsModalOpen(false);
  }

  useEffect(() => {
    if (selectedRule) {
      const group = groups.find((g) => g.id === selectedRule.groupId);
      form.setFieldsValue({ ...selectedRule, groupName: group?.name ?? '' });
    } else {
      form.resetFields();
      form.setFieldsValue({ direction: activeMode === 'interactive' ? 'ANY' : 'REQUEST' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionVersion]);

  const resolveGroup = (groupName: string, gs: typeof groups): { id: string; isNew: boolean } => {
    const trimmedName = groupName?.trim();
    const existing = gs.find((g) => g.name === trimmedName);
    if (existing) return { id: existing.id, isNew: false };
    if (trimmedName) return { id: crypto.randomUUID(), isNew: true };
    return {
      id: activeMode === 'interactive' ? DEFAULT_GROUP_ID : DEFAULT_BACKGROUND_GROUP_ID,
      isNew: false,
    };
  };

  const handleSave = (values: RuleFormValues) => {
    if (activeMode === 'background' && modifications.length === 0) {
      setModsError(true);
      return;
    }

    const { id: groupId, isNew } = resolveGroup(values.groupName, groups);
    if (isNew) dispatch(addGroup({ id: groupId, name: values.groupName.trim() }));

    if (selectedRule) {
      dispatch(updateRule({ ...selectedRule, ...values, groupId, modifications }));
    } else {
      dispatch(addRule({ ...values, groupId, enabled: true, mode: activeMode, modifications }));
    }
    dispatch(setSelectedRuleId(null));
    form.resetFields();
    setModifications([]);
    setModsError(false);
    setModsModalOpen(false);
  };

  const handleClear = () => {
    form.resetFields();
    form.setFieldsValue({ direction: activeMode === 'interactive' ? 'ANY' : 'REQUEST' });
    setModifications([]);
    setModsError(false);
    setModsModalOpen(false);
  };

  const groupOptions = groups.map((g) => ({ value: g.name }));

  return (
    <div className={styles.rightPanel}>
      <div className={styles.formHeader}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {selectedRule ? 'Редактирование' : 'Создание'}
        </Typography.Title>
        <Button
          type="primary"
          shape="circle"
          icon={<PlusOutlined />}
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          onClick={() => {
            dispatch(setSelectedRuleId(null));
            form.resetFields();
            form.setFieldsValue({ direction: activeMode === 'interactive' ? 'ANY' : 'REQUEST' });
            setModifications([]);
            setModsError(false);
            setModsModalOpen(false);
          }}
        />
      </div>

      <Form form={form} layout="vertical" onFinish={handleSave} className={styles.form}>
        <Form.Item
          label="Группа"
          name="groupName"
          tooltip="Если группа не существует — она будет создана автоматически. Если оставить пустым — правило попадёт в группу по умолчанию"
        >
          <AutoComplete options={groupOptions} placeholder="Выберите или введите группу" />
        </Form.Item>

        <Form.Item
          label="Название"
          name="name"
          rules={[{ required: true, message: 'Введите название' }]}
        >
          <Input placeholder="Название правила" />
        </Form.Item>

        <Form.Item
          label="Метод"
          name="method"
          rules={[{ required: true, message: 'Выберите метод' }]}
        >
          <Select mode="multiple" placeholder="Выберите методы" options={HTTP_METHODS} />
        </Form.Item>

        <Form.Item
          label="Тип сравнения"
          name="ruleTypeId"
          rules={[{ required: true, message: 'Выберите тип' }]}
        >
          <Select
            placeholder="Тип сравнения"
            options={RULE_TYPES.map((rt) => ({ value: rt.id, label: rt.name }))}
          />
        </Form.Item>

        <Form.Item
          label="Значение"
          name="value"
          rules={[{ required: true, message: 'Введите значение' }]}
        >
          <Input placeholder="www.example.com/api" />
        </Form.Item>

        <Form.Item
          label="Направление"
          name="direction"
          rules={[{ required: true, message: 'Выберите направление' }]}
        >
          <Select
            options={
              activeMode === 'interactive'
                ? INTERACTIVE_DIRECTION_OPTIONS
                : BACKGROUND_DIRECTION_OPTIONS
            }
          />
        </Form.Item>

        {activeMode === 'background' && (
          <>
            {modsError && (
              <Typography.Text type="danger" style={{ display: 'block', marginBottom: 8 }}>
                Добавьте хотя бы одну модификацию
              </Typography.Text>
            )}
            <Form.Item label="Модификации">
              <Button onClick={() => setModsModalOpen(true)} danger={modsError}>
                {modifications.length === 0
                  ? 'Настроить модификации'
                  : `Модификации (${modifications.length})`}
              </Button>
            </Form.Item>
            <ModificationsModal
              open={modsModalOpen}
              value={modifications}
              direction={direction ?? 'REQUEST'}
              showErrors={modsError}
              onSave={(mods) => {
                setModifications(mods);
                setModsError(false);
                setModsModalOpen(false);
              }}
              onCancel={() => setModsModalOpen(false)}
            />
          </>
        )}

        <div className={styles.formFooter}>
          <Button type="primary" htmlType="submit">
            Сохранить
          </Button>
          <Button onClick={handleClear}>Очистить</Button>
        </div>
      </Form>
    </div>
  );
};
