import React from "react";
import { Routes, Route } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import HomePage from "../pages/HomePage";
import Register from "../pages/RegisterPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import AdminUserListPage from "../pages/admin/AdminUserListPage";
import AdminSidebar from "../components/layout/AdminSidebar";
import AdminNotificationPage from "../pages/admin/AdminNotificationPage";
import AdminRoleListPage from "../pages/admin/AdminRoleListPage";
import AdminPermissionListPage from "../pages/admin/AdminPermissionListPage";
import RoomSection from "../components/home/RoomSection";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/forgotPassword" element={<ForgotPasswordPage />} />
      <Route path="/resetPassword" element={<ResetPasswordPage />} />
      <Route path="/layout/adminSidebar" element={<AdminSidebar />} />
      <Route path="/admin/users" element={<AdminUserListPage />} />
      <Route path="/admin/notification" element={<AdminNotificationPage />} />
      <Route path="/admin/roles" element={<AdminRoleListPage />} />
      <Route path="/admin/permissions" element={<AdminPermissionListPage />} />
      <Route path="*" element={<LoginPage />} />
      <Route path="/room" element={<RoomSection />} />
    </Routes>
  );
}
