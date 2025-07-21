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
  const [scanFolder, setScanFolderState] = useState("");
  const [scanFolderInput, setScanFolderInput] = useState("");
  const [scanFolderLoading, setScanFolderLoading] = useState(false);
  const [scanImages, setScanImages] = useState([]);
  const [currentScanning, setCurrentScanning] = useState("");
  const [localImages, setLocalImages] = useState([]);
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

  // Hàm lưu scanFolder cho từng phòng
  const handleSaveScanFolder = async (roomId, folder) => {
    try {
      await axiosClient.patch(`/rooms/${roomId}/scan-folder`, { scanFolder: folder });
      message.success("Đã lưu thư mục quét!");
      // Reload lại danh sách phòng để cập nhật UI
      const res = await getRoomsWithElectricReadings();
      setRoomList(res || []);
      reloadElectricData();
    } catch {
      message.error("Lưu thư mục thất bại!");
    }
  };

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

  const handleImageInput = (event) => {
    const files = Array.from(event.target.files);
    setLocalImages(prev => [...prev, ...files]);
    event.target.value = ''; // Clear the input value to allow selecting the same file again
  };

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
        <Content style={{ margin: "24px 16px 0" }}>
          <PageHeader title="Quản lý chỉ số điện" />
          {/* Thêm UI điều chỉnh interval */}
          <div style={{ marginBottom: 16, background: '#f6f6f6', padding: 12, borderRadius: 8 }}>
            <label>
              Thời gian quét tự động (ms):
              <Input
                type="number"
                min={1000}
                value={scanInterval}
                onChange={e => setScanInterval(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </label>
            <Button
              type="primary"
              onClick={handleUpdateInterval}
              loading={intervalLoading}
              style={{ marginLeft: 12 }}
            >
              Cập nhật
            </Button>
          </div>
          <Row gutter={16} style={{ marginBottom: 20 }}>
        
            {/* Xóa toàn bộ phần UI chọn thư mục quét hiện tại (input chọn ảnh, nút Lưu) phía trên bảng */}
            <Col>
              <Popover
                content={filterContent}
                title={null}
                trigger="click"
                open={filterVisible}
                onOpenChange={setFilterVisible}
                placement="bottomRight"
              >
                <Button icon={<FilterOutlined />}>Bộ lọc</Button>
              </Popover>
            </Col>
            <Col>
              <Button type="primary" onClick={handleSaveBill}>
                Lưu hóa đơn
              </Button>
            </Col>
            <Col>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>Auto Scan:</span>
                <Button
                  loading={autoScanLoading}
                  type={autoScanStatus === "Auto scan ON" ? "primary" : "default"}
                  onClick={() => handleToggleAutoScan(autoScanStatus !== "Auto scan ON")}
                >
                  {autoScanStatus === "Auto scan ON" ? "Tắt" : "Bật"}
                </Button>
                <Button onClick={() => openLogModal(null)} type="default">Xem tất cả lịch sử quét</Button>
              </div>
            </Col>
          </Row>
          <ElectricTable
            dataSource={pagedData}
            currentPage={currentPage}
            pageSize={pageSize}
            total={electricData.length}
            onPageChange={(page) => setCurrentPage(page)}
            loading={loading}
            onReload={reloadElectricData}
            onShowLog={openLogModal}
            onSaveScanFolder={handleSaveScanFolder}
          />
        </Content>
      </Layout>
      <Modal
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        title={`Lịch sử quét chỉ số điện tự động${logRoomId ? ` - Phòng ${roomList.find(r => r.id === logRoomId)?.roomNumber || logRoomId}` : ''}`}
        footer={null}
        width={800}
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
          }}
        />
      </Modal>
    </Layout>
  );
}
