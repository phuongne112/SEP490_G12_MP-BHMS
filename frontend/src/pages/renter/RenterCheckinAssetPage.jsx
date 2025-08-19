import React, { useEffect, useState } from "react";
import { Card, Table, Button, Input, Tag, Typography, message, Spin, Space, Select, Checkbox } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, FileDoneOutlined } from "@ant-design/icons";
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

export default function RenterCheckinAssetPage() {
  const isMobile = useIsMobile();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [notes, setNotes] = useState({});
  const [actualStatusState, setActualStatusState] = useState({});
  const [enoughState, setEnoughState] = useState({});
  const [checkedAssets, setCheckedAssets] = useState({}); // assetId: true nếu đã checkin
  const location = useLocation();

  useEffect(() => {
    const roomId = location.state?.roomId;
    const roomNumber = location.state?.roomNumber;
    const contractId = Number(location.state?.contractId) || null;
    if (roomId) {
      setLoading(true);
      import('../../services/assetApi').then(async ({ getAssetsByRoom }) => {
        const res = await getAssetsByRoom(roomId);
        const assets = res.data || [];
        setAssets(assets);
        // Fetch lịch sử kiểm kê
        if (contractId && roomNumber) {
          const historyRes = await getAssetInventoryByRoomAndContract(roomNumber, contractId);
          const checked = {};
          (historyRes.data || []).forEach(item => {
            if (item.type === 'CHECKIN') checked[item.assetId] = true;
          });
          setCheckedAssets(checked);
        }
        setLoading(false);
      });
    } else if (roomNumber) {
      setLoading(true);
      import('../../services/assetApi').then(async ({ getAssetsByRoomNumber }) => {
        const res = await getAssetsByRoomNumber(roomNumber);
        const assets = res.data || [];
        setAssets(assets);
        // Fetch lịch sử kiểm kê
        if (contractId && roomNumber) {
          const historyRes = await getAssetInventoryByRoomAndContract(roomNumber, contractId);
          const checked = {};
          (historyRes.data || []).forEach(item => {
            if (item.type === 'CHECKIN') checked[item.assetId] = true;
          });
          setCheckedAssets(checked);
        }
        setLoading(false);
      });
    } else {
      setAssets([]);
      setLoading(false);
    }
  }, [location.state]);

  const statusOptions = [
    { label: "Tốt", value: "Tốt" },
    { label: "Hư hỏng", value: "Hư hỏng" },
    { label: "Mất", value: "Mất" },
    { label: "Bảo trì", value: "Bảo trì" },
  ];

  const handleActualStatusChange = (id, value) => {
    setActualStatusState((prev) => ({ ...prev, [id]: value }));
  };
  const handleEnoughChange = (id, checked) => {
    setEnoughState((prev) => ({ ...prev, [id]: checked }));
  };

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const handleConfirm = async () => {
    setConfirming(true);
    const contractId = Number(location.state?.contractId) || null;
    const roomId = location.state?.roomId || null;
    const roomNumber = location.state?.roomNumber || null;
    // Bắt buộc chọn tình trạng cho tất cả tài sản chưa kiểm kê
    const pendingAssets = assets.filter(asset => !checkedAssets[asset.assetId || asset.id]);
    const missingStatus = pendingAssets.filter(a => {
      const id = a.assetId || a.id;
      const selected = actualStatusState[id] || a.status;
      return !selected || String(selected).trim() === "";
    });
    if (missingStatus.length > 0) {
      message.error("Vui lòng chọn tình trạng cho tất cả tài sản trước khi xác nhận!");
      setConfirming(false);
      return;
    }
    // Chỉ gửi asset chưa checkin
    const result = pendingAssets.map(asset => ({
      assetId: asset.assetId || asset.id,
      contractId,
      roomId,
      roomNumber,
      status: actualStatusState[asset.assetId || asset.id] || asset.status,
      isEnough: enoughState[asset.assetId || asset.id] !== undefined ? enoughState[asset.assetId || asset.id] : true,
      note: notes[asset.assetId || asset.id] !== undefined ? notes[asset.assetId || asset.id] : asset.note || "",
      type: "CHECKIN"
    }));
    if (result.length === 0) {
      message.info("Tất cả tài sản đã được kiểm kê!");
      setConfirming(false);
      return;
    }
    try {
      await axiosClient.post('/asset-inventory/checkin', result);
      message.success("Đã lưu kiểm kê tài sản thành công!");
      // Cập nhật lại checkedAssets
      const newChecked = { ...checkedAssets };
      result.forEach(a => { newChecked[a.assetId] = true; });
      setCheckedAssets(newChecked);
    } catch (err) {
      if (err.response?.data?.message?.includes('đã được kiểm kê')) {
        message.error("Có tài sản đã được kiểm kê, vui lòng tải lại trang!");
      } else {
        message.error("Lỗi khi lưu kiểm kê tài sản!");
      }
    }
    setConfirming(false);
  };

  const columns = [
    {
      title: "Tên tài sản",
      dataIndex: "assetName",
      key: "assetName",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
    },
    {
      title: "Tình trạng",
      dataIndex: "status",
      key: "status",
      render: (_, record) => (
        <Select
          value={actualStatusState[record.id] || record.status}
          options={statusOptions}
          onChange={val => handleActualStatusChange(record.id, val)}
          style={{ width: 120 }}
          disabled={checkedAssets[record.assetId || record.id]}
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
          disabled={checkedAssets[record.assetId || record.id]}
        >
          Đủ
        </Checkbox>
      ),
    },
    {
      title: "Hình ảnh",
      dataIndex: "assetImage",
      key: "assetImage",
      width: 120,
      render: (_, record) => {
        const isDev = import.meta.env.DEV;
        const BACKEND_URL = isDev
          ? (import.meta.env.VITE_BACKEND_URL || "http://52.184.69.15")
          : (typeof window !== "undefined" ? window.location.origin : "");
        const url = record.assetImage
          ? (record.assetImage.startsWith("http")
              ? record.assetImage
              : `${BACKEND_URL}${record.assetImage.startsWith("/") ? "" : "/"}${record.assetImage}`)
          : null;
        return url ? (
          <img
            src={url}
            alt={record.assetName}
            style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6 }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <span style={{ color: "#aaa" }}>Không có ảnh</span>
        );
      },
    },
    {
      title: "Trạng thái kiểm kê",
      key: "checked",
      render: (_, record) => checkedAssets[record.assetId || record.id] ? <Tag color="green">Đã kiểm kê</Tag> : <Tag color="red">Chưa kiểm kê</Tag>
    }
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
              Kiểm kê tài sản nhận phòng
            </Title>
            <Text type="secondary" style={{ fontSize: isMobile ? 13 : 16 }}>
              Vui lòng kiểm tra và xác nhận tình trạng từng tài sản khi bạn nhận phòng.
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