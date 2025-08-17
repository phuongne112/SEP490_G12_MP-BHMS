import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Badge,
  Skeleton,
  Tag,
  Dropdown,
  Menu,
  message,
  Modal,
  Select,
  Input,
  Upload,
  Table,
  Tabs,
  Image,
} from "antd";
import {
  updateRoomStatus,
  toggleRoomActiveStatus,
  deleteRoom,
  addServiceToRoom,
  deactivateServiceForRoom,
  reactivateServiceForRoom,
} from "../../services/roomService";
import { getAllServicesList } from "../../services/serviceApi";
import { detectElectricOcr } from "../../services/electricOcrApi";

import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { CheckCircleFilled } from "@ant-design/icons";
import {
  getAllAssets,
  getAssetInventoryByRoomAndContract,
  getAssetsByRoom,
  addAssetToRoom,
  deleteRoomAsset,
  updateRoomAsset,
} from "../../services/assetApi";
import axiosClient from "../../services/axiosClient";
import image1 from "../../assets/RoomImage/image1.png";
import { Modal as AntdModal, Popconfirm } from "antd";
import { getContractHistoryByRoom } from "../../services/contractApi";
import AssignRenterModal from "./AssignRenterModal";
import EditRoomModal from "./EditRoomModal";

const { Meta } = Card;
const { Option } = Select;

const getStatusProps = (status) => {
  switch (status) {
    case "Available":
      return { status: "success", text: "Còn trống" };
    case "Occupied":
      return { status: "error", text: "Đã thuê" };
    case "Maintenance":
      return { status: "warning", text: "Bảo trì" };
    case "Inactive":
      return { status: "default", text: "Ngừng hoạt động" };
    default:
      return { status: "default", text: "Không xác định" };
  }
};

// CenterToast component
function CenterToast({ message: msg, visible }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 32,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        padding: "14px 32px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        zIndex: 9999,
        fontWeight: 500,
        fontSize: 16,
      }}
    >
      <CheckCircleFilled style={{ color: "#52c41a", fontSize: 22 }} />
      {msg}
    </div>
  );
}

