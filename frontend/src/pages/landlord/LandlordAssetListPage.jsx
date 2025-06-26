import React, { useEffect, useState } from "react";
import {
  Layout,
  Input,
  Button,
  Space,
  Popover,
  message,
  Table,
  Tag,
  Image,
  Popconfirm,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  FilterOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import { getAllAssets } from "../../services/assetApi";
import LandlordAddAssetModal from "../../components/landlord/LandlordAddAssetModal";

const { Sider, Content } = Layout;

const assetStatusColor = {
  Good: "green",
  Damaged: "red",
  Lost: "orange",
  Maintenance: "blue",
};

export default function LandlordAssetListPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchAssets = async (page = currentPage, filters = filter) => {
    setLoading(true);
    try {
      console.log("[fetchAssets] filters:", filters);
      const res = await getAllAssets(page - 1, pageSize, filters);
      console.log("[fetchAssets] API response:", res);
      setAssets(res.data || []);
      setTotal(res.meta?.total || res.data?.length || 0);
      console.log("[fetchAssets] assets after set:", res.data || []);
    } catch (err) {
      message.error("Failed to load assets");
      console.error("getAllAssets error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchAssets(1, filter);
    }, 300); // debounce để không gọi API liên tục khi gõ search

    return () => clearTimeout(delayDebounce);
    // eslint-disable-next-line
  }, [filter]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    // Không gọi fetchAssets ngay khi gõ, chỉ cập nhật state search
  };

  const handleSearchSubmit = () => {
    setFilter((prev) => ({ ...prev, assetName: search }));
    setCurrentPage(1);
    fetchAssets(1, { ...filter, assetName: search });
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const columns = [
    {
      title: "Asset Name",
      dataIndex: "assetName",
      key: "assetName",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      render: (val) => val ?? "-",
    },
    {
      title: "Status",
      dataIndex: "assetStatus",
      key: "assetStatus",
      render: (status) => (
        <Tag color={assetStatusColor[status] || "default"}>{status}</Tag>
      ),
    },
    {
      title: "Condition Note",
      dataIndex: "conditionNote",
      key: "conditionNote",
      render: (val) => val || "-",
    },
    {
      title: "Image",
      dataIndex: "assetImage",
      key: "assetImage",
      render: (url) =>
        url ? (
          <Image
            src={url}
            width={60}
            height={40}
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span style={{ color: "#aaa" }}>No image</span>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" />
          <Popconfirm title="Delete this asset?" okText="Yes" cancelText="No">
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
            <PageHeader title="List Asset" />
            <Space>
              <Input
                placeholder="Search asset name"
                style={{ width: 250 }}
                prefix={<SearchOutlined />}
                value={search}
                onChange={handleSearch}
                onKeyDown={handleInputKeyDown}
                allowClear
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearchSubmit} />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAddModalOpen(true)}>
                Add Asset
              </Button>
            </Space>
          </div>

          <LandlordAddAssetModal
            open={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={() => fetchAssets(1, filter)}
          />

          <Table
            columns={columns}
            dataSource={assets}
            loading={loading}
            rowKey="id"
            pagination={{
              current: currentPage,
              pageSize,
              total,
              onChange: (page) => {
                setCurrentPage(page);
                fetchAssets(page, filter);
              },
              showSizeChanger: false,
            }}
          />
        </Content>
      </Layout>
    </Layout>
  );
}
