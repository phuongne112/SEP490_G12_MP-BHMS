import React, { useEffect, useState } from "react";
import {
  Layout,
  Table,
  Button,
  Space,
  message,
  Popconfirm,
  Input,
  Pagination,
  Popover,
  Select,
  Tag,
  Card,
} from "antd";
import {
  PlusOutlined,
  FilterOutlined,
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SendOutlined,
} from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import {
  getAllBills,
  deleteBill,
  exportBillPdf,
  sendBillToRenter,
  bulkGenerateBills,
} from "../../services/billApi";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import axiosClient from '../../services/axiosClient';
import { useMediaQuery } from "react-responsive";
dayjs.extend(customParseFormat);

const { Sider, Content } = Layout;

function BillFilterPopover({ onFilter }) {
  const [status, setStatus] = useState();
  const [minPrice, setMinPrice] = useState();
  const [maxPrice, setMaxPrice] = useState();
  const [roomId, setRoomId] = useState();
  
  const handleApply = () => {
    const roomIdNumber = roomId && !isNaN(roomId) ? Number(roomId) : undefined;
    onFilter({ status, minPrice, maxPrice, roomId: roomIdNumber });
  };
  
  return (
    <div style={{ minWidth: 220 }}>
      <div style={{ marginBottom: 8 }}>Trạng thái</div>
      <Select
        allowClear
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="Tất cả"
        value={status}
        onChange={setStatus}
        options={[
          { label: "Đã thanh toán", value: true },
          { label: "Chưa thanh toán", value: false },
        ]}
      />
      <div style={{ marginBottom: 8 }}>Giá tối thiểu</div>
      <Input
        type="number"
        placeholder="Giá tối thiểu"
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <div style={{ marginBottom: 8 }}>Giá tối đa</div>
      <Input
        type="number"
        placeholder="Giá tối đa"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <Button type="primary" block onClick={handleApply}>
        Áp dụng
      </Button>
    </div>
  );
}

