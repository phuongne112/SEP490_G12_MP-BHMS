import React, { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  DatePicker,
  message,
  Spin,
  Select,
} from "antd";
import dayjs from "dayjs";
import {
  createPersonalInfo,
  getPersonalInfo,
  updatePersonalInfo,
} from "../../services/userApi";

export default function UpdateUserInfoModal({
  open,
  isCreate,
  onClose,
  onBackToInfoModal,
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    if (isCreate) {
      // Tạo mới => không gọi getPersonalInfo
      form.resetFields();
      setInitialLoading(false);
    } else {
      // Cập nhật => gọi API để fill form
      setInitialLoading(true);
      getPersonalInfo()
        .then((res) => {
          const data = res?.data || res;
          form.setFieldsValue({
            fullName: data.fullName || "",
            phoneNumber: data.phoneNumber || "",
            phoneNumber2: data.phoneNumber2 || "",
            gender: data.gender || "",
            birthDate: data.birthDate ? dayjs(data.birthDate) : null,
            birthPlace: data.birthPlace || "",
            nationalID: data.nationalID || "",
            nationalIDIssuePlace: data.nationalIDIssuePlace || "",
            permanentAddress: data.permanentAddress || "",
          });
        })
        .catch(() => message.error("Failed to load personal info"))
        .finally(() => setInitialLoading(false));
    }
  }, [open, isCreate]);

  const onFinish = async (values) => {
    const payload = {
      ...values,
      birthDate: values.birthDate ? values.birthDate.toISOString() : null,
    };

    try {
      setLoading(true);
      if (isCreate) {
        await createPersonalInfo(payload);
        message.success("Create successful");
      } else {
        await updatePersonalInfo(payload);
        message.success("Update successful");
      }
      onClose();
      onBackToInfoModal?.();
    } catch (err) {
      // 👇 Thêm xử lý này để hiển thị message từ backend
      if (err.response?.data?.error === "VALIDATION_ERROR") {
        const fieldErrors = err.response.data.data;
        form.setFields(
          Object.entries(fieldErrors).map(([field, message]) => ({
            name: field,
            errors: [message],
          }))
        );
      } else {
        message.error(isCreate ? "Create failed" : "Update failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Personal Information"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {initialLoading ? (
        <Spin />
      ) : (
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item
            name="fullName"
            label="Full Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="phoneNumber" label="Phone Number">
            <Input />
          </Form.Item>
          <Form.Item name="phoneNumber2" label="Secondary Phone">
            <Input />
          </Form.Item>
          <Form.Item name="gender" label="Gender">
            <Select placeholder="Select gender">
              <Select.Option value="Male">Male</Select.Option>
              <Select.Option value="Female">Female</Select.Option>
              <Select.Option value="Other">Other</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="birthDate" label="Birth Date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="birthPlace" label="Birth Place">
            <Input />
          </Form.Item>
          <Form.Item name="nationalID" label="National ID">
            <Input />
          </Form.Item>
          <Form.Item name="nationalIDIssuePlace" label="Issued Place">
            <Input />
          </Form.Item>
          <Form.Item name="permanentAddress" label="Permanent Address">
            <Input />
          </Form.Item>
          <Form.Item style={{ textAlign: "right" }}>
            <Button onClick={onClose} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isCreate ? "Create" : "Update"}
            </Button>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
