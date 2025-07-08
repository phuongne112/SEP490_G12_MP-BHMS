import React, { useState } from "react";
import { Table, Button, Modal, Upload, message, Input } from "antd";
import { detectElectricOcr, saveElectricReading } from "../../services/electricOcrApi";
import dayjs from "dayjs";

export default function ElectricTable({
  dataSource = [],
  currentPage = 1,
  pageSize = 5,
  total = 0,
  onPageChange = () => {},
  loading = false,
  onReload = () => {},
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