export default function LandlordBillListPage() {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
  
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(isMobile ? 3 : 5);
  const pageSizeOptions = isMobile ? [3, 5, 10] : [5, 10, 20, 50];
  const [filterOpen, setFilterOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState({});
  
  // Initialize sentEmailsToday from localStorage
  const [sentEmailsToday, setSentEmailsToday] = useState(() => {
    const saved = localStorage.getItem('sentEmailsToday');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Check if the saved data is from today, if not, clear it
      const today = new Date().toDateString();
      if (parsed.date === today) {
        return new Set(parsed.bills);
      }
    }
    return new Set();
  });
  
  const navigate = useNavigate();

  // Check if a bill was sent today
  const isEmailSentToday = (billId) => {
    const today = new Date().toDateString();
    const key = `${billId}-${today}`;
    return sentEmailsToday.has(key);
  };

  // Mark a bill as sent today and save to localStorage
  const markEmailSentToday = (billId) => {
    const today = new Date().toDateString();
    const key = `${billId}-${today}`;
    const newSet = new Set([...sentEmailsToday, key]);
    setSentEmailsToday(newSet);
    
    // Save to localStorage
    localStorage.setItem('sentEmailsToday', JSON.stringify({
      date: today,
      bills: Array.from(newSet)
    }));
  };

  const fetchBills = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const params = { 
        ...filter, 
        page: page - 1, 
        size: size 
      };
      if (search) params.search = search;
      const res = await getAllBills(params);
      setBills(res.content || []);
      setTotal(res.totalElements || 0);
    } catch (err) {
      message.error("Không thể tải danh sách hóa đơn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills(currentPage, pageSize);
    // eslint-disable-next-line
  }, [search, filter, currentPage, pageSize]);

  const handleDelete = async (id) => {
    try {
      await deleteBill(id);
      message.success("Xóa hóa đơn thành công");
      fetchBills();
    } catch (err) {
      message.error("Xóa thất bại");
    }
  };

  const handleExport = async (id) => {
    try {
      const data = await exportBillPdf(id);
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `bill_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success("Xuất hóa đơn thành công");
    } catch (err) {
      message.error("Xuất hóa đơn thất bại");
    }
  };

  const handleSend = async (id) => {
    try {
      await sendBillToRenter(id);
      message.success("Gửi hóa đơn cho người thuê thành công");
    } catch (err) {
      message.error("Gửi thất bại");
    }
  };

  const handleSendEmail = async (id) => {
    // Check if email was already sent today
    if (isEmailSentToday(id)) {
      message.warning("Hóa đơn này đã được gửi email hôm nay!");
      return;
    }

    setEmailLoading(prev => ({ ...prev, [id]: true }));
    try {
      await axiosClient.post(`/bills/send-email/${id}`);
      message.success("Đã gửi hóa đơn qua email thành công!");
      // Mark as sent today after successful sending
      markEmailSentToday(id);
    } catch (err) {
      message.error("Gửi email thất bại!");
    } finally {
      setEmailLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleFilter = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
    setFilterOpen(false);
  };

  const handleBulkGenerate = async () => {
    setBulkLoading(true);
    try {
      const result = await bulkGenerateBills();
      if (result.success) {
                 message.success(`${result.message}! Đã tạo ${result.count} hóa đơn mới.`);
        fetchBills(); // Refresh danh sách
      } else {
        message.error(result.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error("Bulk generate error:", err);
      message.error("Lỗi khi tạo hóa đơn tự động: " + (err.response?.data?.message || err.message));
    } finally {
      setBulkLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (date) => {
    if (date && dayjs(date, "YYYY-MM-DD HH:mm:ss A").isValid()) {
      return dayjs(date, "YYYY-MM-DD HH:mm:ss A").format("DD/MM/YYYY");
    }
    if (date && dayjs(date).isValid()) {
      return dayjs(date).format("DD/MM/YYYY");
    }
    return <span style={{ color: 'red', fontWeight: 500 }}>Không xác định</span>;
  };

  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setCurrentPage(1);
    fetchBills(1, value);
  };

  const columns = [
    {
      title: "STT",
      align: "center",
      width: isMobile ? 50 : 70,
      render: (_, __, index) => (currentPage - 1) * pageSize + index + 1,
    },
    { 
      title: "Mã hóa đơn", 
      dataIndex: "id", 
      align: "center", 
      width: isMobile ? 80 : 100,
      render: (id) => `#${id}`
    },
    { 
      title: "Phòng", 
      dataIndex: "roomNumber", 
      align: "center", 
      width: isMobile ? 80 : 120 
    },
    ...(isMobile ? [] : [
      { 
        title: "Mã hợp đồng", 
        dataIndex: "contractId", 
        align: "center", 
        width: 120,
        render: (contractId) => contractId ? `#${contractId}` : 'Không có'
      }
    ]),
    { 
      title: "Loại hóa đơn", 
      dataIndex: "billType", 
      align: "center", 
      width: isMobile ? 100 : 120,
      render: (billType) => {
        if (!billType) return <span style={{ color: '#888' }}>Không xác định</span>;
        if (
          billType === 'REGULAR' ||
          billType === 'ROOM_RENT' ||
          billType === 'CONTRACT_ROOM_RENT' ||
          billType.includes('ROOM_RENT')
        ) {
          return <Tag color="blue">Tiền phòng</Tag>;
        }
        if (
          billType === 'SERVICE' ||
          billType === 'CONTRACT_SERVICE' ||
          billType.includes('SERVICE')
        ) {
          return <Tag color="green">Dịch vụ</Tag>;
        }
        if (billType === 'DEPOSIT' || billType.includes('DEPOSIT')) {
          return <Tag color="purple">Đặt cọc</Tag>;
        }
        if (billType === 'CONTRACT_TOTAL') {
          return <Tag color="geekblue">Tổng hợp đồng</Tag>;
        }
        return <Tag>{billType}</Tag>;
      }
    },
    ...(isMobile ? [] : [
      { 
        title: "Từ ngày", 
        dataIndex: "fromDate", 
        align: "center", 
        width: 120,
        render: (date) => formatDate(date)
      },
      { 
        title: "Đến ngày", 
        dataIndex: "toDate", 
        align: "center", 
        width: 120,
        render: (date) => formatDate(date)
      }
    ]),
    { 
      title: "Tổng tiền", 
      dataIndex: "totalAmount", 
      align: "center", 
      width: isMobile ? 100 : 140,
      render: (amount) => formatCurrency(amount)
    },
    {
      title: "Trạng thái",
      align: "center",
      width: isMobile ? 80 : 120,
      render: (_, record) => (
        <Tag color={record.status ? "green" : "red"}>
          {record.status ? "Đã thanh toán" : "Chưa thanh toán"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      align: "center",
      width: isMobile ? 200 : 320,
      render: (_, record) => (
        <Space size="small" style={{ flexWrap: 'nowrap', justifyContent: 'center' }}>
          <Button 
            type="primary" 
            icon={<EyeOutlined />}
            onClick={() => navigate(`/landlord/bills/${record.id}`)}
            size="small"
          >
            Xem
          </Button>
          {!isMobile && (
            <Button 
              type="default"
              icon={<DownloadOutlined />}
              onClick={() => handleExport(record.id)}
              size="small"
            >
              Xuất PDF
            </Button>
          )}
          <Popover
            content={
              record.status 
                ? 'Chỉ gửi email cho hóa đơn chưa thanh toán' 
                : isEmailSentToday(record.id)
                ? 'Hóa đơn này đã được gửi email hôm nay'
                : 'Gửi hóa đơn cho khách'
            }
            placement="top"
          >
            <Button 
              type="default"
              icon={<SendOutlined />}
              onClick={() => handleSendEmail(record.id)}
              size="small"
              loading={emailLoading[record.id]}
              disabled={record.status === true || isEmailSentToday(record.id)}
            >
              {isMobile ? "Email" : (isEmailSentToday(record.id) ? "Đã gửi hôm nay" : "Gửi Email")}
            </Button>
          </Popover>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa hóa đơn này?"
            okText="Có"
            cancelText="Không"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button 
              icon={<DeleteOutlined />}
              type="primary"
              danger
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", flexDirection: isMobile ? "column" : "row" }}>
      {!isMobile && (
        <Sider width={220}>
          <LandlordSidebar />
        </Sider>
      )}
      <Layout>
        <Content style={{ padding: isMobile ? 16 : 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
          {/* Header Section */}
          <div style={{ 
            background: 'white', 
            padding: isMobile ? 16 : 20, 
            borderRadius: 8, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: 20
          }}>
            <div style={{ 
              display: "flex", 
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between", 
              alignItems: isMobile ? "stretch" : "center", 
              marginBottom: 12,
              gap: isMobile ? 12 : 0
            }}>
              <PageHeader title="Danh sách hóa đơn" style={{ margin: 0, padding: 0 }} />
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? "column" : "row",
                alignItems: 'center', 
                gap: 12,
                width: isMobile ? "100%" : "auto"
              }}>
                <Input
                  placeholder="Tìm hóa đơn..."
                  allowClear
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onPressEnter={() => setCurrentPage(1)}
                  style={{ width: isMobile ? "100%" : 300 }}
                />
                <Popover
                  open={filterOpen}
                  onOpenChange={setFilterOpen}
                  content={<BillFilterPopover onFilter={handleFilter} />}
                  trigger="click"
                  placement="bottomRight"
                >
                  <Button 
                    icon={<FilterOutlined />} 
                    type="default"
                    style={{ width: isMobile ? "100%" : "auto" }}
                  >
                    Bộ lọc
                  </Button>
                </Popover>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/landlord/bills/create")}
                  style={{ width: isMobile ? "100%" : "auto" }}
                >
                  Thêm hóa đơn
                </Button>
                <Button
                  type="default"
                  style={{ 
                    background: '#52c41a', 
                    borderColor: '#52c41a', 
                    color: '#fff',
                    width: isMobile ? "100%" : "auto"
                  }}
                  loading={bulkLoading}
                  onClick={handleBulkGenerate}
                >
                  Tạo Hóa Đơn Tự Động
                </Button>
              </div>
            </div>
            
            {/* Status bar */}
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? "column" : "row",
              justifyContent: 'space-between', 
              alignItems: isMobile ? "stretch" : "center",
              borderTop: '1px solid #f0f0f0',
              paddingTop: 12,
              fontSize: isMobile ? 12 : 14,
              gap: isMobile ? 8 : 0
            }}>
              <div style={{ color: '#666' }}>
                Hiển thị
                <Select
                  style={{ width: isMobile ? 60 : 80, margin: "0 8px" }}
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  options={pageSizeOptions.map((v) => ({ value: v, label: v }))}
                  size={isMobile ? "small" : "middle"}
                />
                mục
              </div>
              <div style={{ fontWeight: 500, color: "#1890ff" }}>
                Tổng: {total} hóa đơn
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
              dataSource={bills}
              loading={loading}
              rowKey="id"
              pagination={false}
              scroll={{ x: isMobile ? 600 : 1200 }}
              size={isMobile ? "small" : "middle"}
              bordered
            />
            
            <div
              style={{
                padding: isMobile ? 12 : 16,
                width: "100%",
                display: "flex",
                justifyContent: "flex-end",
                borderTop: '1px solid #f0f0f0'
              }}
            >
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={total}
                onChange={(page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                  fetchBills(page, size);
                }}
                showSizeChanger={false}
                showQuickJumper={!isMobile}
                showTotal={!isMobile ? (total, range) => `${range[0]}-${range[1]} trên tổng số ${total} hóa đơn` : undefined}
                size={isMobile ? "small" : "default"}
              />
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
