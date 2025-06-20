import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import Error403 from "../pages/Error403";
import AdminRoute from "./AdminRoute";
import GuestRoute from "./GuestRoute";
import LandlordRenterListPage from "../pages/landlord/LandlordRenterListPage";
import LandlordRoomListPage from "../pages/landlord/LandlordRoomListPage";
import LandlordAddRenterPage from "../pages/landlord/LandlordAddRenterPage";
import LandlordServiceListPage from "../pages/landlord/LandlordServiceListPage";

export default function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/signUp"
        element={
          <GuestRoute>
            <Register />
          </GuestRoute>
        }
      />
      <Route path="/home" element={<HomePage />} />
      <Route path="/forgotPassword" element={<ForgotPasswordPage />} />
      <Route path="/resetPassword" element={<ResetPasswordPage />} />
      <Route path="/layout/adminSidebar" element={<AdminSidebar />} />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUserListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/notification"
        element={
          <AdminRoute>
            <AdminNotificationPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <AdminRoute>
            <AdminRoleListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/permissions"
        element={
          <AdminRoute>
            <AdminPermissionListPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Error403 />} />
      <Route path="/room" element={<RoomSection />} />
      <Route path="/landlord/renters" element={<LandlordRenterListPage />} />
      <Route path="/landlord/rooms" element={<LandlordRoomListPage />} />
      <Route path="/403" element={<Error403 />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/landlord/renters/add" element={<LandlordAddRenterPage />} />
      <Route path="/landlord/services" element={<LandlordServiceListPage />} />
    </Routes>
  );
}
