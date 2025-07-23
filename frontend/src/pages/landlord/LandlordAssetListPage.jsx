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
import AssetFilterPopover from '../../components/landlord/AssetFilterPopover';

const { Sider, Content } = Layout;

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
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  const fetchAssets = async (
    page = currentPage,
    filters = filter,
    size = pageSize
  ) => {
    setLoading(true);
    try {
      const res = await getAllAssets(page - 1, size, filters);
      setAssets(res.data?.result || res.result || []);
      setTotal(res.meta?.total || res.data?.meta?.total || 0);
    } catch (err) {
      message.error("Không thể tải danh sách tài sản");
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
      message.success("Xóa tài sản thành công!");
      fetchAssets(currentPage, filter, pageSize);
    } catch (err) {
      message.error(err.response?.data?.message || "Xóa tài sản thất bại");
    }
  };

  const handleFilterApply = (filterValues) => {
    // Convert min/max quantity về undefined nếu là chuỗi rỗng
    const cleaned = { ...filterValues };
    if (cleaned.minQuantity === '' || cleaned.minQuantity == null) delete cleaned.minQuantity;
    if (cleaned.maxQuantity === '' || cleaned.maxQuantity == null) delete cleaned.maxQuantity;
    setFilter(cleaned);
    setCurrentPage(1);
    setFilterPopoverOpen(false);
  };

  const columns = [
    {
      title: "Tên tài sản",
      dataIndex: "assetName",
      key: "assetName",
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      render: (val) => val ?? "-",
    },
    {
      title: "Ghi chú tình trạng",
      dataIndex: "conditionNote",
      key: "conditionNote",
      render: (val) => val || "-",
    },
    {
      title: "Hình ảnh",
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
          <span style={{ color: "#aaa" }}>Không có ảnh</span>
        ),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditAsset(record)}
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa tài sản này?"
            okText="Có"
            cancelText="Không"
            onConfirm={() => handleDeleteAsset(record.id)}
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220}>
        <LandlordSidebar />
      </Sider>
      <Layout>
        <Content style={{ padding: 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
          {/* Header Section */}
          <div style={{ 
            background: 'white', 
            padding: 20, 
            borderRadius: 8, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: 20
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <PageHeader title="Danh sách tài sản" style={{ margin: 0, padding: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Input
                  placeholder="Tìm tài sản..."
                  style={{ width: 220 }}
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={handleSearch}
                />
                <Popover
                  content={<AssetFilterPopover onFilter={handleFilterApply} onClose={() => setFilterPopoverOpen(false)} />}
                  trigger="click"
                  open={filterPopoverOpen}
                  onOpenChange={setFilterPopoverOpen}
                  placement="bottomLeft"
                >
                  <Button icon={<FilterOutlined />} type="default">Bộ lọc</Button>
                </Popover>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddAsset}
                >
                  Thêm tài sản
                </Button>
              </div>
            </div>
            
            {/* Status bar */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderTop: '1px solid #f0f0f0',
              paddingTop: 12,
              fontSize: 14
            }}>
              <div style={{ color: '#666' }}>
                Hiển thị
                <Select
                  style={{ width: 80, margin: "0 8px" }}
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  options={pageSizeOptions.map((v) => ({ value: v, label: v }))}
                />
                mục
              </div>
              <div style={{ fontWeight: 500, color: "#1890ff" }}>
                Tổng: {total} tài sản
              </div>
            </div>
          </div>
          
          {/* Main Table Section */}
          <div style={{ 
            background: 'white', 
            borderRadius: 8, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
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
          </div>
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
