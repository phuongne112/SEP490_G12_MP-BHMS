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
  message,
  Alert,
} from "antd";
import { FilterOutlined, PlusOutlined } from "@ant-design/icons";
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

// Hàm chuyển đổi ngày sang định dạng Việt Nam chuẩn (dd/mm/yyyy)
const formatDateToVietnamese = (dateString) => {
  if (!dateString) return "";
  
  // Xử lý format "2025-07-28 16:11:04 PM" từ API
  let date;
  
  // Thử parse trực tiếp
  date = new Date(dateString);
  
  // Nếu không hợp lệ, thử xử lý format đặc biệt
  if (isNaN(date.getTime())) {
    // Tách phần ngày từ "2025-07-28 16:11:04 PM"
    const datePart = dateString.split(' ')[0];
    if (datePart) {
      date = new Date(datePart);
    }
  }
  
  // Kiểm tra xem ngày có hợp lệ không
  if (isNaN(date.getTime())) {
    return "";
  }
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Hàm dịch loại thông báo
const translateNotificationType = (type) => {
  const typeMap = {
    'ANNOUNCEMENT': 'Thông báo chung',
    'PAYMENT_SUCCESS': 'Thanh toán thành công',
    'PAYMENT_FAILED': 'Thanh toán thất bại',
    'CUSTOM': 'Tùy chỉnh'
  };
  return typeMap[type] || type;
};

// Hàm dịch trạng thái thông báo
const translateNotificationStatus = (status) => {
  const statusMap = {
    'SENT': 'Đã gửi',
    'DELIVERED': 'Đã gửi',
    'READ': 'Đã đọc',
    'UNREAD': 'Chưa đọc'
  };
  return statusMap[status] || status;
};

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
  const [total, setTotal] = useState(0);
  const user = useSelector((state) => state.account.user);
  let currentUserId = Number(localStorage.getItem("userId"));
  if (!currentUserId || isNaN(currentUserId)) {
    currentUserId = user?.id;
  }
  const dispatch = useDispatch();
  const [userListLoaded, setUserListLoaded] = useState(false);

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
    const fetchUsers = async () => {
      try {
        const res = await getAllUsers(0, 1000);
        const allUsers = res.result || [];
        const filtered = allUsers.filter((u) => Number(u.id) !== Number(currentUserId));
        setUserList(filtered);
        setUserListLoaded(true);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setUserList([]);
        setUserListLoaded(true);
      }
    };

    fetchUsers();
  }, [refreshKey]);

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
        <Content style={{ padding: "24px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
          {/* Header Section */}
          <div style={{ 
            background: "white", 
            padding: "20px", 
            borderRadius: "8px", 
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)", 
            marginBottom: "20px" 
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px"
            }}>
              <PageHeader title="Danh sách thông báo" style={{ margin: 0, padding: 0 }} />
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <SearchBox onSearch={setSearchTerm} placeholder="Tìm thông báo..." />
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
                    type="default"
                  >
                    Bộ lọc
                  </Button>
                </Popover>

                <Access requiredPermissions={["Create Notification Send"]}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Thêm thông báo
                  </Button>
                </Access>
              </div>
            </div>
            
            {/* Status bar */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              borderTop: "1px solid #f0f0f0",
              paddingTop: "12px",
              fontSize: "14px"
            }}>
              <div style={{ color: "#666" }}>
                Hiển thị
                <Select
                  style={{ width: 120, margin: "0 8px" }}
                  value={pageSize}
                  onChange={(value) => setPageSize(value)}
                  options={[5, 10, 20, 50].map((v) => ({ value: v, label: `${v} / trang` }))}
                />
                mục
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ fontWeight: 500, color: "#1890ff" }}>
                  Tổng: {total} thông báo
                </span>
              </div>
            </div>
          </div>

          {/* Main Table Section */}
          {userListLoaded && (
            <div style={{ 
              background: "white", 
              borderRadius: "8px", 
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              overflow: "hidden"
            }}>
              <NotificationTable
                pageSize={pageSize}
                searchTerm={searchTerm}
                filters={filters}
                onView={handleView}
                onDelete={handleDelete}
                refreshKey={refreshKey}
                userList={userList}
                onTotalChange={setTotal}
              />
            </div>
          )}

          {/* Create Notification Modal */}
          <Modal
            title="Tạo thông báo"
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
                    message: values.content,
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
                    const filteredUserList = userList.filter(user => Number(user.id) !== Number(currentUserId));
                    console.log("currentUserId:", currentUserId);
                    console.log("userList:", userList.map(u => u.id));
                    console.log("filteredUserList:", filteredUserList.map(u => u.id));
                    const promises = filteredUserList.map((user) => {
                      const payload = {
                        ...payloadBase,
                        recipientId: user.id,
                      };
                      console.log("Sending to:", user.id);
                      return sendNotification(payload);
                    });
                    await Promise.all(promises);
                  }

                  message.success("Thông báo đã được gửi thành công!");
                  setIsCreateModalOpen(false);
                  createForm.resetFields();
                  setSendMode("role");
                  setRefreshKey((prev) => prev + 1);
                } catch (err) {
                  console.error("Send notification failed:", err);
                  message.error("Gửi thông báo thất bại");
                }
              }}
            >
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="mode"
                    label="Chế độ gửi"
                    rules={[{ required: true }]}
                  >
                    <Select
                      onChange={(value) => {
                        setSendMode(value);
                        createForm.setFieldsValue({ recipientId: undefined });
                      }}
                    >
                      <Option value="role">Theo vai trò (Tất cả người dùng)</Option>
                      <Option value="individual">To Individual</Option>
                    </Select>
                  </Form.Item>
                </Col>

                {sendMode === "individual" && (
                  <Col span={24}>
                    <Form.Item
                      name="recipientId"
                      label="Gửi đến người dùng"
                      rules={[{ required: true }]}
                    >
                      <Select placeholder="Chọn người dùng">
                        {userList.map((user) => (
                          <Option key={user.id} value={user.id}>
                            {user.fullName || user.email}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                )}

                <Col span={24}>
                  <Form.Item
                    name="type"
                    label="Loại thông báo"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Chọn loại">
                      <Option value="RENT_REMINDER">Rent Reminder</Option>
                      <Option value="MAINTENANCE">Maintenance</Option>
                      <Option value="BOOKING_STATUS">Trạng thái đặt phòng</Option>
                      <Option value="ANNOUNCEMENT">Thông báo chung</Option>
                      <Option value="PAYMENT_SUCCESS">Thanh toán thành công</Option>
                      <Option value="PAYMENT_FAILED">Thanh toán thất bại</Option>
                      <Option value="CUSTOM">Tùy chỉnh</Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Form.Item
                    name="label"
                    label="Tiêu đề"
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="Nhập tiêu đề thông báo" />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Form.Item
                    name="content"
                    label="Nội dung"
                    rules={[
                      { required: true, message: "Please enter content!" },
                    ]}
                  >
                    <Input.TextArea
                      rows={4}
                      placeholder="Nhập nội dung thông báo"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Button type="primary" htmlType="submit" block>
                Tạo và gửi
              </Button>
            </Form>
          </Modal>

          {/* View Notification Detail Modal */}
          <Modal
            title="🔔 Chi Tiết Thông Báo"
            open={isViewModalOpen}
            onCancel={() => setIsViewModalOpen(false)}
            footer={[
              <Button key="close" onClick={() => setIsViewModalOpen(false)}>
                Xong
              </Button>,
            ]}
          >
            {selectedNotification && (
              <div>
                <p>
                  <strong>Tiêu đề:</strong> {selectedNotification.title}
                </p>
                <p>
                  <strong>Nội dung:</strong> {selectedNotification.message}
                </p>
                <p>
                  <strong>Loại:</strong> {translateNotificationType(selectedNotification.type)}
                </p>
                <p>
                  <strong>Trạng thái:</strong> {translateNotificationStatus(selectedNotification.status)}
                </p>
                <p>
                  <strong>Ngày tạo:</strong>{" "}
                  {selectedNotification.createdDate ? formatDateToVietnamese(selectedNotification.createdDate) : ""}
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
                message.success("Xóa thông báo thành công!");
                setRefreshKey((prev) => prev + 1);
              } catch (error) {
                console.error("Delete failed:", error);
                message.error("Xóa thông báo thất bại!");
              } finally {
                setIsDeleteModalOpen(false);
                setSelectedNotification(null);
              }
            }}
            onCancel={() => setIsDeleteModalOpen(false)}
            okText="Có"
            cancelText="Hủy"
          />
        </Content>
      </Layout>
    </Layout>
  );
}
