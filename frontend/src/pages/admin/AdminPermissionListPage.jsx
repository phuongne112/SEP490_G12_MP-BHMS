import React, { useState, useEffect } from "react";
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
  Alert,
} from "antd";
import { PlusOutlined, FilterOutlined } from "@ant-design/icons";

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
import { useSelector } from "react-redux";

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
  const [formError, setFormError] = useState(null);

  const [selectedPermission, setSelectedPermission] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState(null);

  const user = useSelector((state) => state.account.user);
  const hasCreatePermission = user?.permissions?.includes("Create Permission");

  const handleApplyFilter = (values) => {
    setFilters(values);
    setCurrentPage(1);
  };

  const handleEditPermission = (permission) => {
    setEditingPermission(permission);
    setFormError(null);
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
        message.success("Cập nhật quyền thành công!");
      } else {
        await createPermission(payload);
        message.success("Tạo quyền thành công!");
      }

      setIsModalOpen(false);
      form.resetFields();
      setEditingPermission(null);
      setFormError(null);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      const res = error.response?.data;
      setFormError(null);

      if (res?.data && typeof res.data === "object") {
        const fieldMap = {
          apiPath: "api",
          method: "method",
          module: "module",
        };

        const fieldErrors = [];
        Object.entries(res.data).forEach(([field, msg]) => {
          if (fieldMap[field]) {
            fieldErrors.push({
              name: fieldMap[field],
              errors: [msg],
            });
          } else {
            setFormError(msg);
          }
        });

        form.setFields(fieldErrors);
      } else {
        setFormError(res?.message || "Xử lý quyền thất bại");
      }
    }
  };

  const handleDeletePermission = (permission) => {
    setSelectedPermission(permission);
    setIsDeleteModalOpen(true);
    setDeleteMessage(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPermission) return;
    try {
      await deletePermission(selectedPermission.id);
      setDeleteMessage("✅ Xóa quyền thành công");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setDeleteMessage("❌ Xóa quyền thất bại");
    }
    setIsDeleteModalOpen(false);
    setSelectedPermission(null);
  };

  useEffect(() => {
    if (deleteMessage) {
      const timer = setTimeout(() => setDeleteMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteMessage]);

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
            <PageHeader title="Danh sách quyền" />
            {hasCreatePermission && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  form.resetFields();
                  setEditingPermission(null);
                  setFormError(null);
                  setIsModalOpen(true);
                }}
              >
                Thêm quyền
              </Button>
            )}
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
            <EntrySelect
              value={pageSize}
              onChange={(val) => {
                setPageSize(val);
                setCurrentPage(1);
              }}
            />
            <Space align="start" size={30}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: 13, marginBottom: 4 }}>Tên</label>
                <SearchBox
                  placeholder="Tìm quyền..."
                  onSearch={(val) => {
                    setSearch((prev) => ({ ...prev, name: val }));
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: 13, marginBottom: 4 }}>API</label>
                <SearchBox
                  placeholder="Nhập API..."
                  onSearch={(val) => {
                    setSearch((prev) => ({ ...prev, api: val }));
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div style={{ marginTop: 22 }}>
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
                    Bộ lọc
                  </Button>
                </Popover>
              </div>
            </Space>
          </div>

          {deleteMessage && (
            <Alert
              message={deleteMessage}
              type={deleteMessage.includes("✅") ? "info" : "error"}
              showIcon
              closable
              onClose={() => setDeleteMessage(null)}
              style={{ marginBottom: 16 }}
            />
          )}

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

          <Modal
            title={editingPermission ? "Cập nhật quyền" : "Tạo quyền mới"}
            open={isModalOpen}
            onCancel={() => {
              setIsModalOpen(false);
              form.resetFields();
              setEditingPermission(null);
              setFormError(null);
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
                    label="Tên quyền"
                    rules={[{ required: true, message: "Nhập tên quyền" }]}
                  >
                    <Input placeholder="Nhập tại đây..." />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="api"
                    label="Đường dẫn API"
                    rules={[{ required: true, message: "Nhập API path" }]}
                  >
                    <Input placeholder="Nhập tại đây..." />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="method"
                    label="Phương thức"
                    rules={[{ required: true, message: "Chọn phương thức" }]}
                  >
                    <Select placeholder="Chọn phương thức">
                      <Option value="GET">GET</Option>
                      <Option value="POST">POST</Option>
                      <Option value="PUT">PUT</Option>
                      <Option value="DELETE">DELETE</Option>
                      <Option value="PATCH">PATCH</Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="module"
                    label="Module"
                    rules={[{ required: true, message: "Chọn module" }]}
                  >
                    <Select placeholder="Chọn module">
                      <Option value="User">User</Option>
                      <Option value="Renter">Renter</Option>
                      <Option value="Room">Room</Option>
                      <Option value="Notification">Notification</Option>
                      <Option value="Role">Role</Option>
                      <Option value="Permission">Permission</Option>
                      <Option value="Bill">Bill</Option>
                      <Option value="Service">Service</Option>
                      <Option value="Contract">Contract</Option>
                      <Option value="Ocr">OCR</Option>
                      <Option value="Payment">Payment</Option>
                      <Option value="Schedule">Schedule</Option>
                      <Option value="RoomUser">RoomUser</Option>
                      <Option value="Asset">Asset</Option>
                      <Option value="ElectricReading">ElectricReading</Option>
                      <Option value="AssetInventory">AssetInventory</Option>
                      <Option value="ContractTemplate">ContractTemplate</Option>
                      <Option value="RoomAsset">RoomAsset</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginTop: 16,
                  gap: 16,
                }}
              >
                <div
                  style={{
                    color: formError ? "red" : "transparent",
                    fontSize: 13,
                    minHeight: 20,
                    maxWidth: "75%",
                    whiteSpace: "normal",
                    flex: 1,
                  }}
                >
                  {formError || "\u00A0"}
                </div>
                <div style={{ whiteSpace: "nowrap" }}>
                  <Button
                    onClick={() => setIsModalOpen(false)}
                    style={{ marginRight: 8 }}
                  >
                    Hủy
                  </Button>
                  <Button type="primary" htmlType="submit">
                    {editingPermission ? "Cập nhật" : "Thêm"}
                  </Button>
                </div>
              </div>
            </Form>
          </Modal>

          <Modal
            title="Bạn có chắc chắn muốn xoá quyền này?"
            open={isDeleteModalOpen}
            onOk={handleConfirmDelete}
            onCancel={() => setIsDeleteModalOpen(false)}
            okText="Xoá"
            cancelText="Hủy"
          />
        </Content>
      </Layout>
    </Layout>
  );
}
