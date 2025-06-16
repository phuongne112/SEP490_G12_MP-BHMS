import React from "react";
import { Layout, Menu } from "antd";
import { useNavigate } from "react-router-dom";
import SidebarLogo from "./SidebarLogo";
import { useLocation } from "react-router-dom";

const { Sider } = Layout;

export default function Sidebar({
  name,
  avatar,
  menuItems = [],
  defaultKey = "1",
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = ({ key }) => {
    const clickedItem = menuItems.find((item) => item.key === key);
    if (clickedItem && clickedItem.path) {
      navigate(clickedItem.path);
    }
  };
  return (
    <Sider
      width={220}
      style={{
        background: "#001529",
        position: "fixed",
        top: 0,
        left: 0,
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center" }}>
        <SidebarLogo onClick={() => navigate("/home")} />
      </div>
      <div
        style={{
          height: "100vh",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: 8,
            padding: "12px 16px",
            margin: "16px",
          }}
        >
          <div>
            <div style={{ fontWeight: 500, fontSize: 12, color: "white" }}>
              Hello
            </div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 13,
                color: "white",
                maxWidth: 100, // hoặc 120 tùy theo layout
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
              title={name} // để hover vẫn xem đầy đủ tên
            >
              {name}
            </div>
          </div>
          <img
            src={avatar}
            alt="avatar"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        </div>
        <div
          style={{
            height: 1,
            background: "white",
            opacity: 0.3,
            margin: "8px 16px",
          }}
        ></div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={handleClick}
        >
          {menuItems.map((item) => (
            <Menu.Item key={item.path} icon={item.icon}>
              {item.label}
            </Menu.Item>
          ))}
        </Menu>
      </div>
    </Sider>
  );
}
