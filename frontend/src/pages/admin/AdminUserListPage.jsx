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
import {
  PlusOutlined,
  FilterOutlined
} from "@ant-design/icons";
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
  setUpdateEmail(user.email); // gán email cho ô Old Email
  setUpdateUserId(user.id);
  updateForm.setFieldsValue({
    newEmail: user.email,
    username: user.username,
    roleId: user.role?.roleId || null, // ✅ dùng optional chaining cho an toàn
  });
  setIsUpdateModalOpen(true); // mở modal
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
              <SearchBox onSearch={setSearchTerm} />
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
            title="Create User Account"
            open={isCreateModalOpen}
            onCancel={() => setIsCreateModalOpen(false)}
            footer={null}
            width={700}
          >
            <Form
              layout="vertical"
              form={createForm}
              onFinish={async (values) => {
                try {
                  const payload = {
                    ...values,
                    roleId: 4 // giả sử role Renter mặc định
                  };
                  await createUser(payload);
                  message.success("User created successfully");
                  setIsCreateModalOpen(false);
                  createForm.resetFields();
                  setRefreshKey((prev) => prev + 1);
                } catch (error) {
                  message.error("Failed to create user");
                }
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="username" label="Username">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="fullName" label="Full Name">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="Phone">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="password"
                    label="Password"
                    rules={[{ required: true }]}
                  >
                    <Input.Password />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="confirmPassword"
                    label="Re-enter Password"
                    dependencies={["password"]}
                    rules={[
                      { required: true },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          return value === getFieldValue("password")
                            ? Promise.resolve()
                            : Promise.reject(
                                new Error("Passwords do not match")
                              );
                        },
                      }),
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" block>
                Create User
              </Button>
            </Form>
          </Modal>

         {/* Modal cập nhật user */}
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
          role: { roleId: values.roleId },
        };

        await updateUser(payload);
        message.success("User updated successfully");
        setIsUpdateModalOpen(false);
        updateForm.resetFields();
        setRefreshKey((prev) => prev + 1);
      } catch (err) {
        console.error("Update failed:", err);
        message.error("Failed to update user");
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
          rules={[{ required: true, type: "email" }]}
        >
          <Input />
        </Form.Item>
      </Col>

      <Col span={12}>
        <Form.Item
          name="username"
          label="Username"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
      </Col>

      <Col span={12}>
        <Form.Item
          name="roleId"
          label="Role"
          rules={[{ required: true }]}
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
