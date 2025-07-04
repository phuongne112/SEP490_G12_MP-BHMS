import React, { useState } from "react";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import AddRenterForm from "../../components/landlord/AddRenterForm";
import { Layout } from "antd";
import { createRenter } from "../../services/renterApi";
import { message } from "antd";
import { Modal, Button, Table } from "antd";
import { getAllUsers, updateUser } from "../../services/userApi";

const { Sider, Content } = Layout;

export default function LandlordAddRenterPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUsersWithoutRole = async () => {
    setLoading(true);
    try {
      const res = await getAllUsers(0, 20, "role IS NULL");
      setUserList(res.result || []);
    } catch (err) {
      message.error("Không lấy được danh sách user!");
    }
    setLoading(false);
  };

  const handleOpenModal = () => {
    setModalOpen(true);
    fetchUsersWithoutRole();
  };

  const handleGrantRenter = async (user) => {
    try {
      await updateUser({
        id: user.id,
        email: user.email,
        username: user.username,
        role: { roleId: 2 }
      });
      message.success("Cấp quyền renter thành công!");
      fetchUsersWithoutRole();
    } catch (err) {
      message.error("Cấp quyền thất bại!");
    }
  };

  const handleSubmit = async (renterData) => {
    try {
      await createRenter(renterData);
      message.success("Tạo người thuê thành công!");
      // Có thể reset form hoặc chuyển trang nếu muốn
    } catch (error) {
      message.error("Có lỗi xảy ra khi tạo người thuê!");
      console.error(error);
    }
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
          <PageHeader title="Add New Renter" />
          <Button type="primary" onClick={handleOpenModal} style={{ marginBottom: 16 }}>
            Cấp quyền Renter cho user chưa có role
          </Button>
          <Modal
            open={modalOpen}
            onCancel={() => setModalOpen(false)}
            footer={null}
            title="Danh sách user chưa có role"
          >
            <Table
              dataSource={userList}
              loading={loading}
              rowKey="id"
              columns={[
                { title: "ID", dataIndex: "id" },
                { title: "Email", dataIndex: "email" },
                { title: "Username", dataIndex: "username" },
                {
                  title: "Thao tác",
                  render: (_, record) => (
                    <Button type="primary" onClick={() => handleGrantRenter(record)}>
                      Cấp quyền Renter
                    </Button>
                  ),
                },
              ]}
            />
          </Modal>
          <div style={{ marginTop: 16 }}>
            <AddRenterForm onSubmit={handleSubmit} />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
