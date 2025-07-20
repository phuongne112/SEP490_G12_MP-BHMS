import React, { useState, useEffect } from "react";
import { Layout, Row, Col, DatePicker, Select, Button, Popover, message, Modal, Table, Input, Space } from "antd";
import dayjs from "dayjs";
import PageHeader from "../../components/common/PageHeader";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import ElectricTable from "../../components/landlord/ElectricTable";
import { getElectricReadings } from "../../services/electricReadingApi";
import { getRoomsWithElectricReadings } from "../../services/roomService";
import { FilterOutlined } from "@ant-design/icons";
import { enableAutoScan, disableAutoScan, getAutoScanStatus, getScanLogs, getScanFolder, setScanFolder, getScanImages, getCurrentScanningImage } from "../../services/electricReadingApi";
import { FolderOpenOutlined } from "@ant-design/icons";

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

  useEffect(() => {
    const fetchRooms = async () => {
      const res = await getRoomsWithElectricReadings();
      setRoomList(res || []);
    };
    fetchRooms();
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

  const fetchScanLogs = async (page = 1) => {
    setLogLoading(true);
    try {
      const res = await getScanLogs({ page: page - 1, size: logPageSize });
      setScanLogs(res.content || []);
      setLogTotal(res.totalElements || 0);
      setLogPage(page);
    } catch {
      setScanLogs([]);
    }
    setLogLoading(false);
  };

  const openLogModal = () => {
    fetchScanLogs(1);
    setLogModalVisible(true);
  };

  const logColumns = [
    { title: "File", dataIndex: "fileName", key: "fileName" },
    { title: "Phòng", dataIndex: "roomId", key: "roomId" },
    { title: "Kết quả", dataIndex: "result", key: "result", render: (text) => text || "-" },
    { title: "Thời gian", dataIndex: "scanTime", key: "scanTime", render: (t) => t ? new Date(t).toLocaleString() : "-" },
    { title: "Lỗi", dataIndex: "errorMessage", key: "errorMessage", render: (text) => text ? <span style={{ color: 'red' }}>{text}</span> : "-" },
  ];

  useEffect(() => {
    let interval = null;
    if (autoScanStatus === "Auto scan ON") {
      interval = setInterval(() => {
        reloadElectricData();
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line
  }, [autoScanStatus]);

  const fetchScanFolder = async () => {
    try {
      const res = await getScanFolder();
      setScanFolderState(res.scanFolder || "");
      setScanFolderInput(res.scanFolder || "");
    } catch {}
  };
  useEffect(() => {
    fetchScanFolder();
  }, []);

  const handleSaveScanFolder = async () => {
    setScanFolderLoading(true);
    try {
      await setScanFolder(scanFolderInput);
      setScanFolderState(scanFolderInput);
      message.success("Đã cập nhật thư mục quét!");
    } catch {
      message.error("Cập nhật thư mục thất bại!");
    }
    setScanFolderLoading(false);
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

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220} style={{ background: "#001529" }}>
        <LandlordSidebar />
      </Sider>

      <Layout style={{ marginTop: 20, marginLeft: 20 }}>
        <PageHeader title="Chỉ số điện tổng" />
        <Content style={{ margin: "20px" }}>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col span={24} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", padding: 8, background: "#fafafa", borderRadius: 8 }}>
                {Array.isArray(scanImages) && scanImages.length === 0 ? (
                  <span>Không có ảnh trong thư mục quét.</span>
                ) : (
                  Array.isArray(scanImages) && scanImages.map((img) => (
                    <div key={img} style={{ border: currentScanning === img ? "2px solid #1890ff" : "1px solid #eee", borderRadius: 4, padding: 2, background: currentScanning === img ? "#e6f7ff" : "#fff" }}>
                      <img
                        src={scanFolder + "/" + img}
                        alt={img}
                        style={{ width: 80, height: 80, objectFit: "cover", display: "block" }}
                      />
                      <div style={{ fontSize: 12, textAlign: "center", maxWidth: 80, wordBreak: "break-all" }}>{img}</div>
                      {currentScanning === img && <div style={{ color: "#1890ff", fontWeight: "bold", textAlign: "center" }}>Đang quét</div>}
                    </div>
                  ))
                )}
              </div>
            </Col>
            <Col span={24} style={{ marginBottom: 8 }}>
              <Space>
                <span>Thư mục quét hiện tại:</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="imageInput"
                  onChange={handleImageInput}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: 8,
                    padding: '0 16px',
                    height: 48,
                    minWidth: 340,
                    fontSize: 16,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                  onClick={() => document.getElementById('imageInput').click()}
                >
                  <FolderOpenOutlined style={{ fontSize: 22, color: '#1890ff', marginRight: 12 }} />
                  <span style={{ color: localImages && localImages.length > 0 ? '#222' : '#aaa' }}>
                    {localImages && localImages.length > 0 ? `${localImages.length} ảnh đã chọn` : 'Chọn ảnh...'}
                  </span>
                </div>
                <Button type="primary" loading={scanFolderLoading} onClick={handleSaveScanFolder}>
                  Lưu
                </Button>
              </Space>
            </Col>
            {localImages && localImages.length > 0 && (
              <Col span={24}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
                  {localImages.map((file, idx) => (
                    <div key={file.name + idx} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, width: 180, background: '#fff', position: 'relative' }}>
                      <img src={URL.createObjectURL(file)} alt={file.name} style={{ width: 164, height: 120, objectFit: 'cover', borderRadius: 4 }} />
                      <div style={{ fontSize: 13, marginTop: 4, fontWeight: 500 }}>{file.name}</div>
                    </div>
                  ))}
                </div>
              </Col>
            )}
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
                <span style={{ minWidth: 90 }}>{autoScanStatus}</span>
                <Button onClick={openLogModal}>Lịch sử quét</Button>
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
          />
        </Content>
      </Layout>
      <Modal
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        title="Lịch sử quét chỉ số điện tự động"
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
            onChange: (page) => fetchScanLogs(page),
          }}
        />
      </Modal>
    </Layout>
  );
}
