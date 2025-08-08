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
  Drawer,
} from "antd";
import { FilterOutlined, MenuOutlined } from "@ant-design/icons";
import AdminSidebar from "../../components/layout/AdminSidebar";
import PageHeader from "../../components/common/PageHeader";
import EntrySelect from "../../components/common/EntrySelect";
import SearchBox from "../../components/common/SearchBox";
import UserTable from "../../components/admin/UserTable";
import UserFilterPopover from "../../components/admin/UserFilterPopover";
import { createUser, updateUser } from "../../services/userApi";
import Access from "../../components/common/Access";
import { useMediaQuery } from "react-responsive";

const { Content } = Layout;

export default function AdminUserListPage() {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [pageSize, setPageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ role: "none", dateRange: null });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updateUserId, setUpdateUserId] = useState(null);
  const [updateEmail, setUpdateEmail] = useState("");
  const [total, setTotal] = useState(0);

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
    <div style={{ width: '100%', minHeight: '100vh' }}>
      <style>
        {`
          @media (max-width: 768px) {
            .ant-layout-sider {
              display: none !important;
            }
          }
        `}
      </style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Desktop Sidebar - chỉ hiển thị trên desktop */}
        {!isMobile && (
          <div
            style={{
              width: 220,
              background: "#001529",
              position: "fixed",
              height: "100vh",
              zIndex: 1000,
            }}
          >
            <AdminSidebar />
          </div>
        )}

        {/* Main Layout */}
        <div style={{ 
          flex: 1, 
          marginLeft: isMobile ? 0 : 220,
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Mobile Header - chỉ hiển thị trên mobile */}
          {isMobile && (
            <div style={{ 
              background: '#001529', 
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 100,
              width: '100%'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                color: 'white'
              }}>
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setMobileMenuOpen(true)}
                  style={{ 
                    color: 'white',
                    fontSize: '16px'
                  }}
                />
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: 18,
                  color: 'white'
                }}>
                  MP-BHMS
                </div>
                <div style={{ 
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.8)'
                }}>
                  Xin chào Administrator
                </div>
              </div>
            </div>
          )}
          
          {/* Content Area */}
          <div style={{ 
            flex: 1, 
            padding: isMobile ? 12 : 16,
            backgroundColor: "#f5f5f5",
            minHeight: isMobile ? "calc(100vh - 60px)" : "100vh"
          }}>
            {/* Header Section */}
            <div style={{ 
              background: "white", 
              padding: isMobile ? "12px" : "16px", 
              borderRadius: "8px", 
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)", 
              marginBottom: isMobile ? "12px" : "16px" 
            }}>
              <div style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                alignItems: isMobile ? "stretch" : "center",
                marginBottom: "12px",
                gap: isMobile ? "12px" : 0
              }}>
                <PageHeader title="Danh sách người dùng" style={{ margin: 0, padding: 0 }} />
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px",
                  flexDirection: isMobile ? "column" : "row",
                  width: isMobile ? "100%" : "auto"
                }}>
                  <SearchBox
                    onSearch={setSearchTerm}
                    placeholder="Tìm người dùng..."
                    style={{ width: isMobile ? "100%" : "auto" }}
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
                      type="default"
                      style={{ width: isMobile ? "100%" : "auto" }}
                    >
                      Bộ lọc
                    </Button>
                  </Popover>
                  <Access requiredPermissions={["Create User"]}>
                    <Button 
                      type="primary" 
                      onClick={() => setIsCreateModalOpen(true)}
                      style={{ width: isMobile ? "100%" : "auto" }}
                    >
                      Thêm người dùng
                    </Button>
                  </Access>
                </div>
              </div>
              
              {/* Status bar */}
              <div style={{ 
                display: "flex", 
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between", 
                alignItems: isMobile ? "stretch" : "center",
                borderTop: "1px solid #f0f0f0",
                paddingTop: "8px",
                fontSize: "14px",
                gap: isMobile ? "8px" : 0
              }}>
                <div style={{ color: "#666" }}>
                  Hiển thị
                  <Select
                    style={{ width: isMobile ? "100%" : 120, margin: "0 8px" }}
                    value={pageSize}
                    onChange={(value) => setPageSize(value)}
                    options={[5, 10, 20, 50].map((v) => ({ value: v, label: `${v} / trang` }))}
                  />
                  mục
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <span style={{ fontWeight: 500, color: "#1890ff" }}>
                    Tổng: {total} người dùng
                  </span>
                </div>
              </div>
            </div>

            {/* Main Table Section */}
            <div style={{ 
              background: "white", 
              borderRadius: "8px", 
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              overflow: "hidden",
              maxHeight: "calc(100vh - 300px)"
            }}>
              <UserTable
                pageSize={pageSize}
                searchTerm={searchTerm}
                filters={filters}
                onEdit={handleEditUser}
                refreshKey={refreshKey}
                onTotalChange={setTotal}
              />
            </div>

            {/* Modal Tạo người dùng */}
            <Modal
              title="Tạo tài khoản người dùng"
              open={isCreateModalOpen}
              onCancel={() => setIsCreateModalOpen(false)}
              footer={null}
              width={isMobile ? "95%" : 700}
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
                <Row gutter={isMobile ? 0 : 16}>
                  <Col span={isMobile ? 24 : 12}>
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
                  <Col span={isMobile ? 24 : 12}>
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
                  <Col span={isMobile ? 24 : 12}>
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
                  <Col span={isMobile ? 24 : 12}>
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
                  <Col span={isMobile ? 24 : 12}>
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
                  <Col span={isMobile ? 24 : 12}>
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
              width={isMobile ? "95%" : 700}
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
                <Row gutter={isMobile ? 0 : 16}>
                  <Col span={isMobile ? 24 : 12}>
                    <Form.Item label="Email hiện tại">
                      <Input value={updateEmail} disabled />
                    </Form.Item>
                  </Col>
                  <Col span={isMobile ? 24 : 12}>
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
                  <Col span={isMobile ? 24 : 12}>
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
                  <Col span={isMobile ? 24 : 12}>
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
          </div>
        </div>
      </div>

      {/* Mobile Drawer cho Sidebar */}
      {isMobile && (
        <Drawer
          title="Menu"
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          width={280}
          bodyStyle={{ padding: 0 }}
        >
          <AdminSidebar isDrawer={true} onMenuClick={() => setMobileMenuOpen(false)} />
        </Drawer>
      )}
    </div>
  );
}
