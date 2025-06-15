// ✅ RoomCard.jsx
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
  const getImageUrl = (img) => {
    if (!img) return null;
    if (typeof img === "string") return img.startsWith("http") || img.startsWith("/") ? img : `/${img}`;
    if (typeof img === "object" && img.imageUrl)
      return img.imageUrl.startsWith("http") || img.imageUrl.startsWith("/") ? img.imageUrl : `/${img.imageUrl}`;
    return null;
  };

  const img0 = getImageUrl(room.images?.[0]) || image1;
  const img1 = getImageUrl(room.images?.[1]) || image2;

  const status = room.roomStatus?.charAt(0).toUpperCase() + room.roomStatus?.slice(1).toLowerCase();

  return (
    <div
      style={{
        border: "1.5px solid #E0E0E0",
        borderRadius: 14,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        position: "relative",
        minWidth: 260,
        maxWidth: 320,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", position: "relative" }}>
        <img src={img0} alt="room" style={{ width: "100%", height: 90, objectFit: "cover" }} />
        <img src={img1} alt="room" style={{ width: "100%", height: 90, objectFit: "cover" }} />
        <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}>
          {statusIcon[status] || "❓"}
        </div>
      </div>
      <div style={{ padding: 16, textAlign: "center" }}>
        <div style={{ fontWeight: 500, fontSize: 17, marginBottom: 6 }}>
          {room.name || room.roomNumber || "Room"}
        </div>
        <div style={{ fontSize: 15, color: "#222", fontWeight: 600 }}>
          VND/month : {(room.price || room.pricePerMonth)?.toLocaleString()}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            fontWeight: 500,
            color:
              status === "Available"
                ? "green"
                : status === "Occupied"
                ? "#f56c6c"
                : status === "Maintenance"
                ? "#FFC700"
                : "#999",
          }}
        >
          Status: {status || "Unknown"}
        </div>
      </div>
    </div>
  );
}