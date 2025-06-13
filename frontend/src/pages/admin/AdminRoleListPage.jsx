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
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

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

  // 🆕 Load permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await getAllPermissions();
        const data = res.data?.result || [];
        console.log("✅ Data from API:", data);

        const grouped = {};
        data.forEach((perm) => {
          const group = perm.module?.toUpperCase() || "OTHER";
          if (!grouped[group]) grouped[group] = [];

          grouped[group].push({
            id: perm.id,
            name: perm.name, // ✅ tên gốc
            method: perm.method,
            apiPath: perm.apiPath,
            module: perm.module,
          });
        });

        setGroupedPermissions(grouped); // ✅ Lưu lại đầy đủ
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
    form.setFieldsValue({
      name: "",
      status: true,
      permissions: {},
    });
    setIsModalOpen(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    // map permissions thành object { id: true }
    const permissionsMap = {};
    role.permissionEntities?.forEach((p) => {
      permissionsMap[p.id] = true;
    });

    form.setFieldsValue({
      name: role.roleName,
      status: role.active,
      permissions: permissionsMap,
    });
    setIsModalOpen(true);
  };

  const handleDeleteRole = async () => {
    try {
      await deleteRole(selectedRole.roleId); // 🆕 gọi API xóa
      message.success("Role deleted successfully");
      setRefreshKey((prev) => prev + 1);
    } catch {
      message.error("Failed to delete role");
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  const handleSubmitRole = async (values) => {
    try {
      // Chuyển trạng thái và permission thành định dạng backend yêu cầu
      const payload = {
        roleName: values.name,
        active: values.status,
        permissionEntities: Object.entries(values.permissions || {})
          .filter(([_, isChecked]) => isChecked)
          .map(([id]) => ({ id: parseInt(id) })),
      };

      if (editingRole) {
        await updateRole({ roleId: editingRole.roleId, ...payload });
        message.success("Role updated successfully");
        setRefreshKey((prev) => prev + 1);
      } else {
        console.log("🟢 Payload gửi lên:", payload); // Thêm dòng này
        await createRole(payload);
        message.success("Role created successfully");
        setRefreshKey((prev) => prev + 1);
      }
    } catch (err) {
      message.error("Failed to save role");
    } finally {
      setIsModalOpen(false);
      setEditingRole(null);
      form.resetFields();
    }
  };

  return (
    <Layout>
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
            <PageHeader title="- List Role -" />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAddModal}
            >
              Add new role
            </Button>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            <EntrySelect value={pageSize} onChange={setPageSize} />
            <Space style={{ gap: 100 }}>
              <SearchBox
                onSearch={setSearchTerm}
                placeholder="Enter role name..."
              />
              <Popover
                open={isFilterOpen}
                onOpenChange={setIsFilterOpen}
                content={
                  <RoleFilterPopover
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
          />
          <Modal
            title={editingRole ? "Update Role" : "Add New Role"}
            open={isModalOpen}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingRole(null);
              form.resetFields();
            }}
            footer={null}
            width={700}
            centered
          >
            <Form
              key={editingRole?.roleId || "new"}
              form={form}
              layout="vertical"
              onFinish={(values) => {
                console.log("✅ Form submitted:", values);
                handleSubmitRole(values);
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Role Name"
                    rules={[
                      { required: true, message: "Please enter role name" },
                      {
                        validator: (_, value) =>
                          value && value.trim() !== ""
                            ? Promise.resolve()
                            : Promise.reject("Please enter role name"),
                      },
                    ]}
                  >
                    <Input allowClear />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="status"
                    label="Status"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren="ACTIVE"
                      unCheckedChildren="INACTIVE"
                    />
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
                                  </Tag>{" "}
                                  <span style={{ color: "#999" }}>
                                    {perm.apiPath || "N/A"}
                                  </span>
                                </span>
                              </div>

                              {/* ✅ Switch bọc TRỰC TIẾP trong Form.Item */}
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

              <div style={{ textAlign: "right" }}>
                <Button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingRole(null);
                    form.resetFields();
                  }}
                  style={{ marginRight: 8 }}
                >
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingRole ? "Update" : "Save"}
                </Button>
              </div>
            </Form>
          </Modal>

          <Modal
            title="Are you sure you want to delete this role?"
            open={isDeleteModalOpen}
            onOk={handleDeleteRole} // 🆕 dùng hàm API xóa
            onCancel={() => setIsDeleteModalOpen(false)}
            okText="Yes"
            cancelText="Cancel"
          />
        </Content>
      </Layout>
    </Layout>
  );
}
