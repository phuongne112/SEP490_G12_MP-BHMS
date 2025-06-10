import React, { useState } from "react";
import AdminSidebar from "../../components/layout/AdminSidebar";
import PageHeader from "../../components/common/PageHeader";
import EntrySelect from "../../components/common/EntrySelect";
import SearchBox from "../../components/common/SearchBox";
import RoleTable from "../../components/admin/RoleTable";
import RoleFilterPopover from "../../components/admin/RoleFilterPopover";
import {
  PlusOutlined,
  ReloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import {
  Layout,
  Button,
  Space,
  Popover,
  Modal,
  Form,
  Input,
  Switch,
  Row,
  Col,
  Collapse,
  Tag,
} from "antd";

const { Content } = Layout;
const { Panel } = Collapse;

const permissionsData = {
  USERS: [
    {
      key: "create_user",
      label: "Create User",
      method: "POST",
      endpoint: "/api/v1/users",
    },
    {
      key: "update_user",
      label: "Update User",
      method: "PUT",
      endpoint: "/api/v1/users",
    },
  ],
  RESUMES: [
    {
      key: "create_user",
      label: "Create User",
      method: "POST",
      endpoint: "/api/v1/users",
    },
    {
      key: "update_user",
      label: "Update User",
      method: "PUT",
      endpoint: "/api/v1/users",
    },
  ],
};

export default function AdminRoleListPage() {
  const [pageSize, setPageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ status: "All", dateRange: null });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [form] = Form.useForm();

  const handleApplyFilter = (values) => {
    setFilters(values);
  };

  const openAddModal = () => {
    setEditingRole(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
      status: role.status === "ACTIVE",
      permissions: role.permissions,
    });
    setIsModalOpen(true);
  };

  const handleDeleteRole = (role) => {
    setSelectedRole(role);
    setIsDeleteModalOpen(true);
  };

  const handleSubmitRole = (values) => {
    if (editingRole) {
      console.log("Updating role:", { id: editingRole.id, ...values });
      // Gọi API PUT
    } else {
      console.log("Creating new role:", values);
      // Gọi API POST
    }
    setIsModalOpen(false);
    setEditingRole(null);
    form.resetFields();
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
            onEditRole={handleEditRole}
            onDeleteRole={handleDeleteRole}
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
              form={form}
              layout="vertical"
              onFinish={handleSubmitRole}
              initialValues={{
                status: true,
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Role Name"
                    rules={[
                      { required: true, message: "Please enter role name" },
                    ]}
                  >
                    <Input />
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

              <Form.Item name="description" label="Description">
                <Input.TextArea rows={2} placeholder="Enter description..." />
              </Form.Item>

              <Form.Item label="Permissions">
                <Collapse defaultActiveKey={["USERS"]}>
                  {Object.entries(permissionsData).map(
                    ([group, permissions]) => (
                      <Panel header={group} key={group}>
                        <Row gutter={[16, 16]}>
                          {permissions.map((perm) => (
                            <Col span={12} key={perm.key}>
                              <Form.Item
                                name={["permissions", perm.key]}
                                valuePropName="checked"
                                noStyle
                              >
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
                                    <span>{perm.label}</span>
                                    <span>
                                      <Tag
                                        color={
                                          perm.method === "POST"
                                            ? "green"
                                            : "orange"
                                        }
                                      >
                                        {perm.method}
                                      </Tag>{" "}
                                      <span style={{ color: "#999" }}>
                                        {perm.endpoint}
                                      </span>
                                    </span>
                                  </div>
                                  <Switch />
                                </div>
                              </Form.Item>
                            </Col>
                          ))}
                        </Row>
                      </Panel>
                    )
                  )}
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
            onOk={() => {
              console.log("Deleting role:", selectedRole);
              setIsDeleteModalOpen(false);
            }}
            onCancel={() => setIsDeleteModalOpen(false)}
            okText="Yes"
            cancelText="Cancel"
          />
        </Content>
      </Layout>
    </Layout>
  );
}
