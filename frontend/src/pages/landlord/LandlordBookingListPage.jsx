import React, { useState, useEffect } from "react";
import {
  Layout,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Popconfirm,
  message,
  Spin,
  Drawer,
  ConfigProvider,
  Form,
  Popover,
} from "antd";
import {
  MenuOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import { useMediaQuery } from "react-responsive";
import dayjs from "dayjs";
import viVN from 'antd/locale/vi_VN';
import scheduleApi from "../../services/scheduleApi";
import { getRoomById } from "../../services/roomService";
import { useSelector } from "react-redux";

const { Sider, Content } = Layout;

// Custom Hour Range Picker Component
const HourRangePicker = ({ value, onChange, style }) => {
  const handleFromChange = (hour) => {
    onChange([hour, value?.[1]]);
  };

  const handleToChange = (hour) => {
    onChange([value?.[0], hour]);
  };

  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i.toString().padStart(2, '0')}:00`
  }));

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Select
        placeholder="Từ giờ"
        value={value?.[0]}
        onChange={handleFromChange}
        options={hours}
        style={{ width: 100 }}
      />
      <span>đến</span>
      <Select
        placeholder="Đến giờ"
        value={value?.[1]}
        onChange={handleToChange}
        options={hours}
        style={{ width: 100 }}
      />
    </div>
  );
};

export default function LandlordBookingListPage() {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(isMobile ? 3 : 5);
  const [total, setTotal] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterDate, setFilterDate] = useState(null);
  const [filterHourRange, setFilterHourRange] = useState(null);
  const [pendingFilterStatus, setPendingFilterStatus] = useState(null);
  const [pendingFilterDate, setPendingFilterDate] = useState(null);
  const [pendingFilterHourRange, setPendingFilterHourRange] = useState(null);
  const [roomInfo, setRoomInfo] = useState({});

  const { user } = useSelector((state) => state.account);

  const statusOptions = [
    { value: null, label: 'Tất cả' },
    { value: 'PENDING', label: 'Chờ xác nhận' },
    { value: 'CONFIRMED', label: 'Đã xác nhận' },
    { value: 'CANCELLED', label: 'Từ chối' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
  ];

  const fetchData = async () => {
    if (!user?.id) {
      console.log("No user ID found:", user);
      return;
    }
    
    console.log("Fetching data with user ID:", user.id);
    setLoading(true);
    try {
      const params = {
        landlordId: user.id,
        page: currentPage - 1, // Backend sử dụng 0-based indexing
        pageSize: pageSize,
        search: search || undefined,
        status: filterStatus || undefined,
        from: filterDate?.startOf('day').toISOString() || undefined,
        to: filterDate?.endOf('day').toISOString() || undefined,
        hourFrom: filterHourRange?.from || undefined,
        hourTo: filterHourRange?.to || undefined,
      };

      console.log("API params:", params);
      const response = await scheduleApi.searchAndFilter(params);
             console.log("API response:", response);
       console.log("Response data:", response.data);
       console.log("Response result:", response.data?.result);
       console.log("Response meta:", response.data?.meta);
       console.log("First record:", response.data?.result?.[0]);
       setData(response.data?.result || []);
       setTotal(response.data?.meta?.total || 0);
       
       // Fetch room information for all bookings
       const roomIds = response.data?.result?.map(booking => booking.roomId).filter(id => id) || [];
       console.log("Room IDs to fetch:", roomIds);
       if (roomIds.length > 0) {
         await fetchRoomInfo(roomIds);
       }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      message.error("Có lỗi xảy ra khi tải danh sách đặt lịch!");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

     // Fetch room information
   const fetchRoomInfo = async (roomIds) => {
     const uniqueRoomIds = [...new Set(roomIds.filter(id => id))];
     const roomData = {};
     
     console.log("=== FETCHING ROOM INFO ===");
     console.log("Room IDs to fetch:", uniqueRoomIds);
     
     for (const roomId of uniqueRoomIds) {
       try {
                   console.log(`Fetching room ${roomId}...`);
          const response = await getRoomById(roomId);
          console.log(`Room ${roomId} response:`, response);
          console.log(`Room ${roomId} data:`, response);
          roomData[roomId] = response;
       } catch (error) {
         console.error(`Error fetching room ${roomId}:`, error);
         roomData[roomId] = { roomNumber: `Phòng ${roomId}` };
       }
     }
     
     console.log("Final room data:", roomData);
     console.log("Setting roomInfo state with:", roomData);
     setRoomInfo(roomData);
   };

  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, filterStatus, filterDate, filterHourRange, search, user?.id]);

  const handleConfirm = async (record) => {
    try {
      await scheduleApi.updateStatus(record.id, "CONFIRMED");
      message.success('Đã xác nhận đặt lịch!');
      fetchData();
    } catch (error) {
      console.error("Error confirming booking:", error);
      message.error('Có lỗi xảy ra khi xác nhận đặt lịch!');
    }
  };

  const handleReject = async (record) => {
    try {
      await scheduleApi.updateStatus(record.id, "CANCELLED");
      message.success('Đã từ chối đặt lịch!');
      fetchData();
    } catch (error) {
      console.error("Error rejecting booking:", error);
      message.error('Có lỗi xảy ra khi từ chối đặt lịch!');
    }
  };

  const handleDelete = async (id) => {
    console.log("=== DELETE BOOKING ===");
    console.log("Deleting booking with ID:", id);
    console.log("ID type:", typeof id);
    
    try {
      console.log("Calling scheduleApi.delete...");
      const response = await scheduleApi.delete(id);
      console.log("Delete response:", response);
      message.success('Đã xóa đặt lịch!');
      fetchData();
    } catch (error) {
      console.error("Error deleting booking:", error);
      console.error("Error details:", error.response?.data);
      console.error("Error status:", error.response?.status);
      message.error('Có lỗi xảy ra khi xóa đặt lịch!');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'orange';
      case 'CONFIRMED': return 'green';
      case 'CANCELLED': return 'red';
      case 'COMPLETED': return 'blue';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING': return 'Chờ xác nhận';
      case 'CONFIRMED': return 'Đã xác nhận';
      case 'CANCELLED': return 'Từ chối';
      case 'COMPLETED': return 'Hoàn thành';
      default: return status;
    }
  };

  const columns = [
         {
       title: 'Số phòng',
       dataIndex: 'roomNumber',
       key: 'roomNumber',
       render: (_, record) => {
         const roomId = record.roomId;
         const roomData = roomInfo[roomId];
         
         console.log("=== RENDERING ROOM ===");
         console.log("Record:", record);
         console.log("RoomId:", roomId);
         console.log("RoomData:", roomData);
         console.log("RoomInfo state:", roomInfo);
         console.log("Record.room:", record.room);
         
         // Ưu tiên hiển thị roomNumber từ roomInfo (đã fetch từ API)
         if (roomData?.roomNumber) {
           console.log("Using roomData.roomNumber:", roomData.roomNumber);
           return roomData.roomNumber;
         }
         
         // Nếu không có, thử lấy từ record.room (nếu có)
         if (record.room?.roomNumber) {
           console.log("Using record.room.roomNumber:", record.room.roomNumber);
           return record.room.roomNumber;
         }
         
         // Nếu vẫn không có, hiển thị "Phòng + ID"
         if (roomId) {
           console.log("Using fallback Phòng + ID:", `Phòng ${roomId}`);
           return `Phòng ${roomId}`;
         }
         
         console.log("Using N/A");
         return 'N/A';
       },
     },
    {
      title: 'Tên khách hàng',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Ngày hẹn',
      dataIndex: 'appointmentTime',
      key: 'appointmentTime',
      render: (time) => time ? dayjs(time).format('DD/MM/YYYY') : 'N/A',
    },
    {
      title: 'Giờ hẹn',
      dataIndex: 'appointmentTime',
      key: 'appointmentTime',
      render: (time) => time ? dayjs(time).format('HH:mm') : 'N/A',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (note) => note || '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => {
        console.log("=== RENDERING ACTIONS ===");
        console.log("Record:", record);
        console.log("Record status:", record.status);
        console.log("Record ID:", record.id);
        
        return (
          <Space size="small">
            {record.status === 'PENDING' && (
              <>
                <Popconfirm
                  title="Bạn có chắc chắn muốn xác nhận đặt lịch này?"
                  onConfirm={() => handleConfirm(record)}
                  okText="Có"
                  cancelText="Hủy"
                  placement="left"
                >
                  <Button
                    type="primary"
                    size="small"
                  >
                    Xác nhận
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="Bạn có chắc chắn muốn từ chối đặt lịch này?"
                  onConfirm={() => handleReject(record)}
                  okText="Có"
                  cancelText="Không"
                  placement="left"
                >
                  <Button
                    danger
                    size="small"
                  >
                    Từ chối
                  </Button>
                </Popconfirm>
              </>
            )}
            <Popconfirm
              title="Bạn có chắc chắn muốn xóa?"
              onConfirm={() => {
                console.log("=== POPCONFIRM CONFIRMED ===");
                console.log("Record:", record);
                console.log("Record ID:", record.id);
                handleDelete(record.id);
              }}
              okText="Có"
              cancelText="Không"
              placement="left"
            >
              <Button 
                danger 
                size="small"
                onClick={() => {
                  console.log("=== DELETE BUTTON CLICKED ===");
                  console.log("Record ID:", record.id);
                }}
              >
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <ConfigProvider locale={viVN}>
      <Layout style={{ minHeight: "100vh" }}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <Sider
            width={250}
            style={{
              background: '#fff',
              borderRight: '1px solid #f0f0f0',
              position: 'fixed',
              height: '100vh',
              left: 0,
              top: 0,
              zIndex: 1000,
            }}
          >
            <LandlordSidebar />
          </Sider>
        )}

        {/* Mobile Header */}
        {isMobile && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1001,
            background: 'white',
            borderBottom: '1px solid #f0f0f0',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setSidebarDrawerOpen(true)}
                style={{ padding: 4 }}
              />
              <div style={{ fontWeight: 600, fontSize: 16 }}>Danh sách đặt lịch</div>
            </div>
          </div>
        )}
        
        <Layout style={{ marginLeft: isMobile ? 0 : 250 }}>
          <Content style={{ 
            padding: isMobile ? '60px 16px 16px' : 24, 
            backgroundColor: '#f5f5f5', 
            minHeight: '100vh' 
          }}>
            {/* Header Section */}
            <div style={{ 
              background: 'white', 
              padding: isMobile ? 16 : 20, 
              borderRadius: 8, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: 20
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <PageHeader title="Danh sách đặt lịch xem phòng" style={{ margin: 0, padding: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  <Input.Search
                    placeholder="Tìm đặt phòng..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ width: isMobile ? '100%' : 220 }}
                    allowClear
                  />
                  <Popover
                    content={
                      <Form layout="vertical">
                        <Form.Item label="Trạng thái">
                          <Select
                            value={pendingFilterStatus}
                            onChange={setPendingFilterStatus}
                            options={statusOptions}
                            style={{ width: 160 }}
                          />
                        </Form.Item>
                        <Form.Item label="Date Range">
                          <DatePicker.RangePicker
                            value={pendingFilterDate}
                            onChange={setPendingFilterDate}
                            style={{ width: 220 }}
                          />
                        </Form.Item>
                        <Form.Item label="Hour Range">
                          <HourRangePicker
                            value={pendingFilterHourRange}
                            onChange={setPendingFilterHourRange}
                            style={{ width: 220 }}
                          />
                        </Form.Item>
                        <Button
                          type="primary"
                          block
                          onClick={() => {
                            setFilterStatus(pendingFilterStatus);
                            setFilterDate(pendingFilterDate);
                            setFilterHourRange(pendingFilterHourRange);
                            setCurrentPage(1);
                            setFilterOpen(false);
                          }}
                        >
                          Áp dụng
                        </Button>
                      </Form>
                    }
                    title={null}
                    trigger="click"
                    open={filterOpen}
                    onOpenChange={(open) => {
                      setFilterOpen(open);
                      if (open) {
                        setPendingFilterStatus(filterStatus);
                        setPendingFilterDate(filterDate);
                        setPendingFilterHourRange(filterHourRange);
                      }
                    }}
                    placement="bottomRight"
                  >
                    <Button icon={<FilterOutlined />} type="default">Bộ lọc</Button>
                  </Popover>
                </div>
              </div>
              
                             {/* Status bar */}
               <div style={{ 
                 display: 'flex', 
                 justifyContent: 'space-between', 
                 alignItems: 'center',
                 borderTop: '1px solid #f0f0f0',
                 paddingTop: 12,
                 fontSize: 14,
                 flexWrap: isMobile ? 'wrap' : 'nowrap',
                 gap: isMobile ? 8 : 0
               }}>
                 <div style={{ fontWeight: 500, color: "#1890ff" }}>
                   Tổng: {total} đặt lịch
                 </div>
               </div>
            </div>
            
            {/* Table Section */}
            <div style={{ 
              background: 'white', 
              borderRadius: 8, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <Table
                columns={columns}
                dataSource={data}
                loading={loading}
                rowKey="id"
                scroll={{ x: isMobile ? 800 : 1200 }}
                size={isMobile ? 'small' : 'default'}
                pagination={{
                  current: currentPage,
                  pageSize,
                  total,
                  onChange: (page, size) => {
                    setCurrentPage(page);
                    setPageSize(size);
                  },
                  showSizeChanger: !isMobile,
                  showTotal: !isMobile ? undefined : (total, range) => `${range[0]}-${range[1]} / ${total}`,
                  size: isMobile ? 'small' : 'default',
                }}
                bordered
              />
            </div>
          </Content>
        </Layout>
        
        {/* Mobile Sidebar Drawer */}
        <Drawer
          title="Menu"
          placement="left"
          onClose={() => setSidebarDrawerOpen(false)}
          open={sidebarDrawerOpen}
          width={250}
          bodyStyle={{ padding: 0 }}
        >
          <LandlordSidebar isDrawer={true} onMenuClick={() => setSidebarDrawerOpen(false)} />
        </Drawer>
      </Layout>
    </ConfigProvider>
  );
}
