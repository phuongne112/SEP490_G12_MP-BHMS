import React, { useEffect, useState } from "react";
import { Modal, Descriptions, Spin, Alert, Button } from "antd";
import { getPersonalInfo } from "../../services/userApi";
import { getCurrentUser } from "../../services/authService";

export default function UserInfoModal({ open, onClose, onShowUpdateModal }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const user = await getCurrentUser();
        setCurrentUser(user);

        const data = await getPersonalInfo();
        setInfo(data);
      } catch (err) {
        const status = err?.response?.status;

        if (status === 404 || status === 500) {
          setInfo(null);
        } else {
          setError("Failed to load personal information.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
      ) : info === null ? (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <p>{error || "No personal information found."}</p>
          <Button
            type="primary"
            onClick={() => {
              onClose();
              onShowUpdateModal?.(true); // create mode
            }}
          >
            Add Info
          </Button>
        </div>
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
                onShowUpdateModal?.(false); // update mode
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
