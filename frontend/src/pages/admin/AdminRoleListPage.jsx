import React, { useEffect, useState } from "react";
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
  Alert,
} from "antd";
import AdminSidebar from "../../components/layout/AdminSidebar";
import PageHeader from "../../components/common/PageHeader";
import EntrySelect from "../../components/common/EntrySelect";
import SearchBox from "../../components/common/SearchBox";
import RoleTable from "../../components/admin/RoleTable";
import RoleFilterPopover from "../../components/admin/RoleFilterPopover";
import { PlusOutlined, FilterOutlined } from "@ant-design/icons";
import {
  getAllPermissions,
  createRole,
  updateRole,
  deleteRole,
} from "../../services/roleApi";

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
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await getAllPermissions();
        const data = res.data?.result || [];
        const grouped = {};
        data.forEach((perm) => {
          const group = perm.module?.toUpperCase() || "OTHER";
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
        message.error("Failed to load permissions");
      }
    };
    fetchPermissions();
  }, []);

  const handleApplyFilter = (values) => {
    setFilters(values);
  };

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
  try {
    await deleteRole(selectedRole.id);
    message.success("Role deleted successfully"); // ✅ dòng này đã đúng
    setRefreshKey((prev) => prev + 1);
    setDeleteError(null);
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      "Failed to delete role due to constraint violation";
    setDeleteError(msg);
  } finally {
    setIsDeleteModalOpen(false);
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
        message.success("Role updated successfully");
      } else {
        await createRole(payload);
        message.success("Role created successfully");
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
        setFormError(res?.message || "Failed to save role");
      }
    }
  };

  return (
    <Layout>
      <AdminSidebar />
      <Layout style={{ marginLeft: 220 }}>
        <Content style={{ padding: 32, backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <PageHeader title="List Role" />
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>Add new role</Button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
            <EntrySelect value={pageSize} onChange={setPageSize} />
            <Space style={{ gap: 100 }}>
              <SearchBox onSearch={setSearchTerm} placeholder="Enter role name..." />
              <Popover
                open={isFilterOpen}
                onOpenChange={setIsFilterOpen}
                content={<RoleFilterPopover onApply={(values) => { handleApplyFilter(values); setIsFilterOpen(false); }} />}
                trigger="click"
                placement="bottomRight"
              >
                <Button icon={<FilterOutlined />} style={{ backgroundColor: "#40a9ff", color: "white" }}>Filter</Button>
              </Popover>
            </Space>
          </div>

          {deleteError && (
            <Alert
              message={deleteError}
              type="error"
              showIcon
              closable
              onClose={() => setDeleteError(null)}
              style={{ marginBottom: 16 }}
            />
          )}

          <RoleTable
            pageSize={pageSize}
            searchTerm={searchTerm}
            filters={filters}
            refreshKey={refreshKey}
            onEditRole={handleEditRole}
            onDeleteRole={(role) => { setSelectedRole(role); setIsDeleteModalOpen(true); }}
          />

          <Modal
            title={editingRole ? "Update Role" : "Add New Role"}
            open={isModalOpen}
            onCancel={() => { setIsModalOpen(false); setEditingRole(null); form.resetFields(); setFormError(null); }}
            footer={null}
            width={700}
            centered
          >
            <Form
              key={editingRole?.id || "new"}
              form={form}
              layout="vertical"
              onFinish={handleSubmitRole}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Role Name"
                    rules={[{ required: true, message: "Please enter role name" }]}
                  >
                    <Input allowClear />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Permissions">
                <Collapse defaultActiveKey={Object.keys(groupedPermissions)}>
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <Panel header={module} key={module}>
                      <Row gutter={[16, 16]}>
                        {perms.map((perm) => (
                          <Col span={12} key={perm.id}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #eee", padding: "8px 12px", borderRadius: 6 }}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span>{perm.name}</span>
                                <span>
                                  <Tag color={perm.method === "POST" ? "green" : perm.method === "PUT" ? "orange" : perm.method === "DELETE" ? "red" : "blue"}>{perm.method}</Tag>
                                  <span style={{ color: "#999" }}>{perm.apiPath || "N/A"}</span>
                                </span>
                              </div>
                              <Form.Item name={["permissions", perm.id]} valuePropName="checked" noStyle>
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

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 16, gap: 16 }}>
                <div style={{ color: formError ? "red" : "transparent", fontSize: 13, minHeight: 20, maxWidth: "75%", whiteSpace: "normal", flex: 1 }}>{formError || "\u00A0"}</div>
                <div style={{ whiteSpace: "nowrap" }}>
                  <Button onClick={() => { setIsModalOpen(false); setEditingRole(null); form.resetFields(); setFormError(null); }} style={{ marginRight: 8 }}>Cancel</Button>
                  <Button type="primary" htmlType="submit">{editingRole ? "Update" : "Save"}</Button>
                </div>
              </div>
            </Form>
          </Modal>

          <Modal
            title="Are you sure you want to delete this role?"
            open={isDeleteModalOpen}
            onOk={handleDeleteRole}
            onCancel={() => setIsDeleteModalOpen(false)}
            okText="Yes"
            cancelText="Cancel"
          />
        </Content>
      </Layout>
    </Layout>
  );
}
