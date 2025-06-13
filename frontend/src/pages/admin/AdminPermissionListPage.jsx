import React, { useState } from "react";
import {
  Layout,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Space,
  Popover,
  message,
} from "antd";
import {
  PlusOutlined,
  FilterOutlined,
} from "@ant-design/icons";

import AdminSidebar from "../../components/layout/AdminSidebar";
import PageHeader from "../../components/common/PageHeader";
import EntrySelect from "../../components/common/EntrySelect";
import SearchBox from "../../components/common/SearchBox";
import PermissionTable from "../../components/admin/PermissionTable";
import PermissionFilterPopover from "../../components/admin/PermissionFilterPopover";
import {
  createPermission,
  updatePermission,
  deletePermission,
} from "../../services/permissionApi";

const { Content } = Layout;
const { Option } = Select;

export default function AdminPermissionListPage() {
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState({ name: "", api: "" });
  const [filters, setFilters] = useState({ module: "All", method: "All" });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  const [form] = Form.useForm();

  const [selectedPermission, setSelectedPermission] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleApplyFilter = (values) => {
    setFilters(values);
  };

  const handleEditPermission = (permission) => {
    setEditingPermission(permission);
    form.setFieldsValue({
      name: permission.name,
      api: permission.apiPath,
      method: permission.method,
      module: permission.module,
    });
    setIsModalOpen(true);
  };

  const handleSubmitPermission = async (values) => {
    try {
      const payload = {
        ...values,
        apiPath: values.api,
      };
      delete payload.api;

      if (editingPermission) {
        await updatePermission({
          ...payload,
          id: editingPermission.id,
        });
        message.success("Permission updated successfully!");
      } else {
        await createPermission(payload);
        message.success("Permission created successfully!");
      }

      setIsModalOpen(false);
      form.resetFields();
      setEditingPermission(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to create/update permission:", err);
      message.error("Failed to process permission");
    }
  };

  const handleDeletePermission = (permission) => {
    setSelectedPermission(permission);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPermission) return;
    try {
      await deletePermission(selectedPermission.id);
      message.success("Permission deleted successfully!");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      message.error("Failed to delete permission");
    }
    setIsDeleteModalOpen(false);
    setSelectedPermission(null);
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
            <PageHeader title="🔐 Permission Management" />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                setEditingPermission(null);
                setIsModalOpen(true);
              }}
            >
              Add Permission
            </Button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 24,
              marginTop: 30,
            }}
          >
            <EntrySelect value={pageSize} onChange={setPageSize} />

            <Space direction="horizontal" style={{ gap: 30 }}>
              <div>
                <label style={{ fontSize: 13 }}>Name</label>
                <SearchBox
                  placeholder="Enter name..."
                  onSearch={(val) =>
                    setSearch((prev) => ({ ...prev, name: val }))
                  }
                />
              </div>
              <div>
                <label style={{ fontSize: 13 }}>API</label>
                <SearchBox
                  placeholder="Enter API..."
                  onSearch={(val) =>
                    setSearch((prev) => ({ ...prev, api: val }))
                  }
                />
              </div>
              <Popover
                open={isFilterOpen}
                onOpenChange={setIsFilterOpen}
                content={
                  <PermissionFilterPopover
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

          <PermissionTable
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            search={search}
            filters={filters}
            onEditPermission={handleEditPermission}
            onDeletePermission={handleDeletePermission}
            refreshKey={refreshKey}
          />

          {/* Modal Add/Edit */}
          <Modal
            title={editingPermission ? "Update Permission" : "Create Permission"}
            open={isModalOpen}
            onCancel={() => {
              setIsModalOpen(false);
              form.resetFields();
              setEditingPermission(null);
            }}
            footer={null}
            width={600}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmitPermission}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Permission Name"
                    rules={[{ required: true, message: "Enter permission name" }]}
                  >
                    <Input placeholder="Enter here..." />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="api"
                    label="API Path"
                    rules={[{ required: true, message: "Enter API path" }]}
                  >
                    <Input placeholder="Enter here..." />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="method"
                    label="Method"
                    rules={[{ required: true, message: "Select method" }]}
                  >
                    <Select placeholder="Select a method">
                      <Option value="GET">GET</Option>
                      <Option value="POST">POST</Option>
                      <Option value="PUT">PUT</Option>
                      <Option value="DELETE">DELETE</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="module"
                    label="Module"
                    rules={[{ required: true, message: "Select module" }]}
                  >
                    <Select placeholder="Select a module">
                    <Option value="All">All</Option>
                    <Option value="User">User</Option>
                    <Option value="Role">Role</Option>
                    <Option value="Notification">Notification</Option>
                    <Option value="Permission">Permission</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ textAlign: "right" }}>
                <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 8 }}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingPermission ? "Update" : "Create"}
                </Button>
              </div>
            </Form>
          </Modal>

          {/* Delete Confirmation */}
          <Modal
            title="Confirm delete this permission?"
            open={isDeleteModalOpen}
            onOk={handleConfirmDelete}
            onCancel={() => setIsDeleteModalOpen(false)}
            okText="Yes"
            cancelText="Cancel"
          />
        </Content>
      </Layout>
    </Layout>
  );
}
