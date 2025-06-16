import React, { useState, useEffect } from "react";
import {
  Layout,
  Button,
  Space,
  Popover,
  Modal,
  Form,
  Input,
  Row,
  Col,
  Select,
  DatePicker,
  Badge,
  message,
  Alert,
} from "antd";
import { FilterOutlined, PlusOutlined } from "@ant-design/icons";
import { FaBell } from "react-icons/fa";
import AdminSidebar from "../../components/layout/AdminSidebar";
import PageHeader from "../../components/common/PageHeader";
import NotificationTable from "../../components/admin/NotificationTable";
import SearchBox from "../../components/common/SearchBox";
import EntrySelect from "../../components/common/EntrySelect";
import NotificationFilterPopover from "../../components/admin/NotificationFilterPopover";
import Access from "../../components/common/Access";
import {
  sendNotification,
  deleteNotification,
} from "../../services/notificationApi";
import { getAllUsers } from "../../services/userApi";
import { getCurrentUser } from "../../services/authService";
import { useDispatch } from "react-redux";
import { setUser } from "../../store/accountSlice";
import { useSelector } from "react-redux";

const { Content } = Layout;
const { Option } = Select;

export default function AdminNotificationPage() {
  const [pageSize, setPageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: "All",
    status: "All",
    dateRange: null,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [createForm] = Form.useForm();
  const [refreshKey, setRefreshKey] = useState(0);
  const [sendMode, setSendMode] = useState("role");
  const [userList, setUserList] = useState([]);
  const [deleteMessage, setDeleteMessage] = useState(null); // ✅ Thông báo thành công
  const [deleteError, setDeleteError] = useState(null); // ✅ Thông báo lỗi
  const currentUserId = parseInt(localStorage.getItem("userId"));
  const dispatch = useDispatch();
  const user = useSelector((state) => state.account.user);

  useEffect(() => {
    const fetchUser = async () => {
      try {
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
      } catch (err) {
        console.error("Failed to refresh user permissions:", err);
      }
    };

    fetchUser();
  }, []);
  useEffect(() => {
    if (isCreateModalOpen) {
      getAllUsers(0, 1000)
        .then((res) => {
          const allUsers = res.result || [];
          const filtered = allUsers.filter((u) => u.id !== currentUserId); // ✅ bỏ chính mình
          setUserList(filtered);
          console.log("✅ Filtered userList:", filtered);
          console.log("❌ Current admin userId:", currentUserId);
        })
        .catch(() => {
          message.error("Failed to load user list");
        });
    }
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (deleteMessage) {
      const timer = setTimeout(() => setDeleteMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteMessage]);

  useEffect(() => {
    if (deleteError) {
      const timer = setTimeout(() => setDeleteError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteError]);

  const handleApplyFilter = (values) => {
    setFilters({
      type: values.type || "All",
      status: values.status || "All",
      dateRange: values.dateRange || null,
    });
  };

  const handleView = (record) => {
    setSelectedNotification(record);
    setIsViewModalOpen(true);
  };

  const handleDelete = (record) => {
    setSelectedNotification(record);
    setIsDeleteModalOpen(true);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <AdminSidebar key={user?.permissions?.join(",")} />
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
            <PageHeader title="List Notification" />
            <Space style={{ gap: 20 }}>
              <Badge count={3} offset={[-2, 2]} size="small">
                <FaBell
                  size={20}
                  style={{ color: "#555", cursor: "pointer" }}
                  title="New notifications"
                />
              </Badge>
              <Access requiredPermissions={["Create Notification Send"]}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Add New
                </Button>
              </Access>
            </Space>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <EntrySelect value={pageSize} onChange={setPageSize} />
            <Space style={{ gap: 100 }}>
              <SearchBox onSearch={setSearchTerm} />
              <Popover
                open={isFilterOpen}
                onOpenChange={setIsFilterOpen}
                content={
                  <NotificationFilterPopover
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

          {/* ✅ Alert xóa thành công / thất bại */}
          {deleteMessage && (
            <Alert
              message={deleteMessage}
              type="info"
              showIcon
              closable
              onClose={() => setDeleteMessage(null)}
              style={{ marginBottom: 16 }}
            />
          )}
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

          <NotificationTable
            pageSize={pageSize}
            searchTerm={searchTerm}
            filters={filters}
            onView={handleView}
            onDelete={handleDelete}
            refreshKey={refreshKey}
            userList={userList}
          />

          {/* Create Notification Modal */}
          <Modal
            title="Create Notification"
            open={isCreateModalOpen}
            onCancel={() => {
              setIsCreateModalOpen(false);
              createForm.resetFields();
              setSendMode("role");
            }}
            footer={null}
            width={600}
          >
            <Form
              layout="vertical"
              form={createForm}
              initialValues={{ mode: "role" }}
              onFinish={async (values) => {
                try {
                  const payloadBase = {
                    title: values.label,
                    message: values.label,
                    type: values.type,
                    // sendDate: values.date.format("YYYY-MM-DD"),
                    metadata: null,
                  };

                  if (values.mode === "individual") {
                    const payload = {
                      ...payloadBase,
                      recipientId: values.recipientId,
                    };
                    await sendNotification(payload);
                  } else {
                    const promises = userList.map((user) => {
                      const payload = {
                        ...payloadBase,
                        recipientId: user.id,
                      };
                      return sendNotification(payload);
                    });
                    await Promise.all(promises);
                  }

                  message.success("Notification(s) sent successfully!");
                  setIsCreateModalOpen(false);
                  createForm.resetFields();
                  setSendMode("role");
                  setRefreshKey((prev) => prev + 1);
                } catch (err) {
                  console.error("Send notification failed:", err);
                  message.error("Failed to send notification");
                }
              }}
            >
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="mode"
                    label="Send Mode"
                    rules={[{ required: true }]}
                  >
                    <Select
                      onChange={(value) => {
                        setSendMode(value);
                        createForm.setFieldsValue({ recipientId: undefined });
                      }}
                    >
                      <Option value="role">To Role (All Users)</Option>
                      <Option value="individual">To Individual</Option>
                    </Select>
                  </Form.Item>
                </Col>

                {sendMode === "individual" && (
                  <Col span={24}>
                    <Form.Item
                      name="recipientId"
                      label="Send to User"
                      rules={[{ required: true }]}
                    >
                      <Select placeholder="Select a user">
                        {userList.map((user) => (
                          <Option key={user.id} value={user.id}>
                            {user.fullName || user.email}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                )}

                {/* <Col span={12}>
                  <Form.Item
                    name="date"
                    label="Send date"
                    rules={[{ required: true }]}
                  >
                    <DatePicker style={{ width: "100%" }} />
                  </Form.Item>
                </Col> */}

                <Col span={24}>
                  <Form.Item
                    name="type"
                    label="Type notification"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Select a type">
                      <Option value="RENT_REMINDER">Rent Reminder</Option>
                      <Option value="MAINTENANCE">Maintenance</Option>
                      <Option value="BOOKING_STATUS">Booking Status</Option>
                      <Option value="ANNOUNCEMENT">Announcement</Option>
                      <Option value="PAYMENT_SUCCESS">Payment Success</Option>
                      <Option value="PAYMENT_FAILED">Payment Failed</Option>
                      <Option value="CUSTOM">Custom</Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Form.Item
                    name="label"
                    label="Label"
                    rules={[{ required: true }]}
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="Enter notification content"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Button type="primary" htmlType="submit" block>
                Create and send
              </Button>
            </Form>
          </Modal>

          {/* View Notification Detail Modal */}
          <Modal
            title="🔔 Notification Detail"
            open={isViewModalOpen}
            onCancel={() => setIsViewModalOpen(false)}
            footer={[
              <Button key="close" onClick={() => setIsViewModalOpen(false)}>
                Done
              </Button>,
            ]}
          >
            {selectedNotification && (
              <div>
                <p>
                  <strong>Title:</strong> {selectedNotification.title}
                </p>
                <p>
                  <strong>Message:</strong> {selectedNotification.message}
                </p>
                <p>
                  <strong>Type:</strong> {selectedNotification.type}
                </p>
                <p>
                  <strong>Status:</strong> {selectedNotification.status}
                </p>
                <p>
                  <strong>Created Date:</strong>{" "}
                  {selectedNotification.createdAt}
                </p>
              </div>
            )}
          </Modal>

          {/* Confirm Delete Notification */}
          <Modal
            title="Are you sure you want to delete this notification?"
            open={isDeleteModalOpen}
            onOk={async () => {
              try {
                await deleteNotification(selectedNotification.id);
                setDeleteMessage("✅ Notification deleted successfully");
                setDeleteError(null);
                setRefreshKey((prev) => prev + 1);
              } catch (error) {
                console.error("Delete failed:", error);
                setDeleteError("❌ Failed to delete notification");
                setDeleteMessage(null);
              } finally {
                setIsDeleteModalOpen(false);
                setSelectedNotification(null);
              }
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
