import React from "react";
import { Layout, Typography, Button, Input, Space } from "antd";
import { FilterOutlined, PlusOutlined } from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import RenterTable from "../../components/landlord/RenterTable";

const { Content } = Layout;
const { Title } = Typography;

export default function LandlordRenterListPage() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <LandlordSidebar />

      <Layout style={{ padding: "24px" }}>
        <Content style={{ background: "#fff", padding: 24, borderRadius: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <Title level={4} style={{ margin: 0 }}>
              List Renter
            </Title>
            <Space>
              <Input.Search
                placeholder="Search renter name or room"
                style={{ width: 250 }}
              />
              <Button icon={<FilterOutlined />}>Filter</Button>
              <Button type="primary" icon={<PlusOutlined />}>
                Add Renter
              </Button>
            </Space>
          </div>

          <RenterTable />
        </Content>
      </Layout>
    </Layout>
  );
}
