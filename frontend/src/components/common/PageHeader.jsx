import React from "react";
import { Typography } from "antd";

const { Title } = Typography;

export default function PageHeader({ title, style }) {
  return (
    <Title
      level={3}
      style={{
        margin: 0,
        // Keep the header readable on smaller screens
        fontSize: "clamp(16px, 2.4vw, 24px)",
        flexShrink: 0,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        // Keep natural min-width so it doesn't collapse to 0
        minWidth: "auto",
        ...(style || {}),
      }}
    >
      {title}
    </Title>
  );
}
