import React, { useEffect, useState } from "react";
import { Card, Table, Button, Input, Tag, Typography, message, Spin, Space, Select, Checkbox } from "antd";
import { CheckCircleOutlined, FileDoneOutlined } from "@ant-design/icons";
import RenterSidebar from "../../components/layout/RenterSidebar";
import { useLocation } from "react-router-dom";
import axiosClient from "../../services/axiosClient";
import { getAssetInventoryByRoomAndContract } from '../../services/assetApi';

const { Title, Text } = Typography;

// Responsive: Ẩn sidebar trên mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

// Mock data
const mockAssets = [
  {
    id: 1,
    name: "Bed",
    quantity: 2,
    condition: "Good",
    note: "No damage",
  },
  {
    id: 2,
    name: "Desk",
    quantity: 1,
    condition: "Good",
    note: "Slight scratch on surface",
  },
  {
    id: 3,
    name: "Chair",
    quantity: 2,
    condition: "Good",
    note: "",
  },
];

export default function RenterCheckoutAssetPage() {
  const isMobile = useIsMobile();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [notes, setNotes] = useState({});
  const [actualStatusState, setActualStatusState] = useState({});
  const [enoughState, setEnoughState] = useState({});
  const location = useLocation();

  useEffect(() => {
    const roomId = location.state?.roomId;
    const contractId = location.state?.contractId;
    if (roomId && contractId) {
      getAssetInventoryByRoomAndContract(roomId, contractId).then(res => {
        const inventory = res.data || [];
        if (inventory.length > 0) {
          setAssets(inventory.map(item => ({
            id: item.assetId,
            assetName: item.assetName,
            assetStatus: item.status,
            note: item.note,
            ...item
          })));
        } else {
          axiosClient.get(`/assets?roomId=${roomId}`).then(res2 => {
            setAssets(res2.data?.result || []);
          }).catch(() => setAssets([]));
        }
        setLoading(false);
      }).catch(() => {
        axiosClient.get(`/assets?roomId=${roomId}`).then(res2 => {
          setAssets(res2.data?.result || []);
          setLoading(false);
        }).catch(() => {
          setAssets([]);
          setLoading(false);
        });
      });
    } else {
      setAssets([]);
      setLoading(false);
    }
  }, [location.state]);

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const statusOptions = [
    { label: "Tốt", value: "Good" },
    { label: "Hư hỏng", value: "Broken" },
    { label: "Mất", value: "Lost" },
    { label: "Bảo trì", value: "Maintenance" },
  ];
  const handleActualStatusChange = (id, value) => {
    setActualStatusState((prev) => ({ ...prev, [id]: value }));
  };
  const handleEnoughChange = (id, checked) => {
    setEnoughState((prev) => ({ ...prev, [id]: checked }));
  };

  const handleConfirm = async () => {
    setConfirming(true);
    const contractId = Number(location.state?.contractId) || null;
    const roomNumber = location.state?.roomId || "";
    const result = assets.map(asset => ({
      assetId: asset.id,
      contractId,
      roomNumber,
      status: actualStatusState[asset.id] || asset.assetStatus || asset.condition,
      isEnough: enoughState[asset.id] !== undefined ? enoughState[asset.id] : true,
      note: notes[asset.id] !== undefined ? notes[asset.id] : asset.note || "",
      type: "CHECKOUT"
    }));
    try {
      await axiosClient.post('/asset-inventory/checkin', result);
      message.success("Đã lưu kiểm kê tài sản thành công!");
    } catch (err) {
      message.error("Lỗi khi lưu kiểm kê tài sản!");
    }
    setConfirming(false);
  };

  const columns = [
    {
      title: "Tên tài sản",
      dataIndex: "assetName",
      key: "assetName",
      render: (text, record) => <Text strong>{text || record.name}</Text>,
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
    },
    {
      title: "Tình trạng",
      dataIndex: "assetStatus",
      key: "assetStatus",
      align: "center",
      render: (cond, record) => (
        <Tag color={(cond || record.condition) === "Good" ? "green" : "orange"}>{(cond || record.condition) === "Good" ? "Tốt" : "Khác"}</Tag>
      ),
    },
    {
      title: "Trạng thái thực tế",
      dataIndex: "actualStatus",
      key: "actualStatus",
      render: (_, record) => (
        <Select
          value={actualStatusState[record.id] || record.assetStatus || record.condition}
          options={statusOptions}
          onChange={val => handleActualStatusChange(record.id, val)}
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: "Đủ/Thiếu",
      dataIndex: "isEnough",
      key: "isEnough",
      align: "center",
      render: (_, record) => (
        <Checkbox
          checked={enoughState[record.id] !== undefined ? enoughState[record.id] : true}
          onChange={e => handleEnoughChange(record.id, e.target.checked)}
        >
          Đủ
        </Checkbox>
      ),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      render: (_, record) => (
        <Input.TextArea
          value={notes[record.id] !== undefined ? notes[record.id] : record.note}
          onChange={(e) => handleNoteChange(record.id, e.target.value)}
          placeholder="Nhập ghi chú (nếu có)"
          autoSize
        />
      ),
    },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f5" }}>
      {!isMobile && (
        <div style={{ width: 220, minHeight: "100vh", background: "#001529", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 10 }}>
          <RenterSidebar />
        </div>
      )}
      <div style={{ flex: 1, marginLeft: !isMobile ? 220 : 0, padding: isMobile ? 8 : 24, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 900 }}>
          <Card style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <Title level={2} style={{ color: "#1890ff", fontSize: isMobile ? 22 : 28 }}>
              <FileDoneOutlined style={{ marginRight: 8 }} />
              Kiểm kê tài sản trả phòng
            </Title>
            <Text type="secondary" style={{ fontSize: isMobile ? 13 : 16 }}>
              Vui lòng kiểm tra và xác nhận tình trạng từng tài sản khi bạn trả phòng.
            </Text>
            <div style={{ margin: isMobile ? "12px 0" : "24px 0", overflowX: isMobile ? "auto" : "unset" }}>
              {loading ? (
                <Spin size="large" />
              ) : assets.length === 0 ? (
                <div style={{ color: '#888', textAlign: 'center', padding: 24 }}>Không có tài sản nào trong phòng.</div>
              ) : (
                <Table
                  columns={columns}
                  dataSource={assets}
                  rowKey="id"
                  pagination={false}
                  bordered
                  size={isMobile ? "small" : "middle"}
                  scroll={isMobile ? { x: 600 } : undefined}
                />
              )}
            </div>
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={confirming}
                onClick={handleConfirm}
                size={isMobile ? "middle" : "large"}
              >
                Xác nhận kiểm kê
              </Button>
            </Space>
          </Card>
        </div>
      </div>
    </div>
  );
} 