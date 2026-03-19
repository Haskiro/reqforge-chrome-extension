import { Form, Modal, Select, Typography } from 'antd';
import { useState } from 'react';

import type { Group } from '@/types';

export type DeleteGroupModalProps = {
  open: boolean;
  group: Group | null;
  otherGroups: Group[];
  rulesCount: number;
  onConfirm: (moveToGroupId?: string) => void;
  onCancel: () => void;
};

export const DeleteGroupModal = ({
  open,
  group,
  otherGroups,
  rulesCount,
  onConfirm,
  onCancel,
}: DeleteGroupModalProps) => {
  const [moveToGroupId, setMoveToGroupId] = useState<string | undefined>(undefined);

  const handleOk = () => {
    onConfirm(moveToGroupId);
    setMoveToGroupId(undefined);
  };

  const handleCancel = () => {
    setMoveToGroupId(undefined);
    onCancel();
  };

  return (
    <Modal
      title="Удалить группу"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Удалить"
      cancelText="Отмена"
      okButtonProps={{ danger: true }}
    >
      <Typography.Paragraph>
        Вы уверены, что хотите удалить группу <strong>{group?.name}</strong>?
      </Typography.Paragraph>
      {rulesCount > 0 && (
        <Form layout="vertical">
          <Form.Item
            label="Переместить правила в группу"
            extra="Если не выбрано — все правила группы будут удалены"
          >
            <Select
              allowClear
              placeholder="Выберите группу"
              value={moveToGroupId}
              onChange={setMoveToGroupId}
              options={otherGroups.map((g) => ({ value: g.id, label: g.name }))}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};
