import React from "react";
import { Typography } from "antd";

const { Title } = Typography;

export default function PageHeader({ title, style }) {
  return (
    <Title level={3} style={{ margin: 0, ...(style || {}) }}>
      {title}
    </Title>
  );
}
