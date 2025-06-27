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
  Select,
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
import LandlordAddAssetModal from "../../components/landlord/LandlordAddAssetModal";
import { getAllAssets, deleteAsset } from "../../services/assetApi";

const { Sider, Content } = Layout;

const assetStatusColor = {
  Good: "green",
  Damaged: "red",
  Lost: "orange",
  Maintenance: "blue",
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

const pageSizeOptions = [5, 10, 20, 50];

export default function LandlordAssetListPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [loading, setLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const fetchAssets = async (
    page = currentPage,
    filters = filter,
    size = pageSize
  ) => {
    setLoading(true);
    try {
      const res = await getAllAssets(page - 1, size, filters);
      setAssets(res.data || []);
      setTotal(res.meta?.total || res.data?.length || 0);
      console.log("assets state after set:", res.data || []);
    } catch (err) {
      message.error("Failed to load assets");
      console.error("getAllAssets error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchAssets(1, filter, pageSize);
    }, 300); // debounce để không gọi API liên tục khi gõ search

    return () => clearTimeout(delayDebounce);
    // eslint-disable-next-line
  }, [filter, pageSize]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setFilter((prev) => ({ ...prev, assetName: e.target.value }));
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setCurrentPage(1);
    fetchAssets(1, filter, value);
  };

  const handleAddAsset = () => {
    setIsAddModalVisible(true);
  };

  const handleAddSuccess = () => {
    fetchAssets(currentPage, filter, pageSize);
  };

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setIsEditModalVisible(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalVisible(false);
    setEditingAsset(null);
    fetchAssets(currentPage, filter, pageSize);
  };

  const handleDeleteAsset = async (id) => {
    try {
      await deleteAsset(id);
      message.success("Asset deleted successfully!");
      fetchAssets(currentPage, filter, pageSize);
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to delete asset");
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
            src={
              url.startsWith("http")
                ? url
                : `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`
            }
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
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditAsset(record)}
          />
          <Popconfirm
            title="Delete this asset?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => handleDeleteAsset(record.id)}
          >
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
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddAsset}
              >
                Add Asset
              </Button>
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
              Show
              <Select
                style={{ width: 80, margin: "0 8px" }}
                value={pageSize}
                onChange={handlePageSizeChange}
                options={pageSizeOptions.map((v) => ({ value: v, label: v }))}
              />
              entries
            </div>
            <div style={{ fontWeight: 400, color: "#888" }}>
              Tổng số: {total} assets
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={assets}
            loading={loading}
            rowKey="id"
            pagination={{
              current: currentPage,
              pageSize,
              total,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
                fetchAssets(page, filter, size);
              },
              showSizeChanger: false,
            }}
          />
        </Content>
      </Layout>
      <LandlordAddAssetModal
        open={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSuccess={handleAddSuccess}
        mode="add"
      />
      <LandlordAddAssetModal
        open={isEditModalVisible}
        onClose={() => {
          setIsEditModalVisible(false);
          setEditingAsset(null);
        }}
        onSuccess={handleEditSuccess}
        asset={editingAsset}
        mode="edit"
      />
    </Layout>
  );
}
