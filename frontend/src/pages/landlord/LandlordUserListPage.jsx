import React, { useState, useEffect } from "react";
import {
  Layout,
  Button,
  Input,
  Space,
  Popover,
  Modal,
  Form,
  message,
  Select,
} from "antd";
import {
  FilterOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import UserTable from "../../components/landlord/UserTable";
import UserFilterPopover from "../../components/landlord/UserFilterPopover";
import PageHeader from "../../components/common/PageHeader";
import { useNavigate } from "react-router-dom";
import { getAllUsers, createUser, updateUser } from "../../services/userApi";
import { createRenter } from "../../services/renterApi";

const { Sider, Content } = Layout;

export default function LandlordUserListPage() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState({});
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const pageSizeOptions = [5, 10, 20, 50];
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [addLoading, setAddLoading] = useState(false);
  const navigate = useNavigate();
  const [renterModalOpen, setRenterModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [renterForm] = Form.useForm();

  const fetchUsers = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      let filterDSL = "";
      if (searchText) {
        filterDSL += `(username~'*${searchText}*' or email~'*${searchText}*')`;
      }
      if (filter.isActive !== undefined) {
        if (filterDSL) filterDSL += " and ";
        filterDSL += `isActive=${filter.isActive}`;
      }
      // Chỉ lấy user chưa có role
      if (filterDSL) filterDSL += " and ";
      filterDSL += "(role is null or role.roleName is null)";
      const res = await getAllUsers(page - 1, size, filterDSL);
      setUsers(res.result || []);
      setTotal(res.meta?.total || 0);
    } catch (err) {
      message.error("Không thể tải danh sách người dùng");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers(currentPage, pageSize);
    // eslint-disable-next-line
  }, [searchText, filter, currentPage, pageSize]);

  const handleFilter = (filterValues) => {
    setFilter(filterValues);
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    setSearchText(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchEnter = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  const handleAddUser = async () => {
    try {
      const values = await addForm.validateFields();
      // Kiểm tra trùng số điện thoại và CCCD/CMND
      try {
        const res = await getAllUsers(0, 1000);
        const users = res?.result || [];
        const phoneExists = users.some(u => u.phoneNumber === values.phoneNumber);
        const cccdExists = users.some(u => u.citizenId && values.citizenId && u.citizenId === values.citizenId);
        if (phoneExists) {
          addForm.setFields([{ name: 'phoneNumber', errors: ['Số điện thoại đã tồn tại.'] }]);
          return;
        }
        if (cccdExists) {
          addForm.setFields([{ name: 'citizenId', errors: ['Số CCCD/CMND đã tồn tại.'] }]);
          return;
        }
      } catch (err) {}
      setAddLoading(true);
      await createUser(values);
      message.success("Thêm người dùng thành công!");
      addForm.resetFields();
      setAddModalOpen(false);
      fetchUsers();
    } catch (err) {
      if (err?.errorFields) return;
      message.error("Thêm người dùng thất bại!");
    } finally {
      setAddLoading(false);
    }
  };

  const handleChangeRenter = async (user) => {
    try {
      await updateUser({
        id: user.id,
        username: user.username,
        email: user.email,
        role: { roleId: 2 },
      });
      message.success("Chuyển thành người thuê thành công!");
      fetchUsers();
    } catch (err) {
      message.error(err?.response?.data?.message || "Chuyển đổi vai trò thất bại");
    }
  };

  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setCurrentPage(1);
    fetchUsers(1, value);
  };

  return (
    <Layout style={{ minHeight: "100vh", flexDirection: "row" }}>
      <Sider width={220} style={{ background: "#001529" }}>
        <LandlordSidebar />
      </Sider>
      <Layout style={{ padding: 24 }}>
        <Content
          style={{
            background: "#fff",
            padding: 24,
            borderRadius: 8,
            minHeight: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              paddingTop: 4,
            }}
          >
            <PageHeader title="Danh sách người dùng" />
            <Space>
              <Input
                placeholder="Tìm theo tên đăng nhập hoặc email"
                style={{ width: 250 }}
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={handleSearch}
                onPressEnter={handleSearchEnter}
              />
            </Space>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div>
              Hiển thị
              <Select
                style={{ width: 80, margin: "0 8px" }}
                value={pageSize}
                onChange={handlePageSizeChange}
                options={pageSizeOptions.map((v) => ({ value: v, label: v }))}
              />
              mục
            </div>
            <div style={{ fontWeight: 400, color: "#888" }}>
              Tổng: {total} người dùng
            </div>
          </div>

          <UserTable
            users={users}
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize,
              total,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
                fetchUsers(page, size);
              },
              showSizeChanger: false,
            }}
            onChangeRenter={handleChangeRenter}
          />
          <Modal
            open={addModalOpen}
            title="Add New User"
            onCancel={() => {
              addForm.resetFields();
              setAddModalOpen(false);
            }}
            onOk={handleAddUser}
            confirmLoading={addLoading}
            okText="Thêm"
          >
            <Form form={addForm} layout="vertical">
              <Form.Item
                name="username"
                label="Tên đăng nhập"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ required: true, type: "email" }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name="phoneNumber" label="Số điện thoại">
                <Input />
              </Form.Item>
              <Form.Item name="fullName" label="Họ và tên">
                <Input />
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
