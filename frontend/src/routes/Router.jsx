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
import LandlordAddRoomPage from "../pages/landlord/LandlordAddRoomPage";
import LandlordAddRenterPage from "../pages/landlord/LandlordAddRenterPage";
import LandlordServiceListPage from "../pages/landlord/LandlordServiceListPage";
import LandlordElectricListPage from "../pages/landlord/LandlordElectricListPage";
import LandlordContractListPage from "../pages/landlord/LandlordContractListPage";
import RenterRoomDetailPage from "../pages/renter/RenterRoomDetailPage";
import LandlordAssignRenterPage from "../pages/landlord/LandlordAssignRenterPage";
import RoomDetailPage from "../pages/RoomDetailPage";

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
      <Route path="/rooms/:roomNumber" element={<RoomDetailPage />} />
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
      <Route path="/landlord/rooms/add" element={<LandlordAddRoomPage />} />
      <Route path="/403" element={<Error403 />} />
      <Route path="/" element={<Navigate to="/home" replace />} />

      <Route path="/landlord/renters/add" element={<LandlordAddRenterPage />} />
      <Route path="/landlord/services" element={<LandlordServiceListPage />} />
      <Route path="/landlord/electric" element={<LandlordElectricListPage />} />
      <Route path="/landlord/contract" element={<LandlordContractListPage />} />

      <Route path="/renter/room" element={<RenterRoomDetailPage />} />
      <Route
        path="/landlord/rooms/:roomId/assign"
        element={<LandlordAssignRenterPage />}
      />
    </Routes>
  );
}
