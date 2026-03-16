import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../../store';
import {
  addGroup,
  addRule,
  RULE_TYPES,
  setSelectedRuleId,
  updateRule,
} from '../../../store/rulesSlice';
import { AddGroupModal } from '../add-group-modal';
import styles from '../rules-page.module.css';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

type RuleFormValues = {
  groupId: string;
  name: string;
  method: string[];
  ruleTypeId: number;
  value: string;
};

export function RuleForm() {
  const dispatch = useAppDispatch();
  const { rules, groups, selectedRuleId, activeMode } = useAppSelector((s) => s.rules);
  const [form] = Form.useForm<RuleFormValues>();
  const [modalOpen, setModalOpen] = useState(false);

  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? null;

  useEffect(() => {
    if (selectedRule) {
      form.setFieldsValue(selectedRule);
    } else {
      form.resetFields();
    }
  }, [selectedRuleId, selectedRule, form]);

  function handleSave(values: RuleFormValues) {
    if (selectedRule) {
      dispatch(updateRule({ ...selectedRule, ...values }));
    } else {
      dispatch(addRule({ ...values, enabled: true, mode: activeMode }));
    }
    dispatch(setSelectedRuleId(null));
    form.resetFields();
  }

  function handleClear() {
    dispatch(setSelectedRuleId(null));
    form.resetFields();
  }

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
          onClick={() => setModalOpen(true)}
        />
      </div>

      <Form form={form} layout="vertical" onFinish={handleSave} className={styles.form}>
        <Form.Item label="Группа" name="groupId" initialValue="default">
          <Select>
            {groups.map((g) => (
              <Select.Option key={g.id} value={g.id}>
                {g.name}
              </Select.Option>
            ))}
          </Select>
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
          <Select mode="multiple" placeholder="Выберите методы">
            {HTTP_METHODS.map((m) => (
              <Select.Option key={m} value={m}>
                {m}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Тип сравнения"
          name="ruleTypeId"
          rules={[{ required: true, message: 'Выберите тип' }]}
        >
          <Select placeholder="Тип сравнения">
            {RULE_TYPES.map((rt) => (
              <Select.Option key={rt.id} value={rt.id}>
                {rt.name}
              </Select.Option>
            ))}
          </Select>
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

      <AddGroupModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(name) => dispatch(addGroup(name))}
      />
    </div>
  );
}
