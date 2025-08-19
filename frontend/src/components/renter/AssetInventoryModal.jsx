import React, { useEffect, useState } from "react";
import { Modal, Table, Button, Input, Tag, Typography, message, Spin, Space, Select, Checkbox, Image } from "antd";
import { CheckCircleOutlined, FileDoneOutlined, UploadOutlined } from "@ant-design/icons";
import axiosClient from "../../services/axiosClient";
import { getAssetInventoryByRoomAndContract, uploadAssetInventoryPhoto } from '../../services/assetApi';

const { Title, Text } = Typography;

export default function AssetInventoryModal({ 
  open, 
  onCancel, 
  roomId, 
  roomNumber, 
  contractId, 
  type = "CHECKIN", // "CHECKIN" hoặc "CHECKOUT"
  onSuccess 
}) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notes, setNotes] = useState({});
  const [actualStatusState, setActualStatusState] = useState({});
  const [enoughState, setEnoughState] = useState({});
  const [checkedAssets, setCheckedAssets] = useState({});
  const [assetPhotos, setAssetPhotos] = useState({});

  const fileInputRef = React.useRef(null);
  const [currentAssetForPhoto, setCurrentAssetForPhoto] = useState(null);

  const statusOptions = [
    { label: "Tốt", value: "Tốt" },
    { label: "Hư hỏng", value: "Hư hỏng" },
    { label: "Mất", value: "Mất" },
    { label: "Bảo trì", value: "Bảo trì" },
  ];

  // Fetch assets when modal opens
  useEffect(() => {
    if (open && (roomId || roomNumber)) {
      fetchAssets();
    }
  }, [open, roomId, roomNumber, contractId]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = roomId 
        ? await import('../../services/assetApi').then(({ getAssetsByRoom }) => getAssetsByRoom(roomId))
        : await import('../../services/assetApi').then(({ getAssetsByRoomNumber }) => getAssetsByRoomNumber(roomNumber));
      
      const assets = res.data || [];
      setAssets(assets);

      // Fetch lịch sử kiểm kê
      if (contractId && roomNumber) {
        const historyRes = await getAssetInventoryByRoomAndContract(roomNumber, contractId);
        const checked = {};
        const savedPhotos = {};
        (historyRes.data || []).forEach(item => {
          if (item.type === type) {
            checked[item.assetId] = true;
            if (item.photoUrls) {
              savedPhotos[item.assetId] = item.photoUrls.split(',').filter(url => url.trim());
            }
          }
        });
        setCheckedAssets(checked);
        setAssetPhotos(prev => ({ ...prev, ...savedPhotos }));
      }
    } catch (error) {
      message.error("Không thể tải danh sách tài sản");
    }
    setLoading(false);
  };

  const handleActualStatusChange = (id, value) => {
    setActualStatusState((prev) => ({ ...prev, [id]: value }));
  };

  const handleEnoughChange = (id, checked) => {
    setEnoughState((prev) => ({ ...prev, [id]: checked }));
  };

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

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

  // Loại bỏ chức năng chụp ảnh; chỉ hỗ trợ tải ảnh từ thiết bị

  const handleChooseUpload = (assetId) => {
    setCurrentAssetForPhoto(assetId);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || currentAssetForPhoto == null) return;
    await handleUploadPhoto(currentAssetForPhoto, file);
    e.target.value = '';
  };

  const handleConfirm = async () => {
    setConfirming(true);
    
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
      type: type,
      photoUrls: assetPhotos[asset.assetId || asset.id] || []
    }));
    
    if (result.length === 0) {
      message.info(`Tất cả tài sản đã được kiểm kê ${type === 'CHECKIN' ? 'nhận phòng' : 'trả phòng'}!`);
      setConfirming(false);
      return;
    }

    try {
      await axiosClient.post('/asset-inventory/checkin', result);
      message.success(`Đã lưu kiểm kê tài sản ${type === 'CHECKIN' ? 'nhận phòng' : 'trả phòng'} thành công!`);
      
      // Cập nhật lại checkedAssets
      const newChecked = { ...checkedAssets };
      result.forEach(a => { newChecked[a.assetId] = true; });
      setCheckedAssets(newChecked);
      
      onSuccess?.();
    } catch (err) {
      if (err.response?.data?.message?.includes('đã được kiểm kê')) {
        message.error(`Có tài sản đã được kiểm kê ${type === 'CHECKIN' ? 'nhận phòng' : 'trả phòng'}, vui lòng tải lại!`);
      } else {
        message.error(`Lỗi khi lưu kiểm kê tài sản ${type === 'CHECKIN' ? 'nhận phòng' : 'trả phòng'}!`);
      }
    }
    setConfirming(false);
  };

  const columns = [
    {
      title: "Tên tài sản",
      dataIndex: "assetName",
      key: "assetName",
      width: 180,
      render: (text) => <Text strong style={{ fontSize: "14px" }}>{text}</Text>,
    },
    {
      title: "Hình ảnh tài sản",
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
          <Image
            src={url}
            alt={record.assetName}
            width={80}
            height={60}
            style={{ objectFit: "cover", borderRadius: 6, border: "1px solid #f0f0f0" }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnH8W+Qjw5GkU2SDQCMJEcOHDhw4MCJAycOHThw4sCJAwdOHDhw4sCJAwcOHDhw4sCJAwcOHFhw4MCBAwcOHDigAycOHDhw4sCBAwcOHDhw4MC5AwcOHDhw4sCJAwcOHD/9H81L6"
          />
        ) : (
          <div style={{ 
            width: 80, 
            height: 60, 
            background: "#f5f5f5", 
            border: "1px dashed #d9d9d9",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#999",
            fontSize: "10px"
          }}>
            Không có ảnh
          </div>
        );
      },
    },
    {
      title: "Ảnh minh chứng",
      key: "photos",
      width: 240,
      render: (_, record) => {
        const id = record.assetId || record.id;
        const urls = assetPhotos[id] || [];
        const isChecked = checkedAssets[id];
        
        if (isChecked && urls.length > 0) {
          return (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
              {urls.map((u, idx)=> (
                <Image key={idx} src={u} width={60} height={45} style={{ objectFit:'cover', borderRadius: 4, border: "1px solid #f0f0f0" }} />
              ))}
            </div>
          );
        } else if (isChecked) {
          return <span style={{ color: "#aaa", fontSize: "12px" }}>Không có ảnh minh chứng</span>;
        } else {
          return (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <Space direction="vertical" size="small" style={{ alignItems:'center' }}>
                <Space wrap size="small" style={{ justifyContent:'center' }}>
                  <Button size="small" type="dashed" icon={<UploadOutlined />} onClick={() => handleChooseUpload(id)}>
                    Tải ảnh
                  </Button>
                  <input type="file" accept="image/*" style={{ display:'none' }} ref={fileInputRef} onChange={onFileSelected} />
                </Space>
                {urls.length > 0 && (
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'center' }}>
                    {urls.map((u, idx)=> (
                      <Image key={idx} src={u} width={60} height={45} style={{ objectFit:'cover', borderRadius: 4, border: "1px solid #f0f0f0" }} />
                    ))}
                  </div>
                )}
              </Space>
            </div>
          );
        }
      }
    },
    {
      title: "SL",
      dataIndex: "quantity",
      key: "quantity",
      width: 60,
      align: "center",
      render: (qty) => <Text strong>{qty}</Text>
    },
    {
      title: "Tình trạng",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (_, record) => (
        <Select
          value={actualStatusState[record.id] || record.status}
          options={statusOptions}
          onChange={val => handleActualStatusChange(record.id, val)}
          style={{ width: "100%" }}
          disabled={checkedAssets[record.assetId || record.id]}
          size="small"
        />
      ),
    },
    {
      title: "Đủ/Thiếu",
      dataIndex: "isEnough",
      key: "isEnough",
      width: 90,
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
      width: 140,
      render: (note) => (
        <Text style={{ color: "#666", fontSize: "12px" }} ellipsis={{ tooltip: true }}>
          {note || "Không có ghi chú"}
        </Text>
      ),
    },
    {
      title: "Ghi chú kiểm kê",
      key: "checkNote",
      width: 160,
      render: (_, record) => {
        const id = record.assetId || record.id;
        const isChecked = checkedAssets[id];
        return (
          <Input.TextArea
            placeholder={`Ghi chú tình trạng khi ${type === 'CHECKIN' ? 'nhận' : 'trả'} phòng...`}
            value={notes[id] || ""}
            onChange={(e) => handleNoteChange(id, e.target.value)}
            disabled={isChecked}
            autoSize={{ minRows: 1, maxRows: 2 }}
            style={{ fontSize: "12px" }}
          />
        );
      },
    },
    {
      title: "Trạng thái",
      key: "checked",
      width: 110,
      render: (_, record) => checkedAssets[record.assetId || record.id] ? 
        <Tag color="green" style={{ fontSize: "11px" }}>Đã kiểm kê</Tag> : 
        <Tag color="orange" style={{ fontSize: "11px" }}>Chưa kiểm kê</Tag>
    }
  ];

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileDoneOutlined style={{ color: "#1890ff" }} />
          <span>Kiểm kê tài sản {type === 'CHECKIN' ? 'nhận phòng' : 'trả phòng'}</span>
        </div>
      }
      width="95%"
      style={{ maxWidth: 1400 }}
      centered
      footer={null}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Vui lòng kiểm tra và xác nhận tình trạng từng tài sản khi bạn {type === 'CHECKIN' ? 'nhận' : 'trả'} phòng.
        </Text>
      </div>

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
        <>
          <Table
            columns={columns}
            dataSource={assets}
            rowKey="id"
            pagination={false}
            bordered
            size="small"
            scroll={{ x: 1100, y: 400 }}
            style={{ 
              background: "white",
              borderRadius: 8,
              marginBottom: 16
            }}
          />
          
          <div style={{ 
            borderTop: "1px solid #f0f0f0", 
            paddingTop: 16,
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
              <Button onClick={onCancel}>
                Hủy
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={confirming}
                onClick={handleConfirm}
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
        </>
      )}
    </Modal>
  );
}
