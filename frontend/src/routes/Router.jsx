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
import LandlordRoute from "./LandlordRoute";
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
import LandlordEditRoomPage from "../pages/landlord/LandlordEditRoomPage";
import LandlordBillListPage from "../pages/landlord/LandlordBillListPage";
import LandlordBillCreatePage from "../pages/landlord/LandlordBillCreatePage";
import LandlordBillDetailPage from "../pages/landlord/LandlordBillDetailPage";
import LandlordBookAppointmentPage from "../pages/landlord/LandlordBookAppointmentPage";
import LandlordUserListPage from "../pages/landlord/LandlordUserListPage";
import RenterBillListPage from '../pages/renter/RenterBillListPage';
import RenterBillDetailPage from '../pages/renter/RenterBillDetailPage';
import LandlordAssetListPage from "../pages/landlord/LandlordAssetListPage";
import UserRoute from "./UserRoute";
import RenterContractListPage from "../pages/renter/RenterContractListPage";

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
      <Route path="/403" element={<Error403 />} />
      <Route path="/" element={<Navigate to="/home" replace />} />
      
      {/* Landlord Routes */}
      <Route
        path="/landlord/renters"
        element={
          <LandlordRoute>
            <LandlordRenterListPage />
          </LandlordRoute>
        }
      />
      <Route
        path="/landlord/rooms"
        element={
          <LandlordRoute>
            <LandlordRoomListPage />
          </LandlordRoute>
        }
      />
      <Route
        path="/landlord/rooms/add"
        element={
          <LandlordRoute>
            <LandlordAddRoomPage />
          </LandlordRoute>
        }
      />
      <Route
        path="/landlord/renters/add"
        element={
          <LandlordRoute>
            <LandlordAddRenterPage />
          </LandlordRoute>
        }
      />
      <Route
        path="/landlord/services"
        element={
          <LandlordRoute>
            <LandlordServiceListPage />
          </LandlordRoute>
        }
      />
      <Route
        path="/landlord/electric"
        element={
          <LandlordRoute>
            <LandlordElectricListPage />
          </LandlordRoute>
        }
      />
      <Route
        path="/landlord/contract"
        element={
          <LandlordRoute>
            <LandlordContractListPage />
          </LandlordRoute>
        }
      />
      <Route
        path="/landlord/rooms/:roomId/assign"
        element={
          <LandlordRoute>
            <LandlordAssignRenterPage />
          </LandlordRoute>
        }
      />
      <Route
        path="/landlord/rooms/:id/edit"
        element={
          <LandlordRoute>
            <LandlordEditRoomPage />
          </LandlordRoute>
        }
      />
      <Route
        path="/landlord/bills"
        element={
          <LandlordRoute>
            <LandlordBillListPage />
          </LandlordRoute>
        }
      />
      <Route
        path="/landlord/bills/create"
        element={
          <LandlordRoute>
            <LandlordBillCreatePage />
          </LandlordRoute>
        }
      />
      <Route
        path="/landlord/bills/:id"
        element={
          <LandlordRoute>
            <LandlordBillDetailPage />
          </LandlordRoute>
        }
      />
      <Route
        path="/landlord/rooms/:roomId/book"
        element={
          <UserRoute>
            <LandlordBookAppointmentPage />
          </UserRoute>
        }
      />
      <Route
        path="/landlord/users"
        element={
          <LandlordRoute>
            <LandlordUserListPage />
          </LandlordRoute>
        }
      />
      <Route
        path="/landlord/assets"
        element={
          <LandlordRoute>
            <LandlordAssetListPage />
          </LandlordRoute>
        }
      />
      
      {/* Renter Routes */}
      <Route path="/renter/room" element={<RenterRoomDetailPage />} />
      <Route path="/renter/bills" element={<RenterBillListPage />} />
      <Route path="/renter/bills/:id" element={<RenterBillDetailPage />} />
      <Route
        path="/renter/contracts"
        element={
          <UserRoute>
            <RenterContractListPage />
          </UserRoute>
        }
      />
    </Routes>
  );
}
