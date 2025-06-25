import React, { useState } from "react";
import { Card, Row, Col, Button, Badge, Skeleton, Tag, Dropdown, Menu, message, Modal, Select, Input, Upload } from "antd";
import { updateRoomStatus, toggleRoomActiveStatus, deleteRoom, addServiceToRoom } from "../../services/roomService";
import { getAllServicesList } from "../../services/serviceApi";
import { detectElectricOcr } from "../../services/electricOcrApi";
import { useNavigate } from "react-router-dom";

const { Meta } = Card;
const { Option } = Select;

const getStatusProps = (status) => {
    switch (status) {
        case 'Available':
            return { status: 'success', text: 'Available' };
        case 'Occupied':
            return { status: 'error', text: 'Occupied' };
        case 'Maintenance':
            return { status: 'warning', text: 'Maintenance' };
        case 'Inactive':
            return { status: 'default', text: 'Inactive' };
        default:
            return { status: 'default', text: 'Unknown' };
    }
};

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

    const handleStatusChange = async (roomId, newStatus) => {
        setUpdatingId(roomId);
        try {
            await updateRoomStatus(roomId, newStatus);
            message.success('Room status updated successfully');
            if (onRoomsUpdate) {
                onRoomsUpdate();
            }
        } catch (error) {
            message.error('Failed to update room status');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleToggleActive = async (roomId) => {
        setTogglingId(roomId);
        try {
            await toggleRoomActiveStatus(roomId);
            message.success('Active status updated successfully');
            if (onRoomsUpdate) {
                onRoomsUpdate();
            }
        } catch (error) {
            message.error('Failed to update active status');
        } finally {
            setTogglingId(null);
        }
    };

    const openServiceModal = async (room) => {
        setSelectedRoom(room);
        setServiceModalOpen(true);
        setSelectedServices([]);
        // Lấy danh sách dịch vụ
        try {
            const res = await getAllServicesList();
            setServices(res.data || []);
        } catch {
            setServices([]);
        }
    };

    const handleAddService = async () => {
        if (!selectedServices.length) {
            message.error("Please select at least one service!");
            return;
        }
        setAddingService(true);
        try {
            await Promise.all(selectedServices.map(serviceId =>
                addServiceToRoom(selectedRoom.id, serviceId)
            ));
            message.success("Added services to room!");
            setServiceModalOpen(false);
            if (onRoomsUpdate) onRoomsUpdate();
        } catch (err) {
            message.error("Error while adding services to room");
        } finally {
            setAddingService(false);
        }
    };

    // Xử lý modal nhập chỉ số điện hoặc OCR
    const handleElectricOcr = async () => {
        if (!electricFile && !electricValue) {
            message.error("Vui lòng nhập số điện hoặc upload ảnh!");
            return;
        }
        setOcrLoading(true);
        try {
            let result = electricValue;
            if (electricFile) {
                const res = await detectElectricOcr(electricFile, selectedRoom.id);
                result = res.data.data;
            }
            // TODO: Gọi API tạo service reading thủ công nếu nhập tay (nếu backend có)
            message.success(`Đã ghi nhận chỉ số điện: ${result}`);
            setElectricModalOpen(false);
            setElectricFile(null);
            setElectricValue("");
            if (onRoomsUpdate) onRoomsUpdate();
        } catch (err) {
            message.error("Lỗi khi ghi nhận chỉ số điện");
        } finally {
            setOcrLoading(false);
        }
    };

    const statusMenu = (room) => (
        <Menu
            onClick={({ key }) => {
                if (room.roomStatus !== key) {
                    handleStatusChange(room.id, key);
                }
            }}
            selectedKeys={[room.roomStatus]}
        >
            <Menu.Item key="Available">Available</Menu.Item>
            <Menu.Item key="Occupied">Occupied</Menu.Item>
            <Menu.Item key="Maintenance">Maintenance</Menu.Item>
            <Menu.Item key="Inactive">Inactive</Menu.Item>
        </Menu>
    );

    if (loading) {
        return (
            <Row gutter={[16, 16]}>
                {[...Array(6)].map((_, idx) => (
                    <Col key={idx} xs={24} sm={12} md={8}>
                        <Card><Skeleton active /></Card>
                    </Col>
                ))}
            </Row>
        );
    }
    
    return (
        <>
            <Row gutter={[16, 16]}>
                {rooms.map((room) => {
                    const imageUrl = room.images && room.images.length > 0
                        ? room.images[0].imageUrl
                        : "/img/room-default.png";
                    const currentStatusProps = getStatusProps(room.roomStatus);

                    return (
                        <Col key={room.id} xs={24} sm={12} md={8}>
                            <Card
                                cover={
                                    <img
                                        alt="room"
                                        src={imageUrl}
                                        style={{ height: 200, objectFit: "cover", width: "100%" }}
                                    />
                                }
                                actions={[
                                    <Button
                                        type="primary"
                                        onClick={() => navigate(`/landlord/rooms/${room.id}/edit`)}
                                        style={{ marginLeft: 8 }}
                                    >
                                        Edit
                                    </Button>,
                                    <Button
                                        type="default"
                                        onClick={() => navigate(`/landlord/rooms/${room.id}/assign`)}
                                        style={{ marginLeft: 8 }}
                                    >
                                        Assign Renter
                                    </Button>,
                                    <Button
                                        type="primary"
                                        danger
                                        style={{ marginLeft: 8 }}
                                        onClick={async () => {
                                            if (window.confirm('Are you sure you want to delete this room?')) {
                                                try {
                                                    await deleteRoom(room.id);
                                                    message.success('Room deleted successfully');
                                                    if (onRoomsUpdate) onRoomsUpdate();
                                                } catch (e) {
                                                    const backendMsg = e?.response?.data?.message || e?.response?.data?.error || 'Failed to delete room';
                                                    message.error(backendMsg);
                                                }
                                            }
                                        }}
                                    >
                                        Delete
                                    </Button>,
                                    <Dropdown overlay={statusMenu(room)} trigger={['click']} disabled={updatingId === room.id}>
                                        <a onClick={e => e.preventDefault()} style={{
                                            opacity: updatingId === room.id ? 0.5 : 1,
                                            cursor: updatingId === room.id ? 'wait' : 'pointer'
                                        }}>
                                            <Badge
                                                status={currentStatusProps.status}
                                                text={currentStatusProps.text}
                                            />
                                        </a>
                                    </Dropdown>,
                                    <Button type="dashed" onClick={() => openServiceModal(room)}>
                                        Thêm dịch vụ
                                    </Button>,
                                ]}
                            >
                                <Meta
                                    title={
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{room.roomNumber}</span>
                                            {room.building && (
                                                <span style={{ marginLeft: 8, fontWeight: 400, color: '#888', fontSize: 13 }}>
                                                    | {room.building}
                                                </span>
                                            )}
                                            <Tag 
                                                color={room.isActive ? "green" : "red"}
                                                onClick={() => handleToggleActive(room.id)}
                                                style={{
                                                    cursor: 'pointer',
                                                    opacity: togglingId === room.id ? 0.5 : 1
                                                }}
                                            >
                                                {room.isActive ? "Active" : "Inactive"}
                                            </Tag>
                                        </div>
                                    }
                                    description={
                                        <div>
                                            {room.building && (
                                                <div>Building: {room.building}</div>
                                            )}
                                            <div>Price: {room.pricePerMonth?.toLocaleString("en-US")} VND/month</div>
                                            {room.area && (
                                                <div>Area: {room.area} m²</div>
                                            )}
                                        </div>
                                    }
                                />
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
                okText="Add Service"
                confirmLoading={addingService}
                title={`Add service(s) to room ${selectedRoom?.roomNumber}`}
            >
                <Select
                    mode="multiple"
                    style={{ width: "100%" }}
                    placeholder="Select services"
                    value={selectedServices}
                    onChange={setSelectedServices}
                >
                    {services.map((s) => (
                        <Option key={s.id} value={s.id}>{s.serviceName} ({s.serviceType})</Option>
                    ))}
                </Select>
            </Modal>
            {/* Modal nhập chỉ số điện hoặc OCR */}
            <Modal
                open={electricModalOpen}
                onCancel={() => setElectricModalOpen(false)}
                onOk={handleElectricOcr}
                okText="Ghi nhận"
                confirmLoading={ocrLoading}
                title="Nhập chỉ số điện hoặc upload ảnh công tơ"
            >
                <Input
                    style={{ marginBottom: 12 }}
                    placeholder="Nhập số điện mới (nếu có)"
                    value={electricValue}
                    onChange={e => setElectricValue(e.target.value)}
                />
                <Upload
                    beforeUpload={file => { setElectricFile(file); return false; }}
                    accept="image/*"
                    maxCount={1}
                >
                    <Button>Chọn ảnh công tơ (OCR)</Button>
                </Upload>
            </Modal>
        </>
    );
}
