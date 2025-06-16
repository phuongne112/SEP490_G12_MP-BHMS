import React, { useState } from "react";
import {
  Layout,
  Button,
  Modal,
  Form,
  Input,
  Row,
  Col,
  message,
  Popover,
  Space,
} from "antd";
import { PlusOutlined, FilterOutlined } from "@ant-design/icons";
import { Select } from "antd";
import AdminSidebar from "../../components/layout/AdminSidebar";
import PageHeader from "../../components/common/PageHeader";
import EntrySelect from "../../components/common/EntrySelect";
import SearchBox from "../../components/common/SearchBox";
import UserTable from "../../components/admin/UserTable";
import UserFilterPopover from "../../components/admin/UserFilterPopover";
import { createUser, updateUser } from "../../services/userApi";
import Access from "../../components/common/Access";

const { Content } = Layout;

export default function AdminUserListPage() {
  const [pageSize, setPageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ role: "none", dateRange: null });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updateUserId, setUpdateUserId] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateEmail, setUpdateEmail] = useState("");

  const [createForm] = Form.useForm();
  const [updateForm] = Form.useForm();

  const handleApplyFilter = (values) => {
    setFilters(values);
  };
  const handleEditUser = (user) => {
  setUpdateEmail(user.email);
  setUpdateUserId(user.id);

  updateForm.setFieldsValue({
    newEmail: user.email,
    username: user.username,
    roleId: user.role?.roleId ?? null, // ✅ đảm bảo lấy đúng roleId
  });

  setIsUpdateModalOpen(true);
};

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <AdminSidebar />
      <Layout style={{ marginLeft: 220 }}>
        <Content style={{ padding: "32px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <PageHeader title="List User Account" />
            <Access requiredPermissions={["Create User"]}>
              <Button type="primary" onClick={() => setIsCreateModalOpen(true)}>
                Add User
              </Button>
            </Access>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              flexWrap: "wrap",
              marginTop: 30,
            }}
          >
            <EntrySelect value={pageSize} onChange={setPageSize} />
            <Space style={{ gap: 100 }}>
              <SearchBox
                onSearch={setSearchTerm}
                placeholder="Search by email, username or role"
              />

              <Popover
                open={isFilterOpen}
                onOpenChange={setIsFilterOpen}
                content={
                  <UserFilterPopover
                    onApply={(values) => {
                      handleApplyFilter(values);
                      setIsFilterOpen(false);
                    }}
                  />
                }
                trigger="click"
                placement="bottomRight"
              >
                <Button
                  icon={<FilterOutlined />}
                  style={{ backgroundColor: "#40a9ff", color: "white" }}
                >
                  Filter
                </Button>
              </Popover>
            </Space>
          </div>

          <UserTable
            pageSize={pageSize}
            searchTerm={searchTerm}
            filters={filters}
            onEdit={(user) => handleEditUser(user)}
            refreshKey={refreshKey}
          />
          {/* Modal tạo user */}
          <Modal
  title="Update User Account"
  open={isUpdateModalOpen}
  onCancel={() => {
    setIsUpdateModalOpen(false);
    updateForm.resetFields();
  }}
  footer={null}
  width={700}
>
  <Form
    layout="vertical"
    form={updateForm}
    onFinish={async (values) => {
      try {
        const payload = {
          id: updateUserId,
          username: values.username,
          email: values.newEmail,
          role: {
            roleId: values.roleId, // ✅ đồng bộ với DTO backend
          },
        };

        await updateUser(payload);
        message.success("User updated successfully");
        setIsUpdateModalOpen(false);
        updateForm.resetFields();
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        const res = error.response?.data;

        if (res?.data && typeof res.data === "object") {
          const fieldErrors = Object.entries(res.data).map(
            ([field, message]) => ({
              name: field,
              errors: [message],
            })
          );
          updateForm.setFields(fieldErrors);
        } else {
          message.error("Failed to update user");
        }
      }
    }}
  >
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Old Email">
          <Input value={updateEmail} disabled />
        </Form.Item>
      </Col>

      <Col span={12}>
        <Form.Item
          name="newEmail"
          label="New Email"
          rules={[{ required: true, type: "email", message: "Enter a valid email" }]}
        >
          <Input />
        </Form.Item>
      </Col>

      <Col span={12}>
        <Form.Item
          name="username"
          label="Username"
          rules={[{ required: true, message: "Enter username" }]}
        >
          <Input />
        </Form.Item>
      </Col>

      <Col span={12}>
        <Form.Item
          name="roleId"
          label="Role"
          rules={[{ required: true, message: "Select role" }]}
        >
          <Select placeholder="Select Role">
            <Select.Option value={1}>ADMIN</Select.Option>
            <Select.Option value={2}>RENTER</Select.Option>
            <Select.Option value={3}>LANDLORD</Select.Option>
          </Select>
        </Form.Item>
      </Col>
    </Row>

    <Button type="primary" htmlType="submit" block>
      Update User
    </Button>
  </Form>
</Modal>

        </Content>
      </Layout>
    </Layout>
  );
}
