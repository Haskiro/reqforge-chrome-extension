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
import { ModificationsModal } from './modifications-modal';

const HTTP_METHODS = [
  { value: 'ANY', label: 'Любой' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH', label: 'PATCH' },
];

const DIRECTION_OPTIONS_STOPPING: { value: RuleDirection; label: string }[] = [
  { value: 'ANY', label: 'Любое' },
  { value: 'REQUEST', label: 'Запрос' },
  { value: 'RESPONSE', label: 'Ответ' },
];

const DIRECTION_OPTIONS_BACKGROUND: { value: Exclude<RuleDirection, 'ANY'>; label: string }[] = [
  { value: 'REQUEST', label: 'Запрос' },
  { value: 'RESPONSE', label: 'Ответ' },
];

type RuleFormValues = {
  groupName: string;
  name: string;
  method: string[];
  ruleTypeId: number;
  value: string;
  direction: RuleDirection;
};

export const RuleForm = () => {
  const dispatch = useAppDispatch();
  const { rules, interactiveGroups, backgroundGroups, selectedRuleId, activeMode } = useAppSelector(
    (s) => s.rules,
  );
  const groups = activeMode === 'interactive' ? interactiveGroups : backgroundGroups;
  const [form] = Form.useForm<RuleFormValues>();
  const [modifications, setModifications] = useState<RuleModification[]>([]);
  const direction = Form.useWatch('direction', form) as RuleDirection | undefined;
  const [modsError, setModsError] = useState(false);
  const [modsModalOpen, setModsModalOpen] = useState(false);

  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? null;

  const [prevSelectedRuleId, setPrevSelectedRuleId] = useState(selectedRuleId);
  if (selectedRuleId !== prevSelectedRuleId) {
    setPrevSelectedRuleId(selectedRuleId);
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
  }, [selectedRuleId, selectedRule, form, groups, activeMode]);

  const handleSave = (values: RuleFormValues) => {
    if (activeMode === 'background' && modifications.length === 0) {
      setModsError(true);
      return;
    }

    const trimmedName = values.groupName?.trim();
    const existingGroup = groups.find((g) => g.name === trimmedName);
    let groupId = existingGroup?.id;
    if (!groupId) {
      if (trimmedName) {
        groupId = crypto.randomUUID();
        dispatch(addGroup({ id: groupId, name: trimmedName }));
      } else {
        groupId = activeMode === 'interactive' ? DEFAULT_GROUP_ID : DEFAULT_BACKGROUND_GROUP_ID;
      }
    }

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
    if (!selectedRule) {
      dispatch(setSelectedRuleId(null));
    }
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
                ? DIRECTION_OPTIONS_STOPPING
                : DIRECTION_OPTIONS_BACKGROUND
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
