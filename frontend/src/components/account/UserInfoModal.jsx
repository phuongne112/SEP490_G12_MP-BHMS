import React, { useEffect, useState } from "react";
import { Modal, Descriptions, Spin, Alert, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { getPersonalInfo } from "../../services/userApi"; // tạo API này

export default function UserInfoModal({ open, onClose, onShowUpdateModal }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setLoading(true);
      getPersonalInfo()
        .then((res) => {
          setInfo(res);
        })
        .catch(() => setError("Failed to load personal information."))
        .finally(() => setLoading(false));
    }
  }, [open]);

  return (
    <Modal
      title="Personal Information"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {loading ? (
        <Spin />
      ) : error ? (
        <Alert type="error" message={error} />
      ) : (
        <>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Full Name">
              {info?.fullName || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Phone Number">
              {info?.phoneNumber || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Secondary Phone">
              {info?.phoneNumber2 || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Gender">
              {info?.gender || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Birth Date">
              {info?.birthDate || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Birth Place">
              {info?.birthPlace || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="National ID">
              {info?.nationalID || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Issued Place">
              {info?.nationalIDIssuePlace || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Permanent Address">
              {info?.permanentAddress || "-"}
            </Descriptions.Item>
          </Descriptions>
          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Button
              type="primary"
              onClick={() => {
                onClose();
                if (typeof onShowUpdateModal === "function") {
                  onShowUpdateModal();
                }
              }}
            >
              Update
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
