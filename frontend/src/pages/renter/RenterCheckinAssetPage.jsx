import React, { useEffect, useState } from "react";
import { Card, Table, Button, Input, Tag, Typography, message, Spin, Space, Select, Checkbox, Image } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, FileDoneOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import RenterSidebar from "../../components/layout/RenterSidebar";
import { useLocation, useNavigate } from "react-router-dom";
import axiosClient from "../../services/axiosClient";
import { getAssetInventoryByRoomAndContract, uploadAssetInventoryPhoto } from '../../services/assetApi';
import CameraCapture from '../../components/common/CameraCapture';
import { CameraOutlined, UploadOutlined } from '@ant-design/icons';

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
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [notes, setNotes] = useState({});
  const [actualStatusState, setActualStatusState] = useState({});
  const [enoughState, setEnoughState] = useState({});
  const [checkedAssets, setCheckedAssets] = useState({}); // assetId: true nếu đã checkin
  const [assetPhotos, setAssetPhotos] = useState({}); // assetId -> [urls]
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
          const savedPhotos = {};
          (historyRes.data || []).forEach(item => {
            if (item.type === 'CHECKIN') {
              checked[item.assetId] = true;
              if (item.photoUrls) {
                savedPhotos[item.assetId] = item.photoUrls.split(',').filter(url => url.trim());
              }
            }
          });
          setCheckedAssets(checked);
          setAssetPhotos(prev => ({ ...prev, ...savedPhotos }));
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
          const savedPhotos = {};
          (historyRes.data || []).forEach(item => {
            if (item.type === 'CHECKIN') {
              checked[item.assetId] = true;
              if (item.photoUrls) {
                savedPhotos[item.assetId] = item.photoUrls.split(',').filter(url => url.trim());
              }
            }
          });
          setCheckedAssets(checked);
          setAssetPhotos(prev => ({ ...prev, ...savedPhotos }));
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
    
    // Lấy các asset chưa kiểm kê
    const pendingAssets = assets.filter(asset => !checkedAssets[asset.assetId || asset.id]);
    
    // Bắt buộc chọn tình trạng cho tất cả tài sản chưa kiểm kê
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
    
    // THAY ĐỔI: Chỉ cho phép lưu khi đã chọn trạng thái cho TẤT CẢ asset (kể cả chưa kiểm kê)
    const allAssetsWithoutStatus = assets.filter(a => {
      const id = a.assetId || a.id;
      const selected = actualStatusState[id] || a.status;
      return !selected || String(selected).trim() === "";
    });
    if (allAssetsWithoutStatus.length > 0) {
      message.error(`Vui lòng chọn tình trạng cho tất cả ${assets.length} tài sản trước khi xác nhận!`);
      setConfirming(false);
      return;
    }
    
    // Gửi asset chưa kiểm kê
    const result = pendingAssets.map(asset => ({
      assetId: asset.assetId || asset.id,
      contractId,
      roomId,
      roomNumber,
      status: actualStatusState[asset.assetId || asset.id] || asset.status,
      isEnough: enoughState[asset.assetId || asset.id] !== undefined ? enoughState[asset.assetId || asset.id] : true,
      note: notes[asset.assetId || asset.id] || "", // Chỉ dùng note kiểm kê, không dùng note gốc
      type: "CHECKIN",
      photoUrls: assetPhotos[asset.assetId || asset.id] || []
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

  const fileInputRef = React.useRef(null);
  const [currentAssetForPhoto, setCurrentAssetForPhoto] = useState(null);

  const handleUploadPhoto = async (assetId, file) => {
    try {
      const res = await uploadAssetInventoryPhoto(file);
      const url = res?.data || res;
      setAssetPhotos(prev => ({
        ...prev,
        [assetId]: [ ...(prev[assetId] || []), url ]
      }));
      message.success('Tải ảnh thành công');
    } catch (e) {
      message.error('Tải ảnh thất bại');
    }
  };

  const handleCapture = async (assetId, file) => {
    await handleUploadPhoto(assetId, file);
  };

  const cameraRefs = React.useRef({}).current;

  const openCameraFor = (assetId) => {
    cameraRefs[assetId]?.openModal?.();
  };

  const handleChooseUpload = (assetId) => {
    setCurrentAssetForPhoto(assetId);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || currentAssetForPhoto == null) return;
    
    // Kiểm tra định dạng file
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Chỉ có thể tải lên file ảnh!');
      e.target.value = '';
      return;
    }
    
    // Kiểm tra kích thước file (2MB)
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('Ảnh phải nhỏ hơn 2MB!');
      e.target.value = '';
      return;
    }
    
    await handleUploadPhoto(currentAssetForPhoto, file);
    e.target.value = '';
  };

  const columns = [
    {
      title: "Tên tài sản",
      dataIndex: "assetName",
      key: "assetName",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Ảnh minh chứng",
      key: "photos",
      render: (_, record) => {
        const id = record.assetId || record.id;
        const urls = assetPhotos[id] || [];
        const isChecked = checkedAssets[id];
        
        if (isChecked && urls.length > 0) {
          // Đã lưu và có ảnh -> chỉ hiển thị ảnh
          return (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {urls.map((u, idx)=> (
                <Image key={idx} src={u} width={60} height={60} style={{ objectFit:'cover' }} />
              ))}
            </div>
          );
        } else if (isChecked) {
          // Đã lưu nhưng không có ảnh
          return <span style={{ color: "#aaa" }}>Không có ảnh minh chứng</span>;
        } else {
          // Chưa lưu -> hiển thị nút upload và ảnh đã chọn
          return (
            <Space direction="vertical">
              <Space wrap>
                <Button size="small" icon={<CameraOutlined />} onClick={() => openCameraFor(id)}>
                  Chụp ảnh
                </Button>
                <Button size="small" icon={<UploadOutlined />} onClick={() => handleChooseUpload(id)}>
                  Tải ảnh
                </Button>
                <CameraCapture ref={(el)=> cameraRefs[id]=el} onCapture={(file)=>handleCapture(id, file)} hideButton />
                <input type="file" accept="image/*" style={{ display:'none' }} ref={fileInputRef} onChange={onFileSelected} />
              </Space>
              {urls.length > 0 && (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {urls.map((u, idx)=> (
                    <Image key={idx} src={u} width={60} height={60} style={{ objectFit:'cover' }} />
                  ))}
                </div>
              )}
            </Space>
          );
        }
      }
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
      title: "Ghi chú gốc",
      dataIndex: "note",
      key: "originalNote",
      width: 150,
      render: (note) => (
        <span style={{ color: "#666", fontSize: "12px" }}>
          {note || "Không có ghi chú"}
        </span>
      ),
    },
    {
      title: "Ghi chú kiểm kê",
      key: "checkNote",
      width: 200,
      render: (_, record) => {
        const id = record.assetId || record.id;
        const isChecked = checkedAssets[id];
        return (
          <Input.TextArea
            placeholder="Ghi chú tình trạng khi nhận phòng..."
            value={notes[id] || ""}
            onChange={(e) => handleNoteChange(id, e.target.value)}
            disabled={isChecked}
            autoSize={{ minRows: 2, maxRows: 4 }}
            style={{ fontSize: "12px" }}
          />
        );
      },
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
      <div style={{ flex: 1, marginLeft: !isMobile ? 220 : 0, padding: isMobile ? 8 : 24, minHeight: "100vh" }}>
        <div style={{ width: "100%", maxWidth: 1400, margin: "0 auto" }}>
          {/* Header với nút Back */}
          <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate(-1)}
              size={isMobile ? "middle" : "large"}
              style={{ 
                borderRadius: 8,
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}
            >
              Quay lại
            </Button>
            <div>
              <Title level={2} style={{ color: "#1890ff", fontSize: isMobile ? 22 : 28, margin: 0 }}>
                <FileDoneOutlined style={{ marginRight: 8 }} />
                Kiểm kê tài sản nhận phòng
              </Title>
              <Text type="secondary" style={{ fontSize: isMobile ? 13 : 16 }}>
                Vui lòng kiểm tra và xác nhận tình trạng từng tài sản khi bạn nhận phòng.
              </Text>
            </div>
          </div>
          
          <Card style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <div style={{ margin: isMobile ? "12px 0" : "24px 0", overflowX: "auto" }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: 48 }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 16, color: "#666" }}>Đang tải dữ liệu...</div>
                </div>
              ) : assets.length === 0 ? (
                <div style={{ 
                  color: '#888', 
                  textAlign: 'center', 
                  padding: 48,
                  background: "#fafafa",
                  borderRadius: 8,
                  border: "1px dashed #d9d9d9"
                }}>
                  <FileDoneOutlined style={{ fontSize: 48, color: "#d9d9d9", marginBottom: 16 }} />
                  <div>Không có tài sản nào trong phòng.</div>
                </div>
              ) : (
                <Table
                  columns={columns}
                  dataSource={assets}
                  rowKey="id"
                  pagination={false}
                  bordered
                  size={isMobile ? "small" : "middle"}
                  scroll={{ x: 1200 }}
                  style={{ 
                    background: "white",
                    borderRadius: 8
                  }}
                />
              )}
            </div>
            
            {assets.length > 0 && (
              <div style={{ 
                borderTop: "1px solid #f0f0f0", 
                paddingTop: 16, 
                marginTop: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16
              }}>
                <div style={{ color: "#666", fontSize: "14px" }}>
                  Tổng số tài sản: <strong>{assets.length}</strong> | 
                  Đã kiểm kê: <strong>{Object.keys(checkedAssets).filter(id => checkedAssets[id]).length}</strong> | 
                  Chưa kiểm kê: <strong>{assets.length - Object.keys(checkedAssets).filter(id => checkedAssets[id]).length}</strong>
                </div>
                <Space>
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate(-1)}
                    size={isMobile ? "middle" : "large"}
                  >
                    Quay lại
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    loading={confirming}
                    onClick={handleConfirm}
                    size={isMobile ? "middle" : "large"}
                    style={{
                      background: "#52c41a",
                      borderColor: "#52c41a",
                      boxShadow: "0 2px 4px rgba(82, 196, 26, 0.3)"
                    }}
                  >
                    Xác nhận kiểm kê
                  </Button>
                </Space>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
} 