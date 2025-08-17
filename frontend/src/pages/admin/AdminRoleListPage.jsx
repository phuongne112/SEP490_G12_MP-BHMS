import React, { useEffect, useState, useCallback } from "react";
import {
  Layout,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Collapse,
  Row,
  Col,
  Tag,
  Space,
  Popover,
  message,
  Popconfirm,
  Select,
  Drawer,
} from "antd";
import AdminSidebar from "../../components/layout/AdminSidebar";
import PageHeader from "../../components/common/PageHeader";
import EntrySelect from "../../components/common/EntrySelect";
import SearchBox from "../../components/common/SearchBox";
import RoleTable from "../../components/admin/RoleTable";
import RoleFilterPopover from "../../components/admin/RoleFilterPopover";
import { PlusOutlined, FilterOutlined, MenuOutlined } from "@ant-design/icons";
import { useMediaQuery } from "react-responsive";
import {
  getAllPermissions,
  createRole,
  updateRole,
  deleteRole,
} from "../../services/roleApi";
import Access from "../../components/common/Access";
import { useDispatch } from "react-redux";
import { setUser } from "../../store/accountSlice";
import { getCurrentUser } from "../../services/authService";

const { Content } = Layout;
const { Panel } = Collapse;

export default function AdminRoleListPage() {
  const [pageSize, setPageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ status: "All", dateRange: null });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [groupedPermissions, setGroupedPermissions] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [form] = Form.useForm();
  const [formError, setFormError] = useState(null);
  const [total, setTotal] = useState(0);
  const dispatch = useDispatch();
  const [, forceUpdate] = useState({});

  // Responsive states
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await getAllPermissions();
        const data = res.data?.result || [];
        const grouped = {};
        data.forEach((perm) => {
          const group = perm.module?.toUpperCase() || "KHÁC";
          if (!grouped[group]) grouped[group] = [];
          grouped[group].push({
            id: perm.id,
            name: perm.name,
            method: perm.method,
            apiPath: perm.apiPath,
            module: perm.module,
          });
        });
        setGroupedPermissions(grouped);
      } catch (err) {
        message.error("Không thể tải danh sách quyền");
      }
    };
    fetchPermissions();
  }, []);

  const openAddModal = () => {
    setEditingRole(null);
    form.setFieldsValue({ name: "", permissions: {} });
    setIsModalOpen(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    const permissionsMap = {};
    role.permissionEntities?.forEach((p) => {
      permissionsMap[p.id] = true;
    });
    form.setFieldsValue({ name: role.roleName, permissions: permissionsMap });
    setIsModalOpen(true);
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    try {
      await deleteRole(selectedRole.id);
      message.success("Xoá vai trò thành công!");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      message.error("Không thể xoá vai trò do ràng buộc dữ liệu");
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedRole(null);
    }
  };

  const handleSubmitRole = async (values) => {
    try {
      setFormError(null);
      const payload = {
        roleName: values.name,
        permissionEntities: Object.entries(values.permissions || {})
          .filter(([_, isChecked]) => isChecked)
          .map(([id]) => ({ id: parseInt(id) })),
      };
      if (editingRole) {
        await updateRole({ id: editingRole.id, ...payload });
        message.success("Cập nhật vai trò thành công");

        const updatedUser = await getCurrentUser();
        dispatch(
          setUser({
            id: updatedUser.id,
            fullName: updatedUser.name,
            role: updatedUser.role,
            permissions:
              updatedUser.role?.permissionEntities?.map((p) => p.name) || [],
          })
        );
      } else {
        await createRole(payload);
        message.success("Tạo vai trò mới thành công");
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingRole(null);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      const res = error.response?.data;
      setFormError(null);
      if (res?.data && typeof res.data === "object") {
        const fieldMap = { roleName: "name" };
        const fieldErrors = Object.entries(res.data).map(([field, msg]) => ({
          name: fieldMap[field] || field,
          errors: [msg],
        }));
        form.setFields(fieldErrors);
      } else {
        setFormError(res?.message || "Không thể lưu vai trò");
      }
    }
  };

  const handleToggleGroup = (module, perms, checked) => {
    const values = form.getFieldValue("permissions") || {};
    const newValues = { ...values };
    perms.forEach((perm) => {
      newValues[perm.id] = checked;
    });
    form.setFieldsValue({ permissions: newValues });
    forceUpdate({});
  };

  const isGroupChecked = useCallback(
    (module, perms) => {
      const values = form.getFieldValue("permissions") || {};
      return perms.every((perm) => !!values[perm.id]);
    },
    [form]
  );

  return (
    <Layout>
      {!isMobile && <AdminSidebar />}
      <Layout style={{ marginLeft: isMobile ? 0 : 220 }}>
        <Content style={{ padding: isMobile ? "16px" : "24px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
          {/* Mobile Header */}
          {isMobile && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "#001529",
              color: "white",
              position: "sticky",
              top: 0,
              zIndex: 999,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              marginBottom: 16
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", color: 'white' }}>
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setMobileMenuOpen(true)}
                  style={{ fontSize: "16px", color: 'white' }}
                />
                <span style={{ fontSize: "18px", fontWeight: "bold", color: 'white' }}>Danh sách vai trò</span>
              </div>
            </div>
          )}

          {/* Mobile Sidebar Drawer */}
          {isMobile && (
            <Drawer
              title="Menu"
              placement="left"
              onClose={() => setMobileMenuOpen(false)}
              open={mobileMenuOpen}
              width={280}
            >
              <AdminSidebar isDrawer={true} onMenuClick={() => setMobileMenuOpen(false)} />
            </Drawer>
          )}
          {/* Header Section */}
          <div style={{ 
            background: "white", 
            padding: isMobile ? "16px" : "20px", 
            borderRadius: "8px", 
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)", 
            marginBottom: "20px" 
          }}>
            {!isMobile && (
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px"
              }}>
                <PageHeader title="Danh sách vai trò" style={{ margin: 0, padding: 0 }} />
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <SearchBox
                    onSearch={setSearchTerm}
                    placeholder="Tìm vai trò..."
                  />
                  <Popover
                    open={isFilterOpen}
                    onOpenChange={setIsFilterOpen}
                    content={
                      <RoleFilterPopover
                        onApply={(values) => {
                          setFilters(values);
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
                    >
                      Bộ lọc
                    </Button>
                  </Popover>
                  <Access requiredPermissions={["Create Role"]}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={openAddModal}
                    >
                      Thêm vai trò
                    </Button>
                  </Access>
                </div>
              </div>
            )}

            {/* Mobile Header Controls */}
            {isMobile && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <SearchBox
                    onSearch={setSearchTerm}
                    placeholder="Tìm vai trò..."
                    style={{ flex: 1 }}
                  />
                  <Popover
                    open={isFilterOpen}
                    onOpenChange={setIsFilterOpen}
                    content={
                      <RoleFilterPopover
                        onApply={(values) => {
                          setFilters(values);
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
                    >
                      Bộ lọc
                    </Button>
                  </Popover>
                </div>
                <Access requiredPermissions={["Create Role"]}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAddModal}
                    style={{ width: "100%" }}
                  >
                    Thêm vai trò
                  </Button>
                </Access>
              </div>
            )}
            
            {/* Status bar */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              borderTop: "1px solid #f0f0f0",
              paddingTop: "12px",
              fontSize: "14px",
              flexDirection: isMobile ? "column" : "row",
              gap: isMobile ? "8px" : "0"
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
                  Tổng: {total} vai trò
                </span>
              </div>
            </div>
          </div>

          {/* Main Table Section */}
          <div style={{ 
            background: "white", 
            borderRadius: "8px", 
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}>
            <RoleTable
              pageSize={pageSize}
              searchTerm={searchTerm}
              filters={filters}
              refreshKey={refreshKey}
              onEditRole={handleEditRole}
              onDeleteRole={(role) => {
                setSelectedRole(role);
                setIsDeleteModalOpen(true);
              }}
              onTotalChange={setTotal}
            />
          </div>

          <Modal
            title={editingRole ? "Chỉnh sửa vai trò" : "Thêm vai trò mới"}
            open={isModalOpen}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingRole(null);
              form.resetFields();
              setFormError(null);
            }}
            footer={null}
            width={isMobile ? "95%" : 700}
            centered
          >
            <Form
              key={editingRole?.id || "new"}
              form={form}
              layout="vertical"
              onFinish={handleSubmitRole}
              onValuesChange={() => forceUpdate({})}
            >
              <Row gutter={16}>
                <Col span={isMobile ? 24 : 12}>
                  <Form.Item
                    name="name"
                    label="Tên vai trò"
                    rules={[
                      { required: true, message: "Vui lòng nhập tên vai trò" },
                    ]}
                  >
                    <Input allowClear />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Quyền hạn">
                <Collapse defaultActiveKey={Object.keys(groupedPermissions)}>
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <Panel
                      header={
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <span>{module}</span>
                          <Switch
                            style={{ transform: "scale(1.15)", marginLeft: 16 }}
                            checked={isGroupChecked(module, perms)}
                            onChange={(checked) =>
                              handleToggleGroup(module, perms, checked)
                            }
                          />
                        </div>
                      }
                      key={module}
                    >
                      <Row gutter={[16, 16]}>
                        {perms.map((perm) => (
                          <Col span={isMobile ? 24 : 12} key={perm.id}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                border: "1px solid #eee",
                                padding: "8px 12px",
                                borderRadius: 6,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                }}
                              >
                                <span>{perm.name}</span>
                                <span>
                                  <Tag
                                    color={
                                      perm.method === "POST"
                                        ? "green"
                                        : perm.method === "PUT"
                                        ? "orange"
                                        : perm.method === "DELETE"
                                        ? "red"
                                        : "blue"
                                    }
                                  >
                                    {perm.method}
                                  </Tag>
                                  <span style={{ color: "#999" }}>
                                    {perm.apiPath || "N/A"}
                                  </span>
                                </span>
                              </div>
                              <Form.Item
                                name={["permissions", perm.id]}
                                valuePropName="checked"
                                noStyle
                              >
                                <Switch />
                              </Form.Item>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </Panel>
                  ))}
                </Collapse>
              </Form.Item>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginTop: 16,
                  gap: 16,
                  flexDirection: isMobile ? "column" : "row"
                }}
              >
                <div
                  style={{
                    color: formError ? "red" : "transparent",
                    fontSize: 13,
                    minHeight: 20,
                    maxWidth: isMobile ? "100%" : "75%",
                    whiteSpace: "normal",
                    flex: 1,
                  }}
                >
                  {formError || "\u00A0"}
                </div>
                <div style={{ 
                  whiteSpace: "nowrap",
                  display: "flex",
                  gap: "8px",
                  justifyContent: isMobile ? "flex-end" : "flex-start"
                }}>
                  <Button
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingRole(null);
                      form.resetFields();
                      setFormError(null);
                    }}
                    style={{ marginRight: 8 }}
                  >
                    Hủy
                  </Button>
                  {editingRole ? (
                    <Popconfirm
                      title="Bạn có chắc chắn muốn cập nhật vai trò này không?"
                      onConfirm={() => form.submit()}
                      okText="Có"
                      cancelText="Hủy"
                    >
                      <Button type="primary">Cập nhật</Button>
                    </Popconfirm>
                  ) : (
                    <Button type="primary" htmlType="submit">
                      Lưu
                    </Button>
                  )}
                </div>
              </div>
            </Form>
          </Modal>

          <Modal
            title="Bạn có chắc chắn muốn xoá vai trò này không?"
            open={isDeleteModalOpen}
            onOk={handleDeleteRole}
            onCancel={() => setIsDeleteModalOpen(false)}
            okText="Xoá"
            cancelText="Hủy"
          />
        </Content>
      </Layout>
    </Layout>
  );
}
