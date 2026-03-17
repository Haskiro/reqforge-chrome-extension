import { PlusOutlined } from '@ant-design/icons';
import { AutoComplete, Button, Form, Input, Select, Typography } from 'antd';
import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../../../store';
import {
  addGroup,
  addRule,
  DEFAULT_GROUP_ID,
  RULE_TYPES,
  setSelectedRuleId,
  updateRule,
} from '../../../store/rulesSlice';
import styles from '../rules-page.module.css';

const HTTP_METHODS = [
  { value: 'ANY', label: 'Любой' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH', label: 'PATCH' },
];

type RuleFormValues = {
  groupName: string;
  name: string;
  method: string[];
  ruleTypeId: number;
  value: string;
};

export const RuleForm = () => {
  const dispatch = useAppDispatch();
  const { rules, groups, selectedRuleId, activeMode } = useAppSelector((s) => s.rules);
  const [form] = Form.useForm<RuleFormValues>();

  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? null;

  useEffect(() => {
    if (selectedRule) {
      const group = groups.find((g) => g.id === selectedRule.groupId);
      form.setFieldsValue({ ...selectedRule, groupName: group?.name ?? '' });
    } else {
      form.resetFields();
    }
  }, [selectedRuleId, selectedRule, form, groups]);

  const handleSave = (values: RuleFormValues) => {
    const trimmedName = values.groupName?.trim();
    const existingGroup = groups.find((g) => g.name === trimmedName);
    let groupId = existingGroup?.id;
    if (!groupId) {
      if (trimmedName) {
        groupId = crypto.randomUUID();
        dispatch(addGroup({ id: groupId, name: trimmedName }));
      } else {
        groupId = DEFAULT_GROUP_ID;
      }
    }

    if (selectedRule) {
      dispatch(updateRule({ ...selectedRule, ...values, groupId }));
    } else {
      dispatch(addRule({ ...values, groupId, enabled: true, mode: activeMode }));
    }
    dispatch(setSelectedRuleId(null));
    form.resetFields();
  };

  const handleClear = () => {
    if (selectedRule) {
      form.resetFields();
    } else {
      dispatch(setSelectedRuleId(null));
      form.resetFields();
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
