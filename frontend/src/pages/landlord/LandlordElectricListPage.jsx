import React, { useState, useEffect } from "react";
import { Layout, Row, Col, DatePicker, Select, Button, Popover, message, Modal, Table, Input, Space, Tooltip } from "antd";
import dayjs from "dayjs";
import PageHeader from "../../components/common/PageHeader";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import ElectricTable from "../../components/landlord/ElectricTable";
import { getElectricReadings } from "../../services/electricReadingApi";
import { getRoomsWithElectricReadings } from "../../services/roomService";
import { FilterOutlined } from "@ant-design/icons";
import { enableAutoScan, disableAutoScan, getAutoScanStatus, getScanLogs, getScanImages, getCurrentScanningImage } from "../../services/electricReadingApi";
import { FolderOpenOutlined } from "@ant-design/icons";
import axiosClient from "../../services/axiosClient";
import { getElectricScanInterval } from '../../services/electricOcrApi';

const { Sider, Content } = Layout;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function LandlordElectricListPage() {
  const [dateRange, setDateRange] = useState([null, null]);
  const [selectedBuilding, setSelectedBuilding] = useState("All");
  const [selectedCycle, setSelectedCycle] = useState("All");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const [electricData, setElectricData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roomMap, setRoomMap] = useState({});
  const [roomList, setRoomList] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [tempDateRange, setTempDateRange] = useState(dateRange);
  const [tempRoom, setTempRoom] = useState(selectedRoom);
  const [autoScanStatus, setAutoScanStatus] = useState("Đang kiểm tra...");
  const [autoScanLoading, setAutoScanLoading] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [scanLogs, setScanLogs] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const logPageSize = 10;
  const [scanImages, setScanImages] = useState([]);
  const [currentScanning, setCurrentScanning] = useState("");
  // Thêm state để lưu roomId đang xem log
  const [logRoomId, setLogRoomId] = useState(null);
  // Thêm state cho interval
  const [scanInterval, setScanInterval] = useState(10000);
  const [intervalLoading, setIntervalLoading] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      const res = await getRoomsWithElectricReadings();
      setRoomList(res || []);
    };
    fetchRooms();
    // Lấy interval hiện tại khi load trang
    getElectricScanInterval()
      .then(res => setScanInterval(res.data?.intervalMs || 10000))
      .catch(() => setScanInterval(10000));
  }, []);

  useEffect(() => {
    reloadElectricData();
    // eslint-disable-next-line
  }, [dateRange, selectedRoom]);

  useEffect(() => {
    setTempDateRange(dateRange);
  }, [dateRange]);
  useEffect(() => {
    setTempRoom(selectedRoom);
  }, [selectedRoom]);

  const reloadElectricData = async () => {
    setLoading(true);
    try {
      let params = { serviceId: 1 };
      if (dateRange[0] && dateRange[1]) {
        params = {
          ...params,
          startDate: dateRange[0].format("YYYY-MM-DD"),
          endDate: dateRange[1].format("YYYY-MM-DD"),
        };
      }
      if (selectedRoom) {
        params = { ...params, roomId: selectedRoom };
      }
      console.log("Params gửi lên readings:", params);
      const res = await getElectricReadings(params);
      const mapped = (res.data || res).map((item) => ({
        key: item.id,
        roomId: item.roomId,
        roomNumber: item.roomNumber,
        oldReading: item.oldReading,
        newReading: item.newReading,
        createdDate: item.createdDate,
      }));
      setElectricData(mapped);
    } catch {
      setElectricData([]);
    }
    setLoading(false);
  };

  const pagedData = electricData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSaveBill = () => {
    console.log("Saving bill for:", selectedMonth.format("MM/YYYY"));
    // TODO: Gọi API lưu bill nếu có
  };

  const filterContent = (
    <div style={{ minWidth: 250 }}>
      <div style={{ marginBottom: 12 }}>
        <span>Khoảng ngày</span>
        <RangePicker
          value={tempDateRange}
          onChange={setTempDateRange}
          format="DD/MM/YYYY"
          allowClear
          style={{ width: "100%" }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <span>Phòng</span>
        <Select
          showSearch
          allowClear
          placeholder="Chọn phòng"
          value={tempRoom}
          onChange={setTempRoom}
          style={{ width: "100%" }}
          optionFilterProp="children"
        >
          {roomList.map((room) => (
            <Select.Option key={room.id} value={room.id}>
              {room.roomNumber}
            </Select.Option>
          ))}
        </Select>
      </div>
      <Button
        type="primary"
        block
        onClick={() => {
          setDateRange(tempDateRange);
          setSelectedRoom(tempRoom);
          setFilterVisible(false);
        }}
      >
        Áp dụng
      </Button>
    </div>
  );

  const fetchAutoScanStatus = async () => {
    setAutoScanLoading(true);
    try {
      const res = await getAutoScanStatus();
      setAutoScanStatus(res);
    } catch {
      setAutoScanStatus("Không xác định");
    }
    setAutoScanLoading(false);
  };

  useEffect(() => {
    fetchAutoScanStatus();
  }, []);

  const handleToggleAutoScan = async (enable) => {
    setAutoScanLoading(true);
    try {
      if (enable) {
        await enableAutoScan();
        message.success("Đã bật auto scan thành công!");
      } else {
        await disableAutoScan();
        message.success("Đã tắt auto scan thành công!");
      }
      fetchAutoScanStatus();
    } catch {
      message.error("Thao tác thất bại. Vui lòng thử lại!");
    }
    setAutoScanLoading(false);
  };

  const fetchScanLogs = async (page = 1, roomId = null) => {
    setLogLoading(true);
    try {
      const params = { page: page - 1, size: logPageSize };
      if (roomId) params.roomId = roomId;
      const res = await getScanLogs(params);
      // Lấy đúng mảng log từ res.data.content nếu có
      const data = res.data ? res.data : res;
      let logs = [];
      let total = 0;
      if (Array.isArray(data)) {
        logs = data;
        total = data.length;
      } else if (data && Array.isArray(data.content)) {
        logs = data.content;
        total = data.totalElements || logs.length;
      }
      // Map thêm roomNumber vào từng log
      logs = logs.map(log => ({
        ...log,
        roomNumber: roomList.find(r => r.id === log.roomId)?.roomNumber || log.roomId
      }));
      setScanLogs(logs);
      setLogTotal(total);
      setLogPage(page);
    } catch {
      setScanLogs([]);
    }
    setLogLoading(false);
  };

  const openLogModal = (roomId) => {
    setLogRoomId(roomId);
    fetchScanLogs(1, roomId);
    setLogModalVisible(true);
  };

  const logColumns = [
    { title: "File", dataIndex: "fileName", key: "fileName" },
    { title: "Phòng", dataIndex: "roomNumber", key: "roomNumber" },
    { title: "Kết quả", dataIndex: "result", key: "result", render: (text) => text || "-" },
    { title: "Thời gian", dataIndex: "scanTime", key: "scanTime", render: (t) => t ? new Date(t).toLocaleString() : "-" },
    { 
      title: "Lỗi", 
      dataIndex: "errorMessage", 
      key: "errorMessage", 
      render: (text) => {
        if (!text) return "-";
        // Lấy dòng đầu tiên hoặc thông báo ngắn gọn
        let shortMsg = text;
        if (text.includes("429 Too Many Requests")) shortMsg = "429 Too Many Requests";
        else if (text.length > 60) shortMsg = text.slice(0, 60) + "...";
        return (
          <Tooltip title={<pre style={{ whiteSpace: 'pre-wrap', maxWidth: 400 }}>{text}</pre>}>
            <span style={{ color: 'red', cursor: 'pointer', wordBreak: 'break-all' }}>{shortMsg}</span>
          </Tooltip>
        );
      }
    },
  ];

  // Thêm polling tự động reload dữ liệu khi auto scan ON
  useEffect(() => {
    let interval = null;
    if (autoScanStatus === "Auto scan ON") {
      // Polling mỗi 10 giây
      interval = setInterval(() => {
        reloadElectricData();
        const fetchRooms = async () => {
          const res = await getRoomsWithElectricReadings();
          setRoomList(res || []);
        };
        fetchRooms();
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line
  }, [autoScanStatus]);



  const fetchScanImagesAndCurrent = async () => {
    try {
      const [imgs, curr] = await Promise.all([
        getScanImages(),
        getCurrentScanningImage(),
      ]);
      setScanImages(Array.isArray(imgs) ? imgs : []);
      setCurrentScanning(curr.current);
    } catch {
      setScanImages([]);
    }
  };

  useEffect(() => {
    if (autoScanStatus === "Auto scan ON") {
      fetchScanImagesAndCurrent();
      const interval = setInterval(fetchScanImagesAndCurrent, 3000);
      return () => clearInterval(interval);
    }
  }, [autoScanStatus]);



  const handleUpdateInterval = () => {
    setIntervalLoading(true);
    axiosClient.post("/ocr/auto-scan/interval", { intervalMs: scanInterval })
      .then(() => message.success("Cập nhật thời gian quét thành công!"))
      .catch(() => message.error("Cập nhật thất bại!"))
      .finally(() => setIntervalLoading(false));
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220} style={{ background: "#fff" }}>
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
              <PageHeader title="Quản lý chỉ số điện" style={{ margin: 0, padding: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Popover
                  content={filterContent}
                  title={null}
                  trigger="click"
                  open={filterVisible}
                  onOpenChange={setFilterVisible}
                  placement="bottomRight"
                >
                  <Button icon={<FilterOutlined />} type="default">Bộ lọc</Button>
                </Popover>
                <Button onClick={() => openLogModal(null)} type="default">
                  Xem tất cả lịch sử quét
                </Button>
              </div>
            </div>
            
            {/* Controls Section */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderTop: '1px solid #f0f0f0',
              paddingTop: 12,
              flexWrap: 'wrap',
              gap: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 500 }}>Auto Scan:</span>
                <Button
                  loading={autoScanLoading}
                  type={autoScanStatus === "Auto scan ON" ? "primary" : "default"}
                  onClick={() => handleToggleAutoScan(autoScanStatus !== "Auto scan ON")}
                >
                  {autoScanStatus === "Auto scan ON" ? "Tắt" : "Bật"}
                </Button>
                <span style={{ 
                  padding: '4px 8px', 
                  borderRadius: 4, 
                  background: autoScanStatus === "Auto scan ON" ? '#f6ffed' : '#fff2f0',
                  color: autoScanStatus === "Auto scan ON" ? '#52c41a' : '#ff4d4f',
                  fontSize: 12,
                  fontWeight: 500
                }}>
                  {autoScanStatus}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ fontWeight: 500 }}>
                  Thời gian quét tự động:
                  <Input
                    type="number"
                    min={1000}
                    value={scanInterval}
                    onChange={e => setScanInterval(Number(e.target.value))}
                    style={{ width: 100, marginLeft: 8 }}
                    suffix="ms"
                  />
                </label>
                <Button
                  type="primary"
                  onClick={handleUpdateInterval}
                  loading={intervalLoading}
                  size="small"
                >
                  Cập nhật
                </Button>
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
            <ElectricTable
              dataSource={pagedData}
              currentPage={currentPage}
              pageSize={pageSize}
              total={electricData.length}
              onPageChange={(page) => setCurrentPage(page)}
              loading={loading}
              onReload={reloadElectricData}
              onShowLog={openLogModal}
            />
          </div>
        </Content>
      </Layout>
      <Modal
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        title={`📊 Lịch sử quét chỉ số điện tự động${logRoomId ? ` - Phòng ${roomList.find(r => r.id === logRoomId)?.roomNumber || logRoomId}` : ''}`}
        footer={null}
        width={1000}
        style={{ top: 20 }}
      >
        <Table
          columns={logColumns}
          dataSource={scanLogs}
          rowKey="id"
          loading={logLoading}
          pagination={{
            current: logPage,
            pageSize: logPageSize,
            total: logTotal,
            onChange: (page) => fetchScanLogs(page, logRoomId),
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} mục`
          }}
          scroll={{ x: 800 }}
          size="small"
        />
      </Modal>
    </Layout>
  );
}
