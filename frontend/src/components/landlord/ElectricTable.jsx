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
      message.error("Please select an image!");
      return;
    }
    setDetecting(true);
    try {
      const res = await detectElectricOcr(file);
      setOcrResult(res.data.data);
      setInputValue(res.data.data);
    } catch (err) {
      setOcrResult(err.response?.data?.data || "Error during OCR");
      message.error(err.response?.data?.message || "Error during OCR");
    } finally {
      setDetecting(false);
    }
  };

  // Save to DB
  const handleSaveReading = async () => {
    if (!inputValue) {
      message.error("Please enter the new reading!");
      return;
    }
    setSaving(true);
    try {
      await saveElectricReading(selectedRoom.roomId, inputValue);
      message.success("Saved new reading!");
      setModalOpen(false);
      setFile(null);
      setOcrResult("");
      setInputValue("");
      if (onReload) onReload();
    } catch (err) {
      message.error("Error while saving reading");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: "Room", dataIndex: "roomNumber" },
    { title: "Last Month", dataIndex: "oldReading" },
    { title: "This Month", dataIndex: "newReading" },
    {
      title: "Date",
      dataIndex: "createdDate",
      render: (value) => value ? dayjs(value).format("DD/MM/YYYY HH:mm") : ""
    },
    {
      title: "Action",
      render: (_, record) => (
        <Button onClick={() => handleOcrClick(record)}>Scan Reading</Button>
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
      />
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={`Scan electric reading for room ${selectedRoom?.roomNumber}`}
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
          <Button>Select meter image</Button>
        </Upload>
        <Button
          type="primary"
          onClick={handleDetect}
          loading={detecting}
          style={{ marginTop: 8, marginBottom: 8 }}
        >
          Scan OCR
        </Button>
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Enter new reading"
          style={{ marginBottom: 8 }}
        />
        <Button
          type="primary"
          onClick={handleSaveReading}
          loading={saving}
          block
        >
          Save
        </Button>
        {ocrResult && (
          <div style={{ marginTop: 16, color: ocrResult.match(/^\d{5}(\.\d)?$/) ? 'green' : 'red' }}>
            OCR Result: {ocrResult}
          </div>
        )}
      </Modal>
    </>
  );
}
