import React, { useState, useEffect, useRef } from "react";
import { Table, Button, Modal, Upload, message, Input, Switch, InputNumber, Space, Card, Select } from "antd";
import { CameraOutlined } from "@ant-design/icons";
import { detectElectricOcr, detectAndSaveElectricOcr, saveImageOnly, saveElectricReading } from "../../services/electricOcrApi";
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
  const [autoCaptureInterval, setAutoCaptureInterval] = useState(() => {
    const saved = localStorage.getItem('autoCaptureInterval');
    const parsed = saved ? parseInt(saved) : 30;
    return isNaN(parsed) ? 30 : parsed; // Ensure we never return NaN
  }); // seconds
  const [autoCaptureTargetRoom, setAutoCaptureTargetRoom] = useState(null);
  const [autoCaptureCount, setAutoCaptureCount] = useState(0);
  const [autoCaptureRunning, setAutoCaptureRunning] = useState(false);
  const [autoCaptureSettingsModalOpen, setAutoCaptureSettingsModalOpen] = useState(false);
  const autoCaptureTimerRef = useRef(null);
  const cameraRef = useRef(null);

  // Save autoCaptureInterval to localStorage when it changes
  useEffect(() => {
    if (autoCaptureInterval !== null && autoCaptureInterval !== undefined) {
      localStorage.setItem('autoCaptureInterval', autoCaptureInterval.toString());
    }
  }, [autoCaptureInterval]);

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
    
    message.success(`Bắt đầu chụp tự động cho phòng ${dataSource.find(r => r.roomId === autoCaptureTargetRoom)?.roomNumber} mỗi ${autoCaptureInterval} giây`);
  };

  const stopAutoCapture = () => {
    if (autoCaptureTimerRef.current) {
      clearInterval(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = null;
    }
    setAutoCaptureRunning(false);
    setAutoCaptureEnabled(false); // Also disable the auto-capture switch
    
    message.info('Dừng chụp tự động');
  };

  const handleAutoCapture = async (roomId, capturedFile) => {
    try {
      console.log('handleAutoCapture được gọi với roomId:', roomId, 'file:', capturedFile);
      
      if (!roomId) {
        console.error('roomId là null hoặc undefined');
        message.error('Vui lòng chọn phòng trước khi chụp tự động!');
        return;
      }
      
      setDetecting(true);
      await saveImageOnly(capturedFile, roomId);
      
      setAutoCaptureCount(prev => prev + 1);
      message.success(`Chụp tự động lần ${autoCaptureCount + 1}: Đã lưu ảnh thành công!`);
      if (onReload) onReload();
    } catch (err) {
      console.error("Lỗi chụp tự động:", err);
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
      // Use the new API that only saves image without OCR
      setDetecting(true);
      await saveImageOnly(capturedFile, roomId);
      
      message.success("Đã chụp và lưu ảnh thành công!");
      if (onReload) onReload();
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
      {/* Auto Capture Control - Top Right */}
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#1890ff' }}>
          Danh sách chỉ số điện
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            type="primary"
            icon={<CameraOutlined />}
            onClick={() => {
              if (autoCaptureRunning) {
                stopAutoCapture();
              } else {
                setAutoCaptureSettingsModalOpen(true);
              }
            }}
            style={{ 
              height: 40,
              fontSize: 14,
              fontWeight: 500
            }}
          >
            {autoCaptureRunning ? 'Dừng' : 'Chụp tự động'}
          </Button>
          
          {autoCaptureRunning && (
            <div style={{ 
              padding: '6px 12px', 
              background: '#f6ffed', 
              borderRadius: 4,
              color: '#52c41a',
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid #b7eb8f'
            }}>
              {autoCaptureCount} lần - {dataSource.find(r => r.roomId === autoCaptureTargetRoom)?.roomNumber}
            </div>
          )}
        </div>
      </div>

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
      

      
      {/* Auto Capture Settings Modal */}
      <Modal
        open={autoCaptureSettingsModalOpen}
        onCancel={() => setAutoCaptureSettingsModalOpen(false)}
        title="Cài đặt chụp tự động"
        footer={[
          <Button key="cancel" onClick={() => setAutoCaptureSettingsModalOpen(false)}>
            Hủy
          </Button>,
          <Button 
            key="start" 
            type="primary" 
            onClick={() => {
              if (!autoCaptureTargetRoom) {
                message.warning('Vui lòng chọn phòng!');
                return;
              }
              setAutoCaptureSettingsModalOpen(false);
              setAutoCaptureEnabled(true);
            }}
          >
            Bắt đầu chụp
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 80 }}>Phòng:</span>
            <Select
              value={autoCaptureTargetRoom}
              onChange={setAutoCaptureTargetRoom}
              style={{ width: 200 }}
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
            <span style={{ minWidth: 80 }}>Chụp mỗi:</span>
            <InputNumber
              min={5}
              max={300}
              value={autoCaptureInterval}
              onChange={setAutoCaptureInterval}
              suffix="giây"
              style={{ width: 120 }}
            />
          </div>
          
          <div style={{ 
            padding: 12, 
            background: '#e6f7ff', 
            borderRadius: 6,
            color: '#1890ff',
            fontSize: 14
          }}>
            Camera sẽ tự động chụp cho phòng {dataSource.find(r => r.roomId === autoCaptureTargetRoom)?.roomNumber || '...'} 
            mỗi {autoCaptureInterval} giây
          </div>
        </Space>
      </Modal>

      {/* Camera Capture Component */}
      {autoCaptureEnabled && autoCaptureTargetRoom && (
        <CameraCapture
          ref={cameraRef}
          onCapture={(file) => handleAutoCapture(autoCaptureTargetRoom, file)}
          onClose={() => {
            setAutoCaptureEnabled(false);
            stopAutoCapture();
          }}
          title={`Chụp tự động - Phòng ${dataSource.find(r => r.roomId === autoCaptureTargetRoom)?.roomNumber}`}
          autoMode={true}
          continuousMode={true}
          continuousInterval={autoCaptureInterval}
          isAutoRunning={true}
          autoCaptureCount={autoCaptureCount}
          hideButton={true}
        />
      )}

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
