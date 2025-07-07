import React from 'react';
import { Outlet } from 'react-router-dom';
import LandlordSidebar from './LandlordSidebar';

export default function LandlordLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <LandlordSidebar />
      <div style={{ flex: 1, background: '#f7f7f7' }}>
        <Outlet />
      </div>
    </div>
  );
} 