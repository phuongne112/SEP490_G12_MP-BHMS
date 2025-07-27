import React, { useState, useEffect, useRef } from "react";
import { Table, Button, Modal, Upload, message, Input, Switch, InputNumber, Space, Card, Select } from "antd";
import { detectElectricOcr, detectAndSaveElectricOcr, saveElectricReading } from "../../services/electricOcrApi";
import dayjs from "dayjs";
import CameraCapture from "../common/CameraCapture";

const { Option } = Select;

export default function ElectricTable({
  dataSource = [],
  currentPage = 1,
  pageSize = 5,
  total = 0,
  onPageChange = () => {},
  loading = false,
  onReload = () => {},
  onShowLog,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [file, setFile] = useState(null);
  const [ocrResult, setOcrResult] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Auto capture states
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(false);
  const [autoCaptureInterval, setAutoCaptureInterval] = useState(30); // seconds
  const [autoCaptureTargetRoom, setAutoCaptureTargetRoom] = useState(null);
  const [autoCaptureCount, setAutoCaptureCount] = useState(0);
  const [autoCaptureRunning, setAutoCaptureRunning] = useState(false);
  const autoCaptureTimerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCaptureTimerRef.current) {
        clearInterval(autoCaptureTimerRef.current);
      }
    };
  }, []);

  // Auto capture logic
  useEffect(() => {
    if (autoCaptureEnabled && autoCaptureTargetRoom && !autoCaptureRunning) {
      startAutoCapture();
    } else if (!autoCaptureEnabled && autoCaptureRunning) {
      stopAutoCapture();
    }
  }, [autoCaptureEnabled, autoCaptureTargetRoom, autoCaptureRunning]);

  const startAutoCapture = () => {
    if (autoCaptureRunning) return;
    
    setAutoCaptureRunning(true);
    setAutoCaptureCount(0);
    
    message.success(`🤖 Bắt đầu chụp tự động cho phòng ${dataSource.find(r => r.roomId === autoCaptureTargetRoom)?.roomNumber} mỗi ${autoCaptureInterval} giây`);
  };

  const stopAutoCapture = () => {
    if (autoCaptureTimerRef.current) {
      clearInterval(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = null;
    }
    setAutoCaptureRunning(false);
    setAutoCaptureEnabled(false); // Also disable the auto-capture switch
    
    message.info('⏹️ Dừng chụp tự động');
  };

  const handleAutoCapture = async (roomId, capturedFile) => {
    try {
      console.log('🔍 handleAutoCapture called with roomId:', roomId, 'file:', capturedFile);
      
      if (!roomId) {
        console.error('❌ roomId is null or undefined');
        message.error('Vui lòng chọn phòng trước khi chụp tự động!');
        return;
      }
      
      setDetecting(true);
      const res = await detectAndSaveElectricOcr(capturedFile, roomId);
      const detectedValue = res.data.data;
      
      setAutoCaptureCount(prev => prev + 1);
      
      if (detectedValue && detectedValue.match(/^\d{5}(\.\d)?$/)) {
        message.success(`📷 Chụp tự động lần ${autoCaptureCount + 1}: ${detectedValue}`);
        if (onReload) onReload();
      } else {
        message.warning(`📷 Chụp tự động lần ${autoCaptureCount + 1}: Không đọc được chỉ số`);
        if (onReload) onReload();
      }
    } catch (err) {
      console.error("❌ Auto capture error:", err);
      message.error(`Lỗi chụp tự động lần ${autoCaptureCount + 1}: ${err.response?.data?.message || err.message}`);
    } finally {
      setDetecting(false);
    }
  };

  const handleOcrClick = (record) => {
    setSelectedRoom(record);
    setModalOpen(true);
    setFile(null);
    setOcrResult("");
    setInputValue("");
  };

  const handleCameraCapture = async (roomId, capturedFile) => {
    try {
      // Use the new API that combines OCR detection and image saving
      setDetecting(true);
      const res = await detectAndSaveElectricOcr(capturedFile, roomId);
      const detectedValue = res.data.data;
      
      // The new API already saves the reading to database if OCR was successful
      if (detectedValue && detectedValue.match(/^\d{5}(\.\d)?$/)) {
        message.success(`📷 Đã chụp, lưu ảnh và ghi nhận chỉ số điện: ${detectedValue}`);
        if (onReload) onReload();
      } else {
        message.warning("📷 Đã lưu ảnh nhưng không thể đọc được chỉ số từ ảnh, vui lòng kiểm tra lại!");
        // Even if OCR failed, we still reload to show that capture happened
        if (onReload) onReload();
      }
    } catch (err) {
      console.error("Camera capture error:", err);
      message.error("Lỗi khi xử lý ảnh chụp: " + (err.response?.data?.message || err.message));
    } finally {
      setDetecting(false);
    }
  };

  // Only detect, do not save
  const handleDetect = async () => {
    if (!file) {
      message.error("Vui lòng chọn một ảnh!");
      return;
    }
    setDetecting(true);
    try {
      const res = await detectElectricOcr(file);
      setOcrResult(res.data.data);
      setInputValue(res.data.data);
    } catch (err) {
      setOcrResult(err.response?.data?.data || "Lỗi khi quét OCR");
      message.error(err.response?.data?.message || "Lỗi khi quét OCR");
    } finally {
      setDetecting(false);
    }
  };

  // Save to DB
  const handleSaveReading = async () => {
    if (!inputValue) {
      message.error("Vui lòng nhập chỉ số mới!");
      return;
    }
    // Lấy phần số trước dấu chấm
    const valueToSave = inputValue.split(".")[0];
    setSaving(true);
    try {
      await saveElectricReading(selectedRoom.roomId, valueToSave);
      message.success("Đã lưu chỉ số mới!");
      setModalOpen(false);
      setFile(null);
      setOcrResult("");
      setInputValue("");
      if (onReload) onReload();
    } catch (err) {
      message.error("Lỗi khi lưu chỉ số");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: "Phòng", dataIndex: "roomNumber" },
    { title: "Chỉ số cũ", dataIndex: "oldReading" },
    { title: "Chỉ số mới", dataIndex: "newReading" },
    {
      title: "Camera tự động",
      dataIndex: "autoCapture",
      render: (text, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <CameraCapture
            onCapture={(file) => handleCameraCapture(record.roomId, file)}
            buttonText="📷 Chụp tự động"
            disabled={detecting}
            autoMode={true}
          />
          <div style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>
            {record.lastCaptureTime ? 
              `Lần cuối: ${dayjs(record.lastCaptureTime).format("DD/MM HH:mm")}` : 
              "Chưa từng chụp"
            }
          </div>
        </div>
      )
    },
    {
      title: "Ngày ghi",
      dataIndex: "createdDate",
      render: (value) => value ? dayjs(value).format("DD/MM/YYYY HH:mm") : ""
    },
    {
      title: "Thao tác",
      render: (_, record) => (
        <Button onClick={() => handleOcrClick(record)}>Quét chỉ số</Button>
      ),
    },
    {
      title: 'Lịch sử quét',
      key: 'scanLog',
      render: (_, record) => (
        // Nút này sẽ gọi đúng hàm onShowLog với roomId của phòng tương ứng
        <Button onClick={() => onShowLog && onShowLog(record.roomId)} size="small">Lịch sử quét</Button>
      ),
    },
  ];

  return (
    <>
      {/* Auto Capture Control Panel */}
      <Card title="🤖 Auto Capture Control" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Bật chụp tự động:</span>
              <Switch
                checked={autoCaptureEnabled}
                onChange={setAutoCaptureEnabled}
                disabled={autoCaptureRunning}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Phòng:</span>
              <Select
                value={autoCaptureTargetRoom}
                onChange={setAutoCaptureTargetRoom}
                disabled={autoCaptureRunning}
                style={{ width: 120 }}
                placeholder="Chọn phòng"
              >
                {dataSource.map(room => (
                  <Option key={room.roomId} value={room.roomId}>
                    {room.roomNumber}
                  </Option>
                ))}
              </Select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Chụp mỗi:</span>
              <InputNumber
                min={5}
                max={300}
                value={autoCaptureInterval}
                onChange={setAutoCaptureInterval}
                disabled={autoCaptureRunning}
                suffix="giây"
                style={{ width: 100 }}
              />
            </div>
            
            {autoCaptureRunning && (
              <div style={{ 
                padding: '4px 12px', 
                background: '#f6ffed', 
                borderRadius: 4,
                color: '#52c41a',
                fontSize: 12
              }}>
                🔄 Đã chụp {autoCaptureCount} lần
              </div>
            )}
          </div>
          
          {autoCaptureEnabled && autoCaptureTargetRoom && (
            <div style={{ 
              padding: 8, 
              background: '#e6f7ff', 
              borderRadius: 4,
              color: '#1890ff',
              fontSize: 12
            }}>
              📷 Camera sẽ tự động chụp cho phòng {dataSource.find(r => r.roomId === autoCaptureTargetRoom)?.roomNumber} 
              mỗi {autoCaptureInterval} giây
            </div>
          )}
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          onChange: onPageChange,
        }}
        loading={loading}
        locale={{ emptyText: 'Chưa có dữ liệu' }}
      />
      
      {/* Auto Capture Camera - No outer modal wrapper */}
      <CameraCapture
        onCapture={(file) => handleAutoCapture(autoCaptureTargetRoom, file)}
        buttonText="📷 Auto Capture"
        disabled={detecting}
        autoMode={true}
        continuousMode={true}
        continuousInterval={autoCaptureInterval}
        isAutoRunning={autoCaptureRunning}
        onClose={stopAutoCapture}
        title={`🤖 Auto Capture - Phòng ${dataSource.find(r => r.roomId === autoCaptureTargetRoom)?.roomNumber}`}
        autoCaptureCount={autoCaptureCount}
      />
      
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={`Quét chỉ số điện cho phòng ${selectedRoom?.roomNumber}`}
        footer={null}
      >
        <Upload
          beforeUpload={(file) => {
            setFile(file);
            return false;
          }}
          accept="image/*"
          maxCount={1}
          showUploadList={file ? [{ name: file.name }] : false}
        >
          <Button>Chọn ảnh công tơ</Button>
        </Upload>
        <Button
          type="primary"
          onClick={handleDetect}
          loading={detecting}
          style={{ marginTop: 8, marginBottom: 8 }}
        >
          Quét OCR
        </Button>
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Nhập chỉ số mới"
          style={{ marginBottom: 8 }}
        />
        <Button
          type="primary"
          onClick={handleSaveReading}
          loading={saving}
          block
        >
          Lưu
        </Button>
        {ocrResult && (
          <div style={{ marginTop: 16, color: ocrResult.match(/^\d{5}(\.\d)?$/) ? 'green' : 'red' }}>
            Kết quả OCR: {ocrResult}
          </div>
        )}
      </Modal>
    </>
  );
}
