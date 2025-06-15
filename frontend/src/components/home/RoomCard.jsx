import React from "react";
import image1 from "../../assets/RoomImage/image1.png";
import image2 from "../../assets/RoomImage/image2.png";

const iconStyle = {
  fontSize: 22,
  fontWeight: 700,
  background: "#fff",
  borderRadius: "50%",
  padding: 2,
  boxShadow: "0 1px 4px #0001",
};

const statusIcon = {
  Available: <span style={{ ...iconStyle, color: "#1BC700" }}>✔️</span>,
  Occupied: <span style={{ ...iconStyle, color: "#E53935" }}>⛔</span>,
  Maintenance: <span style={{ ...iconStyle, color: "#FFC107" }}>🛠️</span>,
  Inactive: <span style={{ ...iconStyle, color: "#999" }}>🚫</span>,
};

export default function RoomCard({ room }) {
  if (!room) return <div>Room not found</div>;

  const { name, status, images = [] } = room;

  const getImageUrl = (img) => {
    if (!img) return null;
    if (img.startsWith("http") || img.startsWith("data:")) return img;
    return img === "image1" ? image1 : image2;
  };

  return (
    <div className="room-card">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3>{name || "Tên phòng chưa đặt"}</h3>
        {statusIcon[status] || <span style={iconStyle}>❓</span>}
      </div>
      <div>
        {images.length > 0 ? (
          <img
            src={getImageUrl(images[0])}
            alt="Room"
            style={{ width: "100%", borderRadius: 8 }}
          />
        ) : (
          <div style={{ color: "#999", fontStyle: "italic" }}>Không có ảnh</div>
        )}
      </div>
    </div>
  );
}