export default function RoomTable({ rooms, loading, onRoomsUpdate }) {
  const [updatingId, setUpdatingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const navigate = useNavigate();
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [addingService, setAddingService] = useState(false);

  // For electric reading
  const [electricModalOpen, setElectricModalOpen] = useState(false);
  const [electricFile, setElectricFile] = useState(null);
  const [electricValue, setElectricValue] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [pendingServices, setPendingServices] = useState([]); // Lưu danh sách dịch vụ đang chờ thêm

  // For contract management
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [renewalDate, setRenewalDate] = useState("");
  const [renewingContract, setRenewingContract] = useState(false);

  // For contract updates
  const [updateContractModalOpen, setUpdateContractModalOpen] = useState(false);
  const [updateContractData, setUpdateContractData] = useState({
    newRentAmount: "",
    newDepositAmount: "",
    newTerms: "",
    reasonForUpdate: "",
    requiresTenantApproval: true,
  });
  const [updatingContract, setUpdatingContract] = useState(false);

  // For asset management
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetList, setAssetList] = useState([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [assetPage, setAssetPage] = useState(1);
  const [assetTotal, setAssetTotal] = useState(0);

  // For assign renter modal
  const [assignRenterModalVisible, setAssignRenterModalVisible] =
    useState(false);
  const [selectedRoomForAssign, setSelectedRoomForAssign] = useState(null);
  const [assetPageSize, setAssetPageSize] = useState(5);
  const [assetRoomId, setAssetRoomId] = useState(null);

  // For edit room modal
  const [editRoomModalVisible, setEditRoomModalVisible] = useState(false);
  const [selectedRoomForEdit, setSelectedRoomForEdit] = useState(null);

  const [viewAssetModalOpen, setViewAssetModalOpen] = useState(false);
  const [viewAssetRoomId, setViewAssetRoomId] = useState(null);
  const [roomAssets, setRoomAssets] = useState([]);
  const [roomAssetsLoading, setRoomAssetsLoading] = useState(false);
  const [assetListGoc, setAssetListGoc] = useState([]);
  const [assetListGocLoading, setAssetListGocLoading] = useState(false);
  const [contractList, setContractList] = useState([]);
  const [selectedContractId, setSelectedContractId] = useState(null);

  const [addAssetInventoryModalOpen, setAddAssetInventoryModalOpen] =
    useState(false);
  const [assetToAdd, setAssetToAdd] = useState(null);
  const [addAssetInventoryForm, setAddAssetInventoryForm] = useState({
    quantity: 1,
    status: "",
    note: "",
  });

  const [centerToast, setCenterToast] = useState({
    visible: false,
    message: "",
  });

  // all services
  const [allServices, setAllServices] = useState([]);

  const [editAssetModalOpen, setEditAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editAssetForm, setEditAssetForm] = useState({
    quantity: 1,
    status: "",
    note: "",
  });

  const isDev = import.meta.env.DEV;
  const BACKEND_URL = isDev
    ? (import.meta.env.VITE_BACKEND_URL || "http://52.184.69.15")
    : (typeof window !== "undefined" ? window.location.origin : "");

  const user = useSelector((state) => state.account.user);

  const handleStatusChange = async (roomId, newStatus) => {
    setUpdatingId(roomId);
    try {
      await updateRoomStatus(roomId, newStatus);
      message.success("Cập nhật trạng thái phòng thành công");
      if (onRoomsUpdate) {
        onRoomsUpdate();
      }
    } catch (error) {
      message.error("Cập nhật trạng thái phòng thất bại");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (roomId) => {
    setTogglingId(roomId);
    try {
      await toggleRoomActiveStatus(roomId);
      message.success("Cập nhật trạng thái hoạt động thành công");
      if (onRoomsUpdate) {
        onRoomsUpdate();
      }
    } catch (error) {
      message.error("Cập nhật trạng thái hoạt động thất bại");
    } finally {
      setTogglingId(null);
    }
  };

  const openServiceModal = async (room) => {
    setSelectedRoom(room);
    setServiceModalOpen(true);
    setSelectedServices([]);
    try {
      const res = await getAllServicesList();
      const all = res.data || [];
      setAllServices(all);
      const activeServiceIds = (room.services || [])
        .filter((s) => s.isActive !== false && !s.endDate)
        .map((s) => s.id);
      const availableServices = all.filter(
        (service) => !activeServiceIds.includes(service.id)
      );
      setServices(availableServices);
      if (availableServices.length === 0) {
        message.info("Phòng này đã có tất cả các dịch vụ đang sử dụng!");
      }
    } catch {
      setAllServices([]);
      setServices([]);
    }
  };

  const handleAddService = async () => {
    if (!selectedServices.length) {
      message.error("Vui lòng chọn ít nhất một dịch vụ!");
      return;
    }
    const selectedServiceObjects = services.filter((s) =>
      selectedServices.includes(s.id)
    );
    const hasElectricityService = selectedServiceObjects.some(
      (s) => s.serviceType === "ELECTRICITY"
    );

    if (hasElectricityService) {
      setPendingServices(selectedServices);
      setElectricModalOpen(true);
      setServiceModalOpen(false);
    } else {
      try {
        await addServicesToRoom(selectedServices);
        message.success("Thêm dịch vụ thành công!");
        setServiceModalOpen(false);
        if (onRoomsUpdate) onRoomsUpdate();
      } catch (err) {
        message.error(
          err.response?.data?.message || "Thêm dịch vụ thất bại!"
        );
      }
    }
  };

  // Thêm dịch vụ vào phòng
  const addServicesToRoom = async (serviceIds, electricReading = null) => {
    setAddingService(true);
    try {
      const selectedServiceObjects = services.filter((s) =>
        serviceIds.includes(s.id)
      );

      for (const serviceId of serviceIds) {
        const service = selectedServiceObjects.find((s) => s.id === serviceId);
        if (
          service &&
          service.serviceType === "ELECTRICITY" &&
          electricReading
        ) {
          await addServiceToRoom(selectedRoom.id, serviceId, electricReading);
        } else {
          await addServiceToRoom(selectedRoom.id, serviceId);
        }
      }

      message.success("Thêm dịch vụ vào phòng thành công!");
      setServiceModalOpen(false);
      setSelectedServices([]);
      setPendingServices([]);
      if (onRoomsUpdate) onRoomsUpdate();
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Error while adding services to room";
      if (errorMessage.includes("already exists")) {
        message.error("Dịch vụ này đã tồn tại trong phòng. Không thể thêm lại!");
      } else {
        message.error(errorMessage);
      }
    } finally {
      setAddingService(false);
    }
  };

  // OCR điện
  const handleElectricOcr = async () => {
    if (!electricFile && !electricValue) {
      message.error("Vui lòng nhập số điện hoặc upload ảnh!");
      return;
    }
    setOcrLoading(true);
    try {
      let result = electricValue;
      if (electricFile) {
        const res = await detectElectricOcr(electricFile);
        result = res.data.data;
        setElectricValue(result);
      }
      await addServicesToRoom(pendingServices, result);

      message.success(
        `Đã ghi nhận chỉ số điện: ${result} và thêm dịch vụ thành công!`
      );
      setElectricModalOpen(false);
      setElectricFile(null);
      setElectricValue("");
      setPendingServices([]);
    } catch (err) {
      message.error("Lỗi khi ghi nhận chỉ số điện");
    } finally {
      setOcrLoading(false);
    }
  };

  // Người thuê rời phòng
  const handleRenterLeave = async (roomUserId) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/mpbhms/room-users/leave/${roomUserId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        message.success("Người thuê đã rời phòng thành công");
        if (onRoomsUpdate) onRoomsUpdate();
      } else {
        const errorData = await response.text();
        message.error(errorData);
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi xử lý người thuê rời phòng");
    }
  };

  // Gia hạn hợp đồng
  const handleRenewContract = async () => {
    if (!renewalDate) {
      message.error("Vui lòng chọn ngày gia hạn");
      return;
    }

    setRenewingContract(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/mpbhms/room-users/renew-contract/${selectedContract.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newEndDate: new Date(renewalDate).toISOString(),
          }),
        }
      );

      if (response.ok) {
        message.success("Gia hạn hợp đồng thành công");
        setContractModalOpen(false);
        setRenewalDate("");
        setSelectedContract(null);
        if (onRoomsUpdate) onRoomsUpdate();
      } else {
        const errorData = await response.text();
        message.error(errorData);
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi gia hạn hợp đồng");
    } finally {
      setRenewingContract(false);
    }
  };

  // Xử lý hợp đồng hết hạn
  const handleProcessExpiredContracts = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/mpbhms/room-users/process-expired-contracts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        message.success("Đã xử lý tất cả hợp đồng hết hạn");
        if (onRoomsUpdate) onRoomsUpdate();
      } else {
        const errorData = await response.text();
        message.error(errorData);
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi xử lý hợp đồng hết hạn");
    }
  };

  // Cập nhật hợp đồng
  const handleUpdateContract = async () => {
    if (!updateContractData.reasonForUpdate) {
      message.error("Vui lòng nhập lý do cập nhật");
      return;
    }

    setUpdatingContract(true);
    try {
      const requestData = {
        contractId: selectedContract.id,
        newRentAmount: updateContractData.newRentAmount
          ? parseFloat(updateContractData.newRentAmount)
          : null,
        newDepositAmount: updateContractData.newDepositAmount
          ? parseFloat(updateContractData.newDepositAmount)
          : null,
        newTerms: updateContractData.newTerms || null,
        reasonForUpdate: updateContractData.reasonForUpdate,
        requiresTenantApproval: updateContractData.requiresTenantApproval,
        tenantIds: selectedContract.roomUsers?.map((ru) => ru.user.id) || [],
      };

      const response = await fetch(
        `${BACKEND_URL}/mpbhms/room-users/update-contract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (response.ok) {
        message.success("Đã tạo yêu cầu cập nhật hợp đồng thành công");
        setUpdateContractModalOpen(false);
        setUpdateContractData({
          newRentAmount: "",
          newDepositAmount: "",
          newTerms: "",
          reasonForUpdate: "",
          requiresTenantApproval: true,
        });
        setSelectedContract(null);
        if (onRoomsUpdate) onRoomsUpdate();
      } else {
        const errorData = await response.text();
        message.error(errorData);
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi cập nhật hợp đồng");
    } finally {
      setUpdatingContract(false);
    }
  };

  const openAssetModal = (room) => {
    setAssetRoomId(room.id);
    setAssetModalOpen(true);
    fetchAssetList(1, "");
  };

  const fetchAssetList = async (page = 1, search = "") => {
    setAssetLoading(true);
    try {
      const res = await getAllAssets(page - 1, assetPageSize, {
        assetName: search,
      });
      setAssetList(res.data?.result || res.result || []);
      setAssetTotal(res.data?.meta?.total || res.meta?.total || 0);
      setAssetPage(page);
    } catch {
      setAssetList([]);
    }
    setAssetLoading(false);
  };

  const [addMultipleAssetsModalOpen, setAddMultipleAssetsModalOpen] = useState(false);
  const [multipleAssetForms, setMultipleAssetForms] = useState([]);

  const handleAssetAssign = async () => {
    if (!selectedAssetIds || selectedAssetIds.length === 0 || !assetRoomId) return;
    if (selectedAssetIds.length === 1) {
      const asset = assetList.find((a) => a.id === selectedAssetIds[0]);
      setAssetToAdd(asset);
      setAddAssetInventoryForm({ quantity: 1, status: "", note: "" });
      setAssetModalOpen(false);
      setAddAssetInventoryModalOpen(true);
      return;
    }
    // Multiple assets
    const forms = selectedAssetIds
      .map((id) => assetList.find((a) => a.id === id))
      .filter(Boolean)
      .map((a) => ({ assetId: a.id, assetName: a.assetName, quantity: 1, status: "", note: "" }));
    setMultipleAssetForms(forms);
    setAssetModalOpen(false);
    setAddMultipleAssetsModalOpen(true);
  };

  const fetchRoomAssets = async (roomId) => {
    setAssetListGocLoading(true);
    try {
      const res = await getAssetsByRoom(roomId);
      setAssetListGoc(res.data || []);
    } catch {
      setAssetListGoc([]);
    }
    setAssetListGocLoading(false);
  };

  const openViewAssetModal = async (room) => {
    setViewAssetRoomId(room.id);
    setViewAssetModalOpen(true);
    fetchRoomAssets(room.id);
    try {
      const contracts = await getContractHistoryByRoom(room.id);
      setContractList(contracts || []);
    } catch {
      setContractList([]);
    }
  };

  const handleConfirmAddAssetInventory = async () => {
    if (!assetToAdd || !assetRoomId) return;
    try {
      // Prevent duplicate asset names in the room (case-insensitive)
      const existingNames = new Set((assetListGoc || []).map(a => (a.assetName || '').toLowerCase().trim()));
      if (existingNames.has((assetToAdd.assetName || '').toLowerCase().trim())) {
        message.error('Tài sản này đã tồn tại trong phòng (trùng tên). Không thể thêm!');
        return;
      }
      await addAssetToRoom({
        roomId: assetRoomId,
        assetId: assetToAdd.id,
        quantity: addAssetInventoryForm.quantity,
        status: addAssetInventoryForm.status,
        note: addAssetInventoryForm.note,
      });
      message.success("Đã thêm tài sản vào phòng với tình trạng riêng!");
      setAddAssetInventoryModalOpen(false);
      setAssetToAdd(null);
      setSelectedAssetIds([]);
      fetchRoomAssets(assetRoomId);
    } catch {
      message.error("Lỗi khi thêm tài sản vào phòng!");
    }
  };

  const handleConfirmAddMultipleAssets = async () => {
    if (!assetRoomId || multipleAssetForms.length === 0) return;
    try {
      await Promise.all(
        multipleAssetForms
          .filter((f) => f.assetId && f.quantity > 0 && f.status)
          .map((f) =>
            addAssetToRoom({
              roomId: assetRoomId,
              assetId: f.assetId,
              quantity: f.quantity,
              status: f.status,
              note: f.note,
            })
          )
      );
      message.success("Đã thêm các tài sản vào phòng!");
      setAddMultipleAssetsModalOpen(false);
      setMultipleAssetForms([]);
      setSelectedAssetIds([]);
      fetchRoomAssets(assetRoomId);
    } catch (e) {
      message.error("Lỗi khi thêm nhiều tài sản!");
    }
  };

  // Xóa dịch vụ khỏi phòng
  const handleRemoveService = async (serviceId) => {
    if (!selectedRoom) return;
    const service = selectedRoom.services?.find((s) => s.id === serviceId);
    if (!service) return;
    Modal.confirm({
      title: `Xác nhận xóa dịch vụ`,
      content: `Bạn có chắc chắn muốn xóa dịch vụ "${service.serviceName}" khỏi phòng này?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosClient.delete(
            `/rooms/${selectedRoom.id}/remove-service/${serviceId}`
          );
          setCenterToast({
            visible: true,
            message: "Đã xóa dịch vụ khỏi phòng!",
          });
          setTimeout(
            () => setCenterToast({ visible: false, message: "" }),
            2000
          );
          if (onRoomsUpdate) onRoomsUpdate();
          setServiceModalOpen(false);
        } catch (err) {
          let msg = "Không thể xóa dịch vụ khỏi phòng!";
          if (err?.response?.data) {
            if (typeof err.response.data === "string") {
              msg = err.response.data;
            } else if (err.response.data.message) {
              msg = err.response.data.message;
            } else if (err.response.data.error) {
              msg = err.response.data.error;
            }
          }
          if (msg && msg.toLowerCase().includes("hóa đơn")) {
            AntdModal.warning({
              title: "Không thể xóa dịch vụ đã phát sinh hóa đơn",
              content: (
                <div>
                  <div>
                    Không thể xóa dịch vụ đã phát sinh hóa đơn. Vui lòng ngừng
                    sử dụng từ kỳ sau hoặc thêm dịch vụ mới nếu muốn thay đổi.
                  </div>
                  <div style={{ marginTop: 8, color: "#888" }}>
                    Nếu muốn thay đổi giá/gói dịch vụ, hãy thêm dịch vụ mới và
                    ngừng dịch vụ cũ từ kỳ tiếp theo.
                  </div>
                </div>
              ),
              okText: "Đã hiểu",
            });
          } else {
            message.error(msg);
          }
        }
      },
    });
  };

  // Ngừng sử dụng dịch vụ
  const handleDeactivateService = async (serviceId) => {
    if (!selectedRoom) return;
    const service = selectedRoom.services?.find((s) => s.id === serviceId);
    if (!service) return;

    Modal.confirm({
      title: `Xác nhận ngừng sử dụng dịch vụ`,
      content: `Bạn có chắc chắn muốn ngừng sử dụng dịch vụ "${service.serviceName}" cho phòng này?`,
      okText: "Ngừng sử dụng",
      cancelText: "Hủy",
      okType: "danger",
      onOk: async () => {
        try {
          await deactivateServiceForRoom(selectedRoom.id, serviceId);
          message.success("Đã ngừng sử dụng dịch vụ cho phòng!");
          if (onRoomsUpdate) onRoomsUpdate();
        } catch (err) {
          const backendMsg =
            err.response?.data?.message || err.response?.data || err.message;
          if (
            backendMsg.includes(
              "chỉ được phép ngừng dịch vụ vào ngày cuối kỳ"
            ) || backendMsg.includes("ngày 28-31")
          ) {
            Modal.info({
              title: "Không thể ngừng sử dụng dịch vụ",
              content: (
                <div>
                  <div style={{ marginBottom: 8 }}>{backendMsg}</div>
                  <div>
                    Nếu muốn thay đổi giá/gói dịch vụ, hãy thêm dịch vụ mới và
                    ngừng dịch vụ cũ từ kỳ tiếp theo.
                  </div>
                </div>
              ),
              okText: "Đã hiểu",
            });
          } else {
            message.error("Không thể ngừng sử dụng dịch vụ: " + backendMsg);
          }
        }
      },
    });
  };

  // Sử dụng lại dịch vụ
  const handleReactivateService = async (serviceId) => {
    if (!selectedRoom) return;
    const service = selectedRoom.services?.find((s) => s.id === serviceId);
    if (!service) return;
    Modal.confirm({
      title: `Xác nhận sử dụng lại dịch vụ`,
      content: `Bạn có chắc chắn muốn sử dụng lại dịch vụ "${service.serviceName}" cho phòng này?`,
      okText: "Sử dụng lại",
      cancelText: "Hủy",
      okType: "primary",
      onOk: async () => {
        try {
          await reactivateServiceForRoom(selectedRoom.id, serviceId);
          message.success("Đã sử dụng lại dịch vụ cho phòng!");
          if (onRoomsUpdate) onRoomsUpdate();
        } catch (err) {
          const backendMsg =
            err.response?.data?.message || err.response?.data || err.message;
          message.error("Không thể sử dụng lại dịch vụ: " + backendMsg);
        }
      },
    });
  };

  const statusMenu = (room) => (
    <Menu
      onClick={({ key, domEvent }) => {
        domEvent.stopPropagation();
        if (room.roomStatus !== key) {
          handleStatusChange(room.id, key);
        }
      }}
      selectedKeys={[room.roomStatus]}
    >
      <Menu.Item key="Available">Còn trống</Menu.Item>
      <Menu.Item key="Occupied">Đã thuê</Menu.Item>
      <Menu.Item key="Maintenance">Bảo trì</Menu.Item>
      <Menu.Item key="Inactive">Ngừng hoạt động</Menu.Item>
    </Menu>
  );

  if (loading) {
    return (
      <Row gutter={[16, 16]}>
        {[...Array(6)].map((_, idx) => (
          <Col key={idx} xs={24} sm={12} md={8}>
            <Card>
              <Skeleton active />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  const handleAddAssetInView = () => {
    setAssetRoomId(viewAssetRoomId);
    setAssetModalOpen(true);
    fetchAssetList(1, "");
  };

  const handleContractChange = async (value) => {
    setSelectedContractId(value);
    setRoomAssetsLoading(true);
    let roomNumber = null;
    if (viewAssetRoomId && rooms && rooms.length > 0) {
      const room = rooms.find((r) => r.id === viewAssetRoomId);
      if (room) roomNumber = room.roomNumber;
    }
    if (!roomNumber) {
      setRoomAssets([]);
      setRoomAssetsLoading(false);
      return;
    }
    try {
      const res = await getAssetInventoryByRoomAndContract(roomNumber, value);
      setRoomAssets(res.data || []);
    } catch {
      setRoomAssets([]);
    }
    setRoomAssetsLoading(false);
  };

  const getImageUrl = (url) => {
    if (!url) return image1;
    if (/^https?:\/\//.test(url)) return url;
    const sep = url.startsWith("/") ? "" : "/";
    return `${BACKEND_URL}${sep}${url}`;
  };

  // Xóa asset khỏi phòng
  const handleDeleteRoomAsset = async (roomAssetId) => {
    try {
      await deleteRoomAsset(roomAssetId);
      fetchRoomAssets(viewAssetRoomId);
    } catch (err) {
      message.error("Xóa tài sản khỏi phòng thất bại!");
    }
  };

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setEditAssetForm({
      quantity: asset.quantity,
      status: asset.status,
      note: asset.note || "",
    });
    setEditAssetModalOpen(true);
  };

  const handleSaveEditAsset = async () => {
    try {
      await updateRoomAsset({
        id: editingAsset.id,
        quantity: editAssetForm.quantity,
        status: editAssetForm.status,
        note: editAssetForm.note,
      });
      message.success("Cập nhật tài sản thành công!");
      setEditAssetModalOpen(false);
      setEditingAsset(null);
      fetchRoomAssets(viewAssetRoomId);
    } catch (err) {
      message.error("Cập nhật tài sản thất bại!");
    }
  };

  return (
    <>
      <CenterToast message={centerToast.message} visible={centerToast.visible} />
            <Row gutter={[16, 16]}>
        {rooms.map((room) => {
          const imageUrl =
            room.images && room.images.length > 0
              ? getImageUrl(room.images[0].imageUrl)
              : image1;
          const currentStatusProps = getStatusProps(room.roomStatus);

          return (
            <Col key={room.id} xs={24} sm={12} md={8}>
              <Card
                hoverable
                onClick={() => {
                  if (
                    user?.role?.roleName?.toUpperCase?.() === "ADMIN" ||
                    user?.role?.roleName?.toUpperCase?.() === "SUBADMIN"
                  ) {
                    navigate(`/admin/rooms/${room.id}`);
                  } else {
                    navigate(`/landlord/rooms/${room.id}`);
                  }
                }}
                style={{ cursor: "pointer" }}
                cover={
                  <div style={{ position: "relative" }}>
                    <img
                      alt="room"
                      src={imageUrl}
                      style={{
                        height: 200,
                        objectFit: "cover",
                        width: "100%",
                        background: "#f5f5f5",
                        borderRadius: 0,
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = image1;
                      }}
                    />
                    {/* Dãy nút nổi phía trên ảnh */}
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 0,
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "0 10px",
                        zIndex: 2,
                      }}
                    >
                      <Button
                        type="default"
                        style={{
                          borderRadius: 6,
                          minWidth: 110,
                          height: 36,
                          background: "rgba(255,255,255,0.85)",
                          fontWeight: 500,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const hasActiveTenant =
                            (room.roomUsers && room.roomUsers.filter((u) => u.isActive).length > 0) ||
                            room.roomStatus === "Occupied";
                          if (hasActiveTenant) {
                            message.warning("Phòng đã có người thuê. Không thể gán thêm!");
                            return;
                          }
                          setSelectedRoomForAssign(room);
                          setAssignRenterModalVisible(true);
                        }}
                      >
                        Gán người thuê
                      </Button>
                      <Button
                        type="primary"
                        style={{
                          borderRadius: 6,
                          minWidth: 140,
                          height: 36,
                          fontWeight: 500,
                          background: "#1976d2",
                          color: "#fff",
                          border: "none",
                          boxShadow: "0 2px 8px rgba(25, 118, 210, 0.08)",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openViewAssetModal(room);
                        }}
                      >
                        Xem tài sản
                      </Button>
                      <Button
                        type="dashed"
                        style={{
                          borderRadius: 6,
                          minWidth: 110,
                          height: 36,
                          fontWeight: 500,
                          borderColor: "#52c41a",
                          color: "#52c41a",
                          background: "rgba(255,255,255,0.85)",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openServiceModal(room);
                        }}
                      >
                        Thêm dịch vụ
                      </Button>
                    </div>
                  </div>
                }
              >
                <Meta
                  title={
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{ fontSize: 22, fontWeight: 700, color: "#222" }}
                      >
                        {room.roomNumber}
                      </span>
                      <Tag
                        color={room.isActive ? "green" : "red"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(room.id);
                        }}
                        style={{
                          cursor: "pointer",
                          opacity: togglingId === room.id ? 0.5 : 1,
                          fontSize: 15,
                          padding: "4px 12px",
                          borderRadius: 8,
                        }}
                      >
                        {room.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                      </Tag>
                    </div>
                  }
                  description={
                    <div style={{ padding: "10px 0 0 0" }}>
                      {room.building && (
                        <div
                          style={{
                            fontSize: 15,
                            color: "#666",
                            fontWeight: 500,
                            marginBottom: 2,
                          }}
                        >
                          Tòa nhà: <span style={{ color: "#222" }}>{room.building}</span>
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 17,
                          color: "#1a237e",
                          fontWeight: 600,
                          marginBottom: 2,
                        }}
                      >
                        Giá:{" "}
                        <span style={{ color: "#d32f2f" }}>
                          {room.pricePerMonth?.toLocaleString("vi-VN")} VND/tháng
                        </span>
                      </div>
                      {room.area && (
                        <div
                          style={{
                            fontSize: 15,
                            color: "#666",
                            fontWeight: 500,
                            marginBottom: 2,
                          }}
                        >
                          Diện tích: <span style={{ color: "#222" }}>{room.area} m²</span>
                        </div>
                      )}
                    </div>
                  }
                />
                {/* Hàng nút dưới */}
                <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <Button
                    type="primary"
                    style={{ borderRadius: 6, minWidth: 80, height: 38 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        room.roomUsers &&
                        room.roomUsers.filter((u) => u.isActive).length > 0
                      ) {
                        message.error("Không thể chỉnh sửa phòng khi vẫn còn người ở!");
                        return;
                      }
                      setSelectedRoomForEdit(room);
                      setEditRoomModalVisible(true);
                    }}
                  >
                    Sửa
                  </Button>
                  <Button
                    type="primary"
                    danger
                    style={{ borderRadius: 6, minWidth: 90, height: 38 }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm("Bạn có chắc muốn xóa phòng này không?")) {
                        try {
                          await deleteRoom(room.id);
                          message.success("Xóa phòng thành công");
                          if (onRoomsUpdate) onRoomsUpdate();
                        } catch (e) {
                          const backendMsg =
                            e?.response?.data?.message ||
                            e?.response?.data?.error ||
                            "Xóa phòng thất bại";
                          message.error(backendMsg);
                        }
                      }
                    }}
                  >
                    Xóa
                  </Button>
                  <Dropdown
                    overlay={statusMenu(room)}
                    trigger={["click"]}
                    disabled={updatingId === room.id}
                  >
                    <a
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      style={{
                        opacity: updatingId === room.id ? 0.5 : 1,
                        cursor: updatingId === room.id ? "wait" : "pointer",
                        display: "inline-block",
                        marginLeft: 2,
                      }}
                    >
                      <Badge
                        status={currentStatusProps.status}
                        text={
                          <span style={{ fontWeight: 500, fontSize: 15 }}>
                            {currentStatusProps.text}
                          </span>
                        }
                      />
                    </a>
                  </Dropdown>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Modal chọn dịch vụ */}
      <Modal
        open={serviceModalOpen}
        onCancel={() => setServiceModalOpen(false)}
        onOk={handleAddService}
        okText="Thêm dịch vụ"
        confirmLoading={addingService}
        okButtonProps={{ disabled: services.length === 0 }}
        title={`Thêm dịch vụ vào phòng ${selectedRoom?.roomNumber}`}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "#666", fontSize: 14 }}>
            Chọn dịch vụ để thêm vào phòng {selectedRoom?.roomNumber}:
          </p>
        </div>
        <Select
          mode="multiple"
          style={{ width: "100%" }}
          placeholder="Chọn dịch vụ"
          value={selectedServices}
          onChange={setSelectedServices}
        >
          {allServices.map((s) => {
            const isActive = (selectedRoom?.services || []).some(
              (rs) => rs.id === s.id && rs.isActive !== false && !rs.endDate
            );
            return (
                      <Option key={s.id} value={s.id} disabled={isActive}>
          {s.serviceName} {isActive ? " - Đã có" : ""}
        </Option>
            );
          })}
        </Select>

        {/* Danh sách dịch vụ hiện tại của phòng */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            Các dịch vụ hiện tại của phòng:
          </div>
          <ul style={{ paddingLeft: 20 }}>
            {selectedRoom?.services && selectedRoom.services.length > 0 ? (
              selectedRoom.services.map((s) => {
                const isActive = s.isActive !== false && !s.endDate;
                return (
                  <li
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                            <span style={{ flex: 1 }}>
          {s.serviceName}
          <span
            style={{
              marginLeft: 8,
              fontSize: 13,
              color: isActive ? "#52c41a" : "#888",
            }}
          >
            {isActive ? "Đang sử dụng" : "Đã ngừng"}
          </span>
        </span>
                    <Button
                      danger
                      size="small"
                      onClick={() => handleRemoveService(s.id)}
                      style={{ marginLeft: 8 }}
                    >
                      Xóa
                    </Button>
                    {isActive ? (
                      <Button
                        type="default"
                        size="small"
                        onClick={() => handleDeactivateService(s.id)}
                        style={{ marginLeft: 8 }}
                      >
                        Ngừng sử dụng
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => handleReactivateService(s.id)}
                        style={{ marginLeft: 8 }}
                      >
                        Sử dụng lại
                      </Button>
                    )}
                  </li>
                );
              })
            ) : (
              <li>Chưa có dịch vụ nào</li>
            )}
          </ul>
        </div>
      </Modal>

      {/* Modal nhập chỉ số điện hoặc OCR */}
      <Modal
        open={electricModalOpen}
        onCancel={() => {
          setElectricModalOpen(false);
          setElectricFile(null);
          setElectricValue("");
          setPendingServices([]);
        }}
        onOk={handleElectricOcr}
        okText="Có"
        cancelText="Hủy"
        confirmLoading={ocrLoading}
        title={`Nhập chỉ số điện cho phòng ${selectedRoom?.roomNumber}`}
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "#666", marginBottom: 8 }}>
            Phòng này sẽ được thêm dịch vụ điện. Vui lòng nhập chỉ số điện hiện
            tại:
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Nhập số điện mới (VD: 12345.6)"
            value={electricValue}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, "");
              setElectricValue(val);
            }}
            style={{ marginBottom: 12 }}
          />
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <span style={{ color: "#999" }}>hoặc</span>
          </div>
          <Upload
            beforeUpload={(file) => {
              setElectricFile(file);
              return false;
            }}
            accept="image/*"
            maxCount={1}
            showUploadList={!!electricFile}
          >
            <Button block>📷 Chọn ảnh công tơ (OCR tự động)</Button>
          </Upload>
        </div>

        {electricValue && (
          <div
            style={{
              padding: 12,
              backgroundColor: "#f6ffed",
              border: "1px solid #b7eb8f",
              borderRadius: 6,
              marginBottom: 16,
            }}
          >
            <strong>Số điện sẽ được ghi nhận:</strong> {electricValue}
          </div>
        )}
      </Modal>

      {/* Modal chọn tài sản để thêm vào phòng */}
      <Modal
        open={assetModalOpen}
        title="Chọn tài sản để thêm vào phòng"
        onCancel={() => {
          setAssetModalOpen(false);
          setSelectedAssetIds([]);
        }}
        onOk={handleAssetAssign}
        okText="Thêm vào phòng"
        okButtonProps={{ disabled: !selectedAssetIds || selectedAssetIds.length === 0 }}
        width={700}
      >
        <Input.Search
          placeholder="Tìm kiếm tài sản"
          value={assetSearch}
          onChange={(e) => {
            setAssetSearch(e.target.value);
            fetchAssetList(1, e.target.value);
          }}
          style={{ marginBottom: 16, width: 300 }}
          allowClear
        />
        <Table
          dataSource={assetList}
          loading={assetLoading}
          rowKey="id"
          pagination={{
            current: assetPage,
            pageSize: assetPageSize,
            total: assetTotal,
            onChange: (page) => fetchAssetList(page, assetSearch),
          }}
          rowSelection={{
            type: "checkbox",
            selectedRowKeys: selectedAssetIds,
            onChange: (selectedRowKeys) => setSelectedAssetIds(selectedRowKeys),
            getCheckboxProps: (record) => {
              const existingNames = new Set((assetListGoc || []).map(a => (a.assetName || '').toLowerCase().trim()));
              const isDuplicate = existingNames.has((record.assetName || '').toLowerCase().trim());
              return { disabled: isDuplicate };
            },
          }}
          columns={[
            { title: "Tên tài sản", dataIndex: "assetName", key: "assetName" },
            { title: "Số lượng", dataIndex: "quantity", key: "quantity" },
            {
              title: "Ghi chú",
              dataIndex: "conditionNote",
              key: "conditionNote",
            },
          ]}
        />
      </Modal>

      {/* Modal thêm nhiều tài sản */}
      <Modal
        open={addMultipleAssetsModalOpen}
        title="Thêm nhiều tài sản vào phòng"
        onCancel={() => setAddMultipleAssetsModalOpen(false)}
        onOk={handleConfirmAddMultipleAssets}
        okText="Thêm vào phòng"
        okButtonProps={{ disabled: multipleAssetForms.length === 0 || multipleAssetForms.some(f => !f.status || !f.quantity) }}
        width={600}
      >
        <Table
          dataSource={multipleAssetForms}
          rowKey={(r) => r.assetId}
          pagination={false}
          columns={[
            { title: 'Tài sản', dataIndex: 'assetName', key: 'assetName' },
            { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity',
              render: (val, record) => (
                <Input type="number" min={1} value={record.quantity} onChange={(e)=>{
                  const v = e.target.value;
                  setMultipleAssetForms(prev => prev.map(f => f.assetId===record.assetId ? { ...f, quantity: v } : f));
                }} style={{ width: 90 }} />
              )
            },
            { title: 'Tình trạng', dataIndex: 'status', key: 'status',
              render: (val, record) => (
                <Select value={record.status} onChange={(v)=>{
                  setMultipleAssetForms(prev => prev.map(f => f.assetId===record.assetId ? { ...f, status: v } : f));
                }} style={{ width: 120 }}>
                  <Select.Option value="Tốt">Tốt</Select.Option>
                  <Select.Option value="Hư hỏng">Hư hỏng</Select.Option>
                  <Select.Option value="Mất">Mất</Select.Option>
                  <Select.Option value="Bảo trì">Bảo trì</Select.Option>
                </Select>
              )
            },
            { title: 'Ghi chú', dataIndex: 'note', key: 'note',
              render: (val, record) => (
                <Input value={record.note} onChange={(e)=>{
                  const v = e.target.value;
                  setMultipleAssetForms(prev => prev.map(f => f.assetId===record.assetId ? { ...f, note: v } : f));
                }} />
              )
            }
          ]}
        />
      </Modal>

      {/* Modal xem danh sách tài sản của phòng */}
      <Modal
        open={viewAssetModalOpen}
        title="Danh sách tài sản của phòng"
        onCancel={() => setViewAssetModalOpen(false)}
        footer={null}
        width={900}
      >
        <Button type="primary" style={{ marginBottom: 16 }} onClick={handleAddAssetInView}>
          Thêm tài sản
        </Button>
        <Tabs defaultActiveKey="goc">
          <Tabs.TabPane tab="Danh mục tài sản gốc" key="goc">
            <Table
              dataSource={assetListGoc}
              loading={assetListGocLoading}
              rowKey="id"
              columns={[
                { title: "Tên tài sản", dataIndex: "assetName", key: "assetName" },
                { title: "Số lượng", dataIndex: "quantity", key: "quantity" },
                {
                  title: "Tình trạng",
                  dataIndex: "status",
                  key: "status",
                  render: (text, record) => record.status || "-",
                },
                {
                  title: "Ghi chú",
                  dataIndex: "conditionNote",
                  key: "conditionNote",
                  render: (val, record) => record.conditionNote || record.note || "-",
                },
                {
                  title: "Hình ảnh",
                  dataIndex: "assetImage",
                  key: "assetImage",
                  render: (url) =>
                    url ? (
                      <Image
                        src={
                          url.startsWith("http")
                            ? url
                            : `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`
                        }
                        width={60}
                        height={40}
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ color: "#aaa" }}>Không có ảnh</span>
                    ),
                },
                {
                  title: "",
                  key: "action",
                  render: (_, record) => (
                    <>
                      <Button
                        size="small"
                        onClick={() => handleEditAsset(record)}
                        style={{ marginRight: 8 }}
                      >
                        Sửa
                      </Button>
                      <Popconfirm
                        title="Bạn có chắc muốn xóa tài sản này khỏi phòng?"
                        okText="Xóa"
                        cancelText="Hủy"
                        onConfirm={() => handleDeleteRoomAsset(record.id)}
                      >
                        <Button danger size="small">
                          Xóa
                        </Button>
                      </Popconfirm>
                    </>
                  ),
                },
              ]}
              pagination={false}
            />
          </Tabs.TabPane>

          <Tabs.TabPane tab="Lịch sử kiểm kê" key="kiemke">
            <div style={{ marginBottom: 12 }}>
              <Select
                style={{ width: 300 }}
                placeholder="Chọn hợp đồng để xem kiểm kê"
                value={selectedContractId}
                onChange={handleContractChange}
              >
                {contractList.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.contractCode || `Hợp đồng #${c.id}`} (Từ {c.startDate} đến {c.endDate})
                  </Select.Option>
                ))}
              </Select>
            </div>
            <Table
              dataSource={roomAssets}
              loading={roomAssetsLoading}
              rowKey="id"
              columns={[
                { title: "ID tài sản", dataIndex: "assetId", key: "assetId" },
                { title: "Tình trạng", dataIndex: "status", key: "status" },
                {
                  title: "Đủ/Thiếu",
                  dataIndex: "isEnough",
                  key: "isEnough",
                  render: (val) => (val ? "Đủ" : "Thiếu"),
                },
                { title: "Ghi chú", dataIndex: "note", key: "note" },
                { title: "Loại kiểm kê", dataIndex: "type", key: "type" },
              ]}
              pagination={false}
            />
          </Tabs.TabPane>
        </Tabs>
      </Modal>

      {/* Modal nhập tình trạng riêng khi thêm tài sản vào phòng */}
      <Modal
        open={addAssetInventoryModalOpen}
        title={`Thêm tài sản vào phòng với tình trạng riêng`}
        onCancel={() => setAddAssetInventoryModalOpen(false)}
        onOk={handleConfirmAddAssetInventory}
        okText="Thêm vào phòng"
        okButtonProps={{ disabled: !addAssetInventoryForm.status }}
        width={400}
      >
        <div>
          <b>Tài sản:</b> {assetToAdd?.assetName}
        </div>
        <div style={{ margin: "12px 0" }}>
          <Input
            type="number"
            min={1}
            value={addAssetInventoryForm.quantity}
            onChange={(e) =>
              setAddAssetInventoryForm((f) => ({
                ...f,
                quantity: e.target.value,
              }))
            }
            placeholder="Số lượng"
            style={{ marginBottom: 8 }}
          />
          <Select
            value={addAssetInventoryForm.status}
            onChange={(val) =>
              setAddAssetInventoryForm((f) => ({ ...f, status: val }))
            }
            placeholder="Chọn tình trạng"
            style={{ marginBottom: 8, width: "100%" }}
          >
            <Select.Option value="Tốt">Tốt</Select.Option>
            <Select.Option value="Hư hỏng">Hư hỏng</Select.Option>
            <Select.Option value="Mất">Mất</Select.Option>
            <Select.Option value="Bảo trì">Bảo trì</Select.Option>
          </Select>
          <Input.TextArea
            value={addAssetInventoryForm.note}
            onChange={(e) =>
              setAddAssetInventoryForm((f) => ({ ...f, note: e.target.value }))
            }
            placeholder="Ghi chú (nếu có)"
            autoSize
          />
        </div>
      </Modal>

      {/* Modal chỉnh sửa asset */}
      <Modal
        open={editAssetModalOpen}
        title="Chỉnh sửa tài sản trong phòng"
        onCancel={() => setEditAssetModalOpen(false)}
        onOk={handleSaveEditAsset}
        okText="Lưu"
        width={400}
      >
        <div>
          <b>Tài sản:</b> {editingAsset?.assetName}
        </div>
        <div style={{ margin: "12px 0" }}>
          <Input
            type="number"
            min={1}
            value={editAssetForm.quantity}
            onChange={(e) =>
              setEditAssetForm((f) => ({ ...f, quantity: e.target.value }))
            }
            placeholder="Số lượng"
            style={{ marginBottom: 8 }}
          />
          <Select
            value={editAssetForm.status}
            onChange={(val) =>
              setEditAssetForm((f) => ({ ...f, status: val }))
            }
            placeholder="Chọn tình trạng"
            style={{ marginBottom: 8, width: "100%" }}
          >
            <Select.Option value="Tốt">Tốt</Select.Option>
            <Select.Option value="Hư hỏng">Hư hỏng</Select.Option>
            <Select.Option value="Mất">Mất</Select.Option>
            <Select.Option value="Bảo trì">Bảo trì</Select.Option>
          </Select>
          <Input.TextArea
            value={editAssetForm.note}
            onChange={(e) =>
              setEditAssetForm((f) => ({ ...f, note: e.target.value }))
            }
            placeholder="Ghi chú (nếu có)"
            autoSize
          />
        </div>
      </Modal>

      {/* Modal gán người thuê */}
      <AssignRenterModal
        visible={assignRenterModalVisible}
        onCancel={() => {
          setAssignRenterModalVisible(false);
          setSelectedRoomForAssign(null);
        }}
        room={selectedRoomForAssign}
        onSuccess={() => {
          onRoomsUpdate?.();
        }}
      />

      {/* Modal chỉnh sửa phòng */}
      <EditRoomModal
        visible={editRoomModalVisible}
        onCancel={() => {
          setEditRoomModalVisible(false);
          setSelectedRoomForEdit(null);
        }}
        roomId={selectedRoomForEdit?.id}
        onSuccess={() => {
          onRoomsUpdate?.();
        }}
      />
    </>
  );
}
