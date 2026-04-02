import { PlusOutlined } from '@ant-design/icons';
import { Alert, AutoComplete, Button, Flex, Form, Input, Select, Typography } from 'antd';
import { useEffect, useState } from 'react';

import {
  resolveGroupPayload,
  serverGroupToLocal,
  serverRuleToLocal,
  toModificationsPayload,
} from '@/services/rulesApiMapper';
import { useAppDispatch, useAppSelector } from '@/store';
import type { ServerRule } from '@/store/api';
import {
  useCreateBackgroundRuleMutation,
  useCreateStoppingRuleMutation,
  useUpdateBackgroundRuleMutation,
  useUpdateStoppingRuleMutation,
} from '@/store/api';
import {
  addGroup,
  addRule,
  DEFAULT_BACKGROUND_GROUP_ID,
  DEFAULT_GROUP_ID,
  RULE_TYPES,
  setSelectedRuleId,
  updateRule,
  upsertGroupFromServer,
  upsertRuleFromServer,
} from '@/store/rulesSlice';
import { selectAuth, selectRulesState } from '@/store/selectors';
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
  const { rules, interactiveGroups, backgroundGroups, selectedRuleId, activeMode } =
    useAppSelector(selectRulesState);
  const { mode: authMode } = useAppSelector(selectAuth);
  const groups = activeMode === 'interactive' ? interactiveGroups : backgroundGroups;
  const [form] = Form.useForm<RuleFormValues>();
  const [modifications, setModifications] = useState<RuleModification[]>([]);
  const direction = Form.useWatch('direction', form) as RuleDirection | undefined;
  const [modsError, setModsError] = useState(false);
  const [modsModalOpen, setModsModalOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [createStoppingRule] = useCreateStoppingRuleMutation();
  const [createBackgroundRule] = useCreateBackgroundRuleMutation();
  const [updateStoppingRule] = useUpdateStoppingRuleMutation();
  const [updateBackgroundRule] = useUpdateBackgroundRuleMutation();

  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? null;

  useEffect(() => {
    setModifications(selectedRule?.modifications ?? []);
    setModsError(false);
    setModsModalOpen(false);
    setApiError(null);
    if (selectedRule) {
      const group = groups.find((g) => g.id === selectedRule.groupId);
      form.setFieldsValue({ ...selectedRule, groupName: group?.name ?? '' });
    } else {
      form.resetFields();
      form.setFieldsValue({ direction: activeMode === 'interactive' ? 'ANY' : undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRuleId, activeMode]);

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

  const resetForm = () => {
    form.resetFields();
    form.setFieldsValue({ direction: activeMode === 'interactive' ? 'ANY' : undefined });
    setModifications([]);
    setModsError(false);
    setModsModalOpen(false);
    setApiError(null);
  };

  const handleSave = async (values: RuleFormValues) => {
    if (activeMode === 'background' && modifications.length === 0) {
      setModsError(true);
      return;
    }

    if (authMode === 'authenticated') {
      setIsSaving(true);
      const groupPayload = resolveGroupPayload(values.groupName, groups);
      const baseDto = {
        name: values.name,
        method: values.method,
        value: values.value,
        ruleTypeId: values.ruleTypeId,
        ...groupPayload,
      };
      try {
        let serverRule: ServerRule;
        if (selectedRule) {
          if (selectedRule.mode === 'background') {
            serverRule = await updateBackgroundRule({
              id: Number(selectedRule.id),
              ...baseDto,
              direction: values.direction as 'REQUEST' | 'RESPONSE',
              modifications: toModificationsPayload(modifications),
            }).unwrap();
          } else {
            serverRule = await updateStoppingRule({
              id: Number(selectedRule.id),
              ...baseDto,
              direction: values.direction,
            }).unwrap();
          }
        } else {
          if (activeMode === 'background') {
            serverRule = await createBackgroundRule({
              ...baseDto,
              direction: values.direction as 'REQUEST' | 'RESPONSE',
              modifications: toModificationsPayload(modifications),
            }).unwrap();
          } else {
            serverRule = await createStoppingRule({
              ...baseDto,
              direction: values.direction,
            }).unwrap();
          }
        }
        if (serverRule.group) {
          dispatch(
            upsertGroupFromServer({
              group: serverGroupToLocal(serverRule.group),
              variant: serverRule.group.variant,
            }),
          );
        }
        dispatch(upsertRuleFromServer(serverRuleToLocal(serverRule)));
        dispatch(setSelectedRuleId(null));
        resetForm();
      } catch {
        setApiError('Не удалось сохранить правило');
      } finally {
        setIsSaving(false);
      }
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
    resetForm();
  };

  const groupOptions = groups.map((g) => ({ value: g.name }));

  return (
    <div className={styles.rightPanel}>
      <Flex align="center" justify="space-between" className={styles.formHeader}>
        <Typography.Title level={5} style={{ margin: 0 }} data-testid="rule-form-title">
          {selectedRule ? 'Редактирование' : 'Создание'}
        </Typography.Title>
        <Button
          type="primary"
          shape="circle"
          icon={<PlusOutlined />}
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          onClick={() => {
            dispatch(setSelectedRuleId(null));
            resetForm();
          }}
          data-testid="rule-form-new"
        />
      </Flex>

      <div className={styles.formScrollArea}>
        <Form
          form={form}
          layout="vertical"
          onFinish={(v: RuleFormValues) => void handleSave(v)}
          className={styles.form}
        >
          {apiError && (
            <Alert type="error" title={apiError} style={{ marginBottom: 12 }} showIcon />
          )}
          <Form.Item
            label="Группа"
            name="groupName"
            tooltip="Если группа не существует — она будет создана автоматически. Если оставить пустым — правило попадёт в группу по умолчанию"
          >
            <AutoComplete
              options={groupOptions}
              placeholder="Выберите или введите группу"
              data-testid="rule-form-group"
            />
          </Form.Item>

          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Название правила" data-testid="rule-form-name" />
          </Form.Item>

          <Form.Item
            label="Метод"
            name="method"
            rules={[{ required: true, message: 'Выберите метод' }]}
          >
            <Select
              mode="multiple"
              placeholder="Выберите методы"
              options={HTTP_METHODS}
              data-testid="rule-form-method"
            />
          </Form.Item>

          <Form.Item
            label="Тип сравнения"
            name="ruleTypeId"
            rules={[{ required: true, message: 'Выберите тип' }]}
          >
            <Select
              placeholder="Тип сравнения"
              options={RULE_TYPES.map((rt) => ({ value: rt.id, label: rt.name }))}
              data-testid="rule-form-type"
            />
          </Form.Item>

          <Form.Item
            label="Значение"
            name="value"
            rules={[{ required: true, message: 'Введите значение' }]}
          >
            <Input placeholder="www.example.com/api" data-testid="rule-form-value" />
          </Form.Item>

          <Form.Item
            label="Направление"
            name="direction"
            rules={[{ required: true, message: 'Выберите направление' }]}
          >
            <Select
              placeholder="Направление"
              options={
                activeMode === 'interactive'
                  ? INTERACTIVE_DIRECTION_OPTIONS
                  : BACKGROUND_DIRECTION_OPTIONS
              }
              data-testid="rule-form-direction"
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
                <Button
                  onClick={() => setModsModalOpen(true)}
                  danger={modsError}
                  data-testid="rule-form-modifications-btn"
                >
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
        </Form>
      </div>

      <Flex gap={8} justify="flex-end" className={styles.formFooter}>
        <Button onClick={resetForm} disabled={isSaving} data-testid="rule-form-clear">
          Очистить
        </Button>
        <Button
          type="primary"
          onClick={() => form.submit()}
          loading={isSaving}
          data-testid="rule-form-save"
        >
          Сохранить
        </Button>
      </Flex>
    </div>
  );
};
