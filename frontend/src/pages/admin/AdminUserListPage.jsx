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
  Select,
  Popconfirm,
} from "antd";
import { FilterOutlined } from "@ant-design/icons";
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
  const [updateEmail, setUpdateEmail] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const [createForm] = Form.useForm();
  const [updateForm] = Form.useForm();

  const handleApplyFilter = (values) => setFilters(values);

  const handleEditUser = (user) => {
    setUpdateEmail(user.email);
    setUpdateUserId(user.id);
    updateForm.setFieldsValue({
      newEmail: user.email,
      username: user.username,
      roleId: user.role?.roleId ?? null,
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
              marginBottom: 24,
            }}
          >
            <PageHeader title="Danh sách người dùng" />
            <Access requiredPermissions={["Create User"]}>
              <Button type="primary" onClick={() => setIsCreateModalOpen(true)}>
                Thêm người dùng
              </Button>
            </Access>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 24,
              flexWrap: "wrap",
              marginTop: 30,
            }}
          >
            <EntrySelect value={pageSize} onChange={setPageSize} />
            <Space style={{ gap: 100 }}>
              <SearchBox
                onSearch={setSearchTerm}
                placeholder="Tìm người dùng..."
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
                  Bộ lọc
                </Button>
              </Popover>
            </Space>
          </div>

          <UserTable
            pageSize={pageSize}
            searchTerm={searchTerm}
            filters={filters}
            onEdit={handleEditUser}
            refreshKey={refreshKey}
          />

          {/* Modal Tạo người dùng */}
          <Modal
            title="Tạo tài khoản người dùng"
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
                  const payload = { ...values, roleId: 4 };
                  await createUser(payload);
                  message.success("Tạo người dùng thành công!");
                  setIsCreateModalOpen(false);
                  createForm.resetFields();
                  setRefreshKey((prev) => prev + 1);
                } catch (error) {
                  const res = error.response?.data;
                  if (res?.data && typeof res.data === "object") {
                    const fieldMap = {
                      emailAddress: "email",
                      userName: "username",
                    };
                    const fieldErrors = Object.entries(res.data).map(
                      ([field, msg]) => ({
                        name: fieldMap[field] || field,
                        errors: [msg],
                      })
                    );
                    createForm.setFields(fieldErrors);
                  } else {
                    message.error(res?.message || "Không thể tạo người dùng.");
                  }
                }
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="username"
                    label="Tên đăng nhập"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập tên đăng nhập",
                      },
                      {
                        pattern: /^[^@\s]+$/,
                        message: "Tên đăng nhập không được là email.",
                      },
                    ]}
                  >
                    <Input maxLength={20} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="fullName"
                    label="Họ và tên"
                    rules={[
                      { required: true, message: "Vui lòng nhập họ và tên" },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      {
                        required: true,
                        type: "email",
                        message: "Email không hợp lệ",
                      },
                    ]}
                  >
                    <Input maxLength={50} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="phone"
                    label="Số điện thoại"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập số điện thoại",
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="password"
                    label="Mật khẩu"
                    rules={[
                      { required: true, message: "Vui lòng nhập mật khẩu" },
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="confirmPassword"
                    label="Nhập lại mật khẩu"
                    dependencies={["password"]}
                    rules={[
                      { required: true, message: "Vui lòng nhập lại mật khẩu" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          return value === getFieldValue("password")
                            ? Promise.resolve()
                            : Promise.reject(new Error("Mật khẩu không khớp"));
                        },
                      }),
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" block>
                Tạo người dùng
              </Button>
            </Form>
          </Modal>

          {/* Modal Cập nhật người dùng */}
          <Modal
            title="Cập nhật tài khoản người dùng"
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
                  message.success("Cập nhật người dùng thành công!");
                  setIsUpdateModalOpen(false);
                  updateForm.resetFields();
                  setRefreshKey((prev) => prev + 1);
                } catch (error) {
                  const res = error.response?.data;
                  if (res?.data && typeof res.data === "object") {
                    const fieldMap = {
                      email: "newEmail",
                      userName: "username",
                      role: "roleId",
                    };
                    const fieldErrors = Object.entries(res.data).map(
                      ([field, msg]) => ({
                        name: fieldMap[field] || field,
                        errors: [msg],
                      })
                    );
                    updateForm.setFields(fieldErrors);
                  } else {
                    message.error(
                      res?.message || "Không thể cập nhật người dùng."
                    );
                  }
                }
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Email hiện tại">
                    <Input value={updateEmail} disabled />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="newEmail"
                    label="Email mới"
                    rules={[
                      {
                        required: true,
                        type: "email",
                        message: "Email không hợp lệ",
                      },
                    ]}
                  >
                    <Input maxLength={50} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="username"
                    label="Tên đăng nhập"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập tên đăng nhập",
                      },
                    ]}
                  >
                    <Input maxLength={20} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="roleId"
                    label="Vai trò"
                    rules={[
                      { required: true, message: "Vui lòng chọn vai trò" },
                    ]}
                  >
                    <Select placeholder="Chọn vai trò">
                      <Select.Option value={2}>
                        Người thuê (RENTER)
                      </Select.Option>
                      <Select.Option value={3}>
                        Chủ trọ (LANDLORD)
                      </Select.Option>
                      <Select.Option value={4}>
                        Quản trị phụ (SUBADMIN)
                      </Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Popconfirm
                title="Bạn có chắc chắn muốn cập nhật người dùng này?"
                onConfirm={() => updateForm.submit()}
                okText="Đồng ý"
                cancelText="Huỷ"
              >
                <Button type="primary" block>
                  Cập nhật người dùng
                </Button>
              </Popconfirm>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
