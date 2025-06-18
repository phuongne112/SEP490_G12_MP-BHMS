import React, { useState } from "react";
import { Layout, Button, Input, Space, Popover } from "antd";
import {
  FilterOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import RenterTable from "../../components/landlord/RenterTable";
import RenterFilterPopover from "../../components/landlord/RenterFilterPopover";
import PageHeader from "../../components/common/PageHeader"; // ✅ IMPORT MỚI

const { Sider, Content } = Layout;

export default function LandlordRenterListPage() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState({});

  const handleFilter = (filterValues) => {
    setFilter(filterValues);
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
          {/* ✅ PHẦN HEADER MỚI */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              paddingTop: 4, // ✅ Tạo khoảng cách với đỉnh
            }}
          >
            <PageHeader title="List Renter" /> {/* ✅ Sử dụng PageHeader */}
            <Space>
              <Input
                placeholder="Search renter name or room"
                style={{ width: 250 }}
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={() => {}}
              />
              <Popover
                content={
                  <RenterFilterPopover
                    onFilter={handleFilter}
                    roomOptions={["Room 201", "Room 202", "Room 203"]}
                  />
                }
                trigger="click"
                placement="bottomRight"
              >
                <Button icon={<FilterOutlined />}>Filter</Button>
              </Popover>
              <Button type="primary" icon={<PlusOutlined />}>
                Add Renter
              </Button>
            </Space>
          </div>

          <RenterTable search={searchText} filter={filter} />
        </Content>
      </Layout>
    </Layout>
  );
}
