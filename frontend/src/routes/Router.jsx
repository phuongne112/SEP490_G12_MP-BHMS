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
import Error404 from "../pages/Error404";
import AdminRoute from "./AdminRoute";
import LandlordRoute from "./LandlordRoute";
import RenterRoute from "./RenterRoute";
import GuestRoute from "./GuestRoute";
import LandlordRenterListPage from "../pages/landlord/LandlordRenterListPage";
import LandlordRoomListPage from "../pages/landlord/LandlordRoomListPage";
import LandlordRoomDetailPage from "../pages/landlord/LandlordRoomDetailPage";


import LandlordServiceListPage from "../pages/landlord/LandlordServiceListPage";
import LandlordElectricListPage from "../pages/landlord/LandlordElectricListPage";
import LandlordContractListPage from "../pages/landlord/LandlordContractListPage";
import RenterRoomDetailPage from "../pages/renter/RenterRoomDetailPage";
import LandlordAssignRenterPage from "../pages/landlord/LandlordAssignRenterPage";
import RoomDetailPage from "../pages/RoomDetailPage";

import LandlordBillListPage from "../pages/landlord/LandlordBillListPage";

import LandlordBillDetailPage from "../pages/landlord/LandlordBillDetailPage";
import LandlordBookAppointmentPage from "../pages/landlord/LandlordBookAppointmentPage";

import RenterBillListPage from "../pages/renter/RenterBillListPage";
import RenterBillDetailPage from "../pages/renter/RenterBillDetailPage";
import LandlordAssetListPage from "../pages/landlord/LandlordAssetListPage";
import UserRoute from "./UserRoute";
import LandlordBookingListPage from "../pages/landlord/LandlordBookingListPage";
import RenterContractPage from "../pages/renter/RenterContractPage";
import RenterCheckinAssetPage from "../pages/renter/RenterCheckinAssetPage";
import RenterCheckoutAssetPage from "../pages/renter/RenterCheckoutAssetPage";
import LandlordContractTemplateManager from "../pages/landlord/LandlordContractTemplateManager";
import LandlordLayout from '../components/layout/LandlordLayout';
import RenterVnPayReturnPage from '../pages/renter/RenterVnPayReturnPage';
import PaymentSuccessPage from '../pages/PaymentSuccessPage';
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import LandlordDashboardPage from "../pages/landlord/LandlordDashboardPage";
import RenterDashboardPage from "../pages/renter/RenterDashboardPage";
import AboutPage from "../pages/AboutPage";

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
      <Route path="/about" element={<AboutPage />} />
      <Route path="/rooms/:roomNumber" element={<RoomDetailPage />} />
      <Route path="/forgotPassword" element={<ForgotPasswordPage />} />
      <Route path="/resetPassword" element={<ResetPasswordPage />} />
      <Route path="/layout/adminSidebar" element={<AdminSidebar />} />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        }
      />
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
      <Route
        path="/admin/rooms"
        element={
          <AdminRoute>
            <LandlordRoomListPage />
          </AdminRoute>
        }
      />


      <Route
        path="/admin/rooms/:roomId/assign"
        element={
          <AdminRoute>
            <LandlordAssignRenterPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/contract"
        element={
          <AdminRoute>
            <LandlordContractListPage />
          </AdminRoute>
        }
      />

      {/* Landlord Routes - bọc trong LandlordLayout */}
      <Route
        path="/landlord"
        element={
          <LandlordRoute>
            <LandlordLayout />
          </LandlordRoute>
        }
      >
        <Route path="dashboard" element={<LandlordDashboardPage />} />
        <Route path="renters" element={<LandlordRenterListPage />} />
        <Route path="rooms" element={<LandlordRoomListPage />} />
        <Route path="rooms/:id" element={<LandlordRoomDetailPage />} />

        <Route path="services" element={<LandlordServiceListPage />} />
        <Route path="electric" element={<LandlordElectricListPage />} />
        <Route path="contract" element={<LandlordContractListPage />} />
        <Route path="rooms/:roomId/assign" element={<LandlordAssignRenterPage />} />

        <Route path="bills" element={<LandlordBillListPage />} />

        <Route path="bills/:id" element={<LandlordBillDetailPage />} />

        <Route path="assets" element={<LandlordAssetListPage />} />
        <Route path="bookings" element={<LandlordBookingListPage />} />
        <Route path="contract-templates" element={<LandlordContractTemplateManager />} />
      </Route>

      {/* Đặt lịch hẹn: route riêng ngoài LandlordRoute */}
      <Route path="/landlord/rooms/:roomId/book" element={<UserRoute><LandlordBookAppointmentPage /></UserRoute>} />

      {/* Renter Routes */}
      <Route
        path="/renter/room"
        element={
          <RenterRoute>
            <RenterRoomDetailPage />
          </RenterRoute>
        }
      />
      <Route
        path="/renter/contracts"
        element={
          <RenterRoute>
            <RenterContractPage />
          </RenterRoute>
        }
      />
      <Route
        path="/renter/bills"
        element={
          <RenterRoute>
            <RenterBillListPage />
          </RenterRoute>
        }
      />
      <Route
        path="/renter/bills/:id"
        element={
          <RenterRoute>
            <RenterBillDetailPage />
          </RenterRoute>
        }
      />
      <Route path="/renter/bills/:id/vnpay-return" element={<RenterVnPayReturnPage />} />
      <Route
        path="/renter/rooms/checkin-assets"
        element={
          <RenterRoute>
            <RenterCheckinAssetPage />
          </RenterRoute>
        }
      />
      <Route
        path="/renter/rooms/checkout-assets"
        element={
          <RenterRoute>
            <RenterCheckoutAssetPage />
          </RenterRoute>
        }
      />
      <Route
        path="/renter/dashboard"
        element={
          <RenterRoute>
            <RenterDashboardPage />
          </RenterRoute>
        }
      />

      {/* Common Routes */}
      <Route path="/room" element={<RoomSection />} />
      <Route path="/403" element={<Error403 />} />
      <Route path="/404" element={<Error404 />} />
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/payment-success" element={<PaymentSuccessPage />} />
      <Route path="*" element={<Error404 />} />
    </Routes>
  );
}
