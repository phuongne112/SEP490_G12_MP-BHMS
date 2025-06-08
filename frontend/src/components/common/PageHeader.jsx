import React from "react";
import { Typography } from "antd";

const { Title } = Typography;

export default function PageHeader({ title }) {
  return (
    <Title level={3} style={{ margin: 0 }}>
      {title}
    </Title>
  );
}
