import React, { useState } from "react";
import { Table, Button, Modal, Upload, message, Input } from "antd";
import { detectElectricOcr, detectAndSaveElectricOcr, saveElectricReading } from "../../services/electricOcrApi";
import dayjs from "dayjs";
import CameraCapture from "../common/CameraCapture";

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
