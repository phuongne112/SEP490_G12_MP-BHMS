import React, { useState } from "react";
import { Card, Row, Col, Button, Badge, Skeleton, Tag, Dropdown, Menu, message } from "antd";
import { updateRoomStatus, toggleRoomActiveStatus, deleteRoom } from "../../services/roomService"; 
import { useNavigate } from "react-router-dom";

const { Meta } = Card;

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
    );
}
