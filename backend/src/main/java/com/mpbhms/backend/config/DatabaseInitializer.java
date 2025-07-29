package com.mpbhms.backend.config;

import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.entity.Permission;
import com.mpbhms.backend.entity.Role;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.entity.ContractTemplate;
import com.mpbhms.backend.entity.ServicePriceHistory;
import com.mpbhms.backend.enums.ServiceType;
import com.mpbhms.backend.repository.PermissionRepository;
import com.mpbhms.backend.repository.RoleRepository;
import com.mpbhms.backend.repository.ServiceRepository;
import com.mpbhms.backend.repository.ServicePriceHistoryRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.repository.ContractTemplateRepository;
import lombok.AllArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class DatabaseInitializer implements CommandLineRunner {

    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ServiceRepository serviceRepository;
    private final ServicePriceHistoryRepository servicePriceHistoryRepository;
    private final ContractTemplateRepository contractTemplateRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        System.out.println(">>> START INIT DATABASE <<<");

        long countPermissions = permissionRepository.count();
        long countRoles = roleRepository.count();
        long countUsers = userRepository.count();
        long countServices = serviceRepository.count();
        long countContractTemplates = contractTemplateRepository.count();

        // --- Init Permissions ---
        if (countPermissions == 0) {
            List<Permission> permissions = new ArrayList<>();
            //Rooms
            permissions.add(new Permission("Update Room", "/mpbhms/rooms/{id}", "POST", "Room"));
            permissions.add(new Permission("Update Room Status", "/mpbhms/rooms/{id}/status", "PATCH", "Room"));
            permissions.add(new Permission("Delete Room", "/mpbhms/rooms/{id}", "DELETE", "Room"));
            permissions.add(new Permission("Create Room", "/mpbhms/rooms", "POST", "Room"));
            permissions.add(new Permission("View Room", "/mpbhms/rooms", "GET", "Room"));
            permissions.add(new Permission("Add Service to Room", "/mpbhms/rooms/{roomId}/add-service", "POST", "Room"));
            permissions.add(new Permission("Active/ De-Active Room", "/mpbhms/rooms/{id}/active", "PATCH", "Room"));
            permissions.add(new Permission("Restore Room", "/mpbhms/rooms/{id}/restore", "PATCH", "Room"));
            permissions.add(new Permission("View Deleted Rooms", "/mpbhms/rooms/deleted", "GET", "Room"));
            permissions.add(new Permission("View Room with Renter", "/mpbhms/rooms/with-renter", "GET", "Room"));
            permissions.add(new Permission("Get Room by ID", "/mpbhms/rooms/{id}", "GET", "Room"));
            permissions.add(new Permission("Delete service of room", "/mpbhms/rooms/{roomId}/remove-service/{serviceId}", "DELETE", "Room"));
            permissions.add(new Permission("De-Active service of room", "/mpbhms/rooms/{roomId}/deactivate-service/{serviceId}", "PATCH", "Room"));
            //User
            permissions.add(new Permission("Create User", "/mpbhms/users", "POST", "User"));
            permissions.add(new Permission("Update User", "/mpbhms/users", "PUT", "User"));
            permissions.add(new Permission("Get User", "/mpbhms/users", "GET", "User"));
            permissions.add(new Permission("Active/ De-Active User", "/mpbhms/users/{id}/active", "PUT", "User"));
            permissions.add(new Permission("Get My User Info", "/mpbhms/users/me/info", "GET", "User"));
            permissions.add(new Permission("Update My User Info", "/mpbhms/users/me/info", "PUT", "User"));
            permissions.add(new Permission("Add My User Info", "/mpbhms/users/me/info", "POST", "User"));
            permissions.add(new Permission("Get My User Account", "/mpbhms/users/me/account", "GET", "User"));
            permissions.add(new Permission("Update My User Account", "/mpbhms/users/me/account", "PUT", "User"));
            //Auth
            permissions.add(new Permission("Change Password", "/mpbhms/auth/change-password", "PUT", "Auth"));
            permissions.add(new Permission("Request Reset Password", "/mpbhms/auth/request-reset", "POST", "Auth"));
            permissions.add(new Permission("Reset Password", "/mpbhms/auth/reset-password", "POST", "Auth"));
            //Roles
            permissions.add(new Permission("Create Role", "/mpbhms/roles", "POST", "Role"));
            permissions.add(new Permission("Update Role", "/mpbhms/roles", "PUT", "Role"));
            permissions.add(new Permission("Delete Role", "/mpbhms/roles/{id}", "DELETE", "Role"));
            permissions.add(new Permission("View Roles", "/mpbhms/roles", "GET", "Role"));
            //Notification
            permissions.add(new Permission("Create Notification", "/mpbhms/notifications", "POST", "Notification"));
            permissions.add(new Permission("Update Notification", "/mpbhms/notifications", "PUT", "Notification"));
            permissions.add(new Permission("Delete Notification", "/mpbhms/notifications/{id}", "DELETE", "Notification"));
            permissions.add(new Permission("View Notification", "/mpbhms/notifications/all", "GET", "Notification"));
            permissions.add(new Permission("Create Notification Send", "/mpbhms/notifications/send", "POST", "Notification"));
            permissions.add(new Permission("Create Multiple Notifications Send", "/mpbhms/notifications/send-multiple", "POST", "Notification"));
            permissions.add(new Permission("View My Notification", "/mpbhms/notifications", "GET", "Notification"));
            permissions.add(new Permission("Mark Notification as Read", "/mpbhms/notifications/{id}/read", "PUT", "Notification"));
            //Permissions
            permissions.add(new Permission("Create Permission", "/mpbhms/permissions", "POST", "Permission"));
            permissions.add(new Permission("Update Permission", "/mpbhms/permissions", "PUT", "Permission"));
            permissions.add(new Permission("Delete Permission", "/mpbhms/permissions/{id}", "DELETE", "Permission"));
            permissions.add(new Permission("View Permissions", "/mpbhms/permissions", "GET", "Permission"));
            //Room User
            permissions.add(new Permission("Assign user to Room", "/mpbhms/room-users/add-many", "POST", "RoomUser"));
            permissions.add(new Permission("Leave Room", "/mpbhms/room-users/leave/{roomUserId}", "POST", "RoomUser"));
            permissions.add(new Permission("Process Expired Contracts", "/mpbhms/room-users/process-expired-contracts", "POST", "RoomUser"));
            permissions.add(new Permission("Renew Contract", "/mpbhms/room-users/renew-contract/{contractId}", "POST", "RoomUser"));
            permissions.add(new Permission("Get Expiring Contracts", "/mpbhms/room-users/expiring-contracts", "GET", "RoomUser"));
            permissions.add(new Permission("Update Contract", "/mpbhms/room-users/update-contract", "POST", "RoomUser"));
            permissions.add(new Permission("Terminate Contract", "/mpbhms/room-users/request-terminate-contract/{contractId}", "POST", "RoomUser"));
            permissions.add(new Permission("Approve Amendment", "/mpbhms/room-users/approve-amendment/{amendmentId}", "POST", "RoomUser"));
            permissions.add(new Permission("Reject Amendment", "/mpbhms/room-users/reject-amendment/{amendmentId}", "POST", "RoomUser"));
            permissions.add(new Permission("Get Contract Amendments", "/mpbhms/room-users/contract-amendments/{contractId}", "GET", "RoomUser"));
            permissions.add(new Permission("Get My Room", "/mpbhms/room-users/my-room", "GET", "RoomUser"));
            //Contract
            permissions.add(new Permission("Export contract", "/mpbhms/contracts/{id}/export", "GET", "Contract"));
            permissions.add(new Permission("View List Contract", "/mpbhms/contracts", "GET", "Contract"));
            permissions.add(new Permission("Get List Contract By Room", "/mpbhms/contracts/by-room", "GET", "Contract"));
            permissions.add(new Permission("Create Contract", "/mpbhms/contracts", "POST", "Contract"));
            permissions.add(new Permission("Update Contract", "/mpbhms/contracts", "PUT", "Contract"));
            permissions.add(new Permission("Delete Contract", "/mpbhms/contracts/{id}", "DELETE", "Contract"));
            permissions.add(new Permission("Test Update User Info", "/mpbhms/contracts/test-update-user-info", "GET", "Contract"));
            permissions.add(new Permission("Get My Contracts", "/mpbhms/contracts/my-contracts", "GET", "Contract"));
            permissions.add(new Permission("Get List Contracts History", "/mpbhms/contracts/room/{roomId}/history", "GET", "Contract"));
            permissions.add(new Permission("Get Contract Amendments History", "/mpbhms/contracts/amendments/{contractId}", "GET", "Contract"));
            //OCR
            permissions.add(new Permission("OCR", "/mpbhms/ocr/detect-ocr", "POST", "Ocr"));
            permissions.add(new Permission("Save Reading", "/mpbhms/ocr/save-reading", "POST", "Ocr"));
            permissions.add(new Permission("Save Image Only", "/mpbhms/ocr/save-image-only", "POST", "Ocr"));
            permissions.add(new Permission("Enable Auto Scan", "/mpbhms/ocr/auto-scan/on", "POST", "Ocr"));
            permissions.add(new Permission("Disable Auto Scan", "/mpbhms/ocr/auto-scan/off", "POST", "Ocr"));
            permissions.add(new Permission("Get Auto Scan Status", "/mpbhms/ocr/auto-scan/status", "GET", "Ocr"));
            permissions.add(new Permission("Get Scan Logs", "/mpbhms/ocr/scan-logs", "GET", "Ocr"));
            permissions.add(new Permission("Update Scan Folder", "/mpbhms/rooms/{id}/scan-folder", "PATCH", "Room"));
            permissions.add(new Permission("Get Scan Images", "/mpbhms/ocr/scan-images", "GET", "Ocr"));
            permissions.add(new Permission("Get Current Scanning Image", "/mpbhms/ocr/current-scanning-image", "GET", "Ocr"));
            permissions.add(new Permission("OCR CCCD", "/mpbhms/ocr/cccd", "POST", "Ocr"));
            permissions.add(new Permission("Get Scan Interval", "/mpbhms/ocr/auto-scan/interval", "GET", "Ocr"));
            permissions.add(new Permission("Set Scan Interval", "/mpbhms/ocr/auto-scan/interval", "POST", "Ocr"));
            //Bill
            permissions.add(new Permission("Generate first", "/mpbhms/bills/generate-first", "POST", "Bill"));
            permissions.add(new Permission("Generate", "/mpbhms/bills/generate", "POST", "Bill"));
            permissions.add(new Permission("Create Bill", "/mpbhms/bills/create", "POST", "Bill"));
            permissions.add(new Permission("Get Bill by id", "/mpbhms/bills/{id}", "GET", "Bill"));
            permissions.add(new Permission("Get All Bills", "/mpbhms/bills", "GET", "Bill"));
            permissions.add(new Permission("Create Custom Bills", "/mpbhms/bills/custom", "POST", "Bill"));
            permissions.add(new Permission("Get My Bills", "/mpbhms/bills/my", "GET", "Bill"));
            permissions.add(new Permission("Delete Bill", "/mpbhms/bills/{id}", "DELETE", "Bill"));
            permissions.add(new Permission("Generate", "/mpbhms/bills/service-bill", "POST", "Bill"));
            permissions.add(new Permission("Export Bill", "/mpbhms/bills/{id}/export", "GET", "Bill"));
            permissions.add(new Permission("Send bill to Email", "/mpbhms/bills/send-email/{billId}", "POST", "Bill"));
            permissions.add(new Permission("Dashboard Bill Stats", "/mpbhms/bills/dashboard-stats", "GET", "Bill"));
            permissions.add(new Permission("Bulk Generate Bills", "/mpbhms/bills/bulk-generate", "POST", "Bill"));
            permissions.add(new Permission("Update Bill Payment Status", "/mpbhms/bills/{id}/payment-status", "PUT", "Bill"));
            permissions.add(new Permission("Create Late Penalty Bill", "/mpbhms/bills/{id}/create-penalty", "POST", "Bill"));
            permissions.add(new Permission("Check And Create Late Penalties", "/mpbhms/bills/check-and-create-penalties", "POST", "Bill"));
            permissions.add(new Permission("Get Overdue Bills", "/mpbhms/bills/overdue", "GET", "Bill"));
            //Renter
            permissions.add(new Permission("Get Renter List", "/mpbhms/renters", "GET", "Renter"));
            permissions.add(new Permission("Create new Renter", "/mpbhms/renters", "POST", "Renter"));
            permissions.add(new Permission("Change renter status", "/mpbhms/renters/{id}/status", "PUT", "Renter"));
            permissions.add(new Permission("Get Renters for Assign", "/mpbhms/renters/for-assign", "GET", "Renter"));
            permissions.add(new Permission("Get Renters for Assign Full", "/mpbhms/renters/for-assign-full", "GET", "Renter"));
            permissions.add(new Permission("Get Renter by ID", "/mpbhms/renters/{id}", "GET", "Renter"));
            //Service
            permissions.add(new Permission("Create Service", "/mpbhms/services", "POST", "Service"));
            permissions.add(new Permission("Update Service", "/mpbhms/services/{id}", "PUT", "Service"));
            permissions.add(new Permission("Delete Service", "/mpbhms/services/{id}", "DELETE", "Service"));
            permissions.add(new Permission("View Services", "/mpbhms/services", "GET", "Service"));
            permissions.add(new Permission("View All Services", "/mpbhms/services/all", "GET", "Service"));
            permissions.add(new Permission("Get Service by ID", "/mpbhms/services/{id}", "GET", "Service"));
            permissions.add(new Permission("Get reading service", "/mpbhms/services/readings", "GET", "Service"));
            permissions.add(new Permission("Update Service Price", "/mpbhms/services/{id}/price", "PUT", "Service"));
            permissions.add(new Permission("Get Service Price History", "/mpbhms/services/{id}/price-history", "GET", "Service"));
            permissions.add(new Permission("Delete Service Price History", "/mpbhms/services/price-history/{historyId}", "DELETE", "Service"));
            permissions.add(new Permission("Get Service Price At Date", "/mpbhms/services/{id}/price-at-date", "GET", "Service"));
            //Schedule
            permissions.add(new Permission("Create Schedule", "/mpbhms/schedules", "POST", "Schedule"));
            permissions.add(new Permission("Get All Schedules", "/mpbhms/schedules", "GET", "Schedule"));
            permissions.add(new Permission("Get Schedule", "/mpbhms/schedules/{id}", "GET", "Schedule"));
            permissions.add(new Permission("Update Schedule Status", "/mpbhms/schedules/{id}/status", "PATCH", "Schedule"));
            permissions.add(new Permission("Update Schedule", "/mpbhms/schedules/{id}", "PUT", "Schedule"));
            permissions.add(new Permission("Delete Schedule", "/mpbhms/schedules/{id}", "DELETE", "Schedule"));
            permissions.add(new Permission("Get My Schedules", "/mpbhms/schedules/my", "GET", "Schedule"));
            //Asset
            permissions.add(new Permission("Create Asset", "/mpbhms/assets", "POST", "Asset"));
            permissions.add(new Permission("Update Asset", "/mpbhms/assets/{id}", "PUT", "Asset"));
            permissions.add(new Permission("Delete Asset", "/mpbhms/assets/{id}", "DELETE", "Asset"));
            permissions.add(new Permission("View Assets", "/mpbhms/assets", "GET", "Asset"));
            permissions.add(new Permission("Get Asset by ID", "/mpbhms/assets/{id}", "GET", "Asset"));
            permissions.add(new Permission("Assign Asset To Room", "/mpbhms/assets/{assetId}/assign-room", "POST", "Asset"));
            // Asset check-in/check-out (nếu có API riêng)
            permissions.add(new Permission("Check-in/Check-out Asset", "/mpbhms/assets/checkin", "POST", "Asset"));
            //Electric Reading
            permissions.add(new Permission("Create Electric Reading", "/mpbhms/electric-readings", "POST", "ElectricReading"));
            permissions.add(new Permission("Update Electric Reading", "/mpbhms/electric-readings/{id}", "PUT", "ElectricReading"));
            permissions.add(new Permission("Delete Electric Reading", "/mpbhms/electric-readings/{id}", "DELETE", "ElectricReading"));
            permissions.add(new Permission("View Electric Readings", "/mpbhms/electric-readings", "GET", "ElectricReading"));
            permissions.add(new Permission("Get Electric Reading by ID", "/mpbhms/electric-readings/{id}", "GET", "ElectricReading"));
            //Asset-Inventory
            permissions.add(new Permission("Asset Checkin", "/mpbhms/asset-inventory/checkin", "POST", "AssetInventory"));
            permissions.add(new Permission("Asset List By Room Contract", "/mpbhms/asset-inventory/by-room-contract", "GET", "AssetInventory"));
            permissions.add(new Permission("Asset List By Room ", "/mpbhms/asset-inventory/by-room", "GET", "AssetInventory"));
            //Payment
            permissions.add(new Permission("Create VN pay Url", "/mpbhms/payment/create-vnpay-url", "POST", "Payment"));
            permissions.add(new Permission("Payment return", "/mpbhms/payment/vnpay-return", "GET", "Payment"));
            permissions.add(new Permission("Payment ipn", "/mpbhms/payment/vnpay-ipn", "GET", "Payment"));
            // Contract Template Permissions
            permissions.add(new Permission("View All Contract Templates", "/mpbhms/contract-templates", "GET", "ContractTemplate"));
            permissions.add(new Permission("View Contract Template By ID", "/mpbhms/contract-templates/{id}", "GET", "ContractTemplate"));
            permissions.add(new Permission("Create or Update Contract Template", "/mpbhms/contract-templates", "POST", "ContractTemplate"));
            permissions.add(new Permission("Delete Contract Template", "/mpbhms/contract-templates/{id}", "DELETE", "ContractTemplate"));
            permissions.add(new Permission("Set Default Contract Template", "/mpbhms/contract-templates/{id}/set-default", "POST", "ContractTemplate"));
            permissions.add(new Permission("View Rooms With Electric Readings", "/mpbhms/rooms/with-electric-readings", "GET", "Room"));
            // Room Asset
            permissions.add(new Permission("Add Room Asset to Room", "/mpbhms/room-assets", "POST", "RoomAsset"));
            permissions.add(new Permission("Get Assets by Room", "/mpbhms/room-assets/by-room", "GET", "RoomAsset"));
            permissions.add(new Permission("Get Assets by Room Number", "/mpbhms/room-assets/by-room-number", "GET", "RoomAsset"));
            permissions.add(new Permission("Update Room Asset", "/mpbhms/room-assets/{id}", "PUT", "RoomAsset"));
            permissions.add(new Permission("Delete Room Asset", "/mpbhms/room-assets/{id}", "DELETE", "RoomAsset"));

            permissions = permissionRepository.saveAll(permissions);
        }

        // --- Init Roles ---
        if (countRoles == 0) {
            // Khai báo 1 lần ở đây
            Permission viewMyNotification = permissionRepository.findByModuleAndApiPathAndMethod(
                "Notification", "/mpbhms/notifications", "GET"
            );
            Permission markReadNotification = permissionRepository.findByModuleAndApiPathAndMethod(
                "Notification", "/mpbhms/notifications/{id}/read", "PUT"
            );
            Permission ocrCccdPermission = permissionRepository.findByModuleAndApiPathAndMethod("Ocr", "/mpbhms/ocr/cccd", "POST");
            Role adminRole = new Role();
            adminRole.setRoleName("ADMIN");
            List<Permission> adminPermissions = new ArrayList<>(permissionRepository.findAll()
                    .stream()
                    .filter(p ->
                            List.of("User", "Role", "Permission", "Notification", "Service", "Renter", "Schedule", "Bill", "Asset").contains(p.getModule()) ||
                                    (p.getModule().equals("Room") && p.getMethod().equals("GET"))
                    )// hoặc theo API cụ thể
                    .toList());

            if (viewMyNotification != null && !adminPermissions.contains(viewMyNotification)) {
                adminPermissions.add(viewMyNotification);
            }
            if (markReadNotification != null && !adminPermissions.contains(markReadNotification)) {
                adminPermissions.add(markReadNotification);
            }
            Permission sendMultipleNotificationsAdmin = permissionRepository.findByModuleAndApiPathAndMethod("Notification", "/mpbhms/notifications/send-multiple", "POST");
            if (sendMultipleNotificationsAdmin != null && !adminPermissions.contains(sendMultipleNotificationsAdmin)) {
                adminPermissions.add(sendMultipleNotificationsAdmin);
            }
            adminRole.setPermissionEntities(adminPermissions);
            roleRepository.save(adminRole);

            Role renterRole = new Role();
            renterRole.setRoleName("RENTER");
            List<Permission> renterPermission = new ArrayList<>();
            // Quyền cho RENTER:
            // Contract
            Permission getMyContracts = permissionRepository.findByModuleAndApiPathAndMethod("Contract", "/mpbhms/contracts/my-contracts", "GET");
            if (getMyContracts != null) renterPermission.add(getMyContracts);

            // Get My Room permission
            Permission getMyRoom = permissionRepository.findByModuleAndApiPathAndMethod("RoomUser", "/mpbhms/room-users/my-room", "GET");
            if (getMyRoom != null && !renterPermission.contains(getMyRoom)) {
                renterPermission.add(getMyRoom);
            }

            Permission approveAmendment = permissionRepository.findByModuleAndApiPathAndMethod("RoomUser", "/mpbhms/room-users/approve-amendment/{amendmentId}", "POST");
            if (approveAmendment != null) renterPermission.add(approveAmendment);

            Permission rejectAmendment = permissionRepository.findByModuleAndApiPathAndMethod("RoomUser", "/mpbhms/room-users/reject-amendment/{amendmentId}", "POST");
            if (rejectAmendment != null) renterPermission.add(rejectAmendment);

            Permission myRoomPermission = permissionRepository.findByModuleAndApiPathAndMethod("RoomUser", "/mpbhms/room-users/my-room", "GET");
            if (myRoomPermission != null) renterPermission.add(myRoomPermission);

            Permission getContractAmendments = permissionRepository.findByModuleAndApiPathAndMethod("RoomUser", "/mpbhms/room-users/contract-amendments/{contractId}", "GET");
            if (getContractAmendments != null) renterPermission.add(getContractAmendments);
            // Asset
            Permission viewAssets = permissionRepository.findByModuleAndApiPathAndMethod("Asset", "/mpbhms/assets", "GET");
            if (viewAssets != null) renterPermission.add(viewAssets);
            Permission getAssetById = permissionRepository.findByModuleAndApiPathAndMethod("Asset", "/mpbhms/assets/{id}", "GET");
            if (getAssetById != null) renterPermission.add(getAssetById);
            Permission checkinAsset = permissionRepository.findByModuleAndApiPathAndMethod("Asset", "/mpbhms/assets/checkin", "POST");
            if (checkinAsset != null) renterPermission.add(checkinAsset);
            Permission checkoutAsset = permissionRepository.findByModuleAndApiPathAndMethod("Asset", "/mpbhms/assets/checkout", "POST");
            if (checkoutAsset != null) renterPermission.add(checkoutAsset);
            // Bill
            Permission getBills = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills", "GET");
            if (getBills != null) renterPermission.add(getBills);
            Permission getBillById = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/{id}", "GET");
            if (getBillById != null) renterPermission.add(getBillById);
            Permission getMyBills = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/my", "GET");
            if (getMyBills != null && !renterPermission.contains(getMyBills)) renterPermission.add(getMyBills);
            Permission exportBill = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/{id}/export", "GET");
            if (exportBill != null) renterPermission.add(exportBill);
            // Dashboard Bill Stats permission
            Permission dashboardBillStats = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/dashboard-stats", "GET");
            if (dashboardBillStats != null && !renterPermission.contains(dashboardBillStats)) {
                renterPermission.add(dashboardBillStats);
            }
            //Payment
            Permission createVnpayUrl = permissionRepository.findByModuleAndApiPathAndMethod("Payment", "/mpbhms/payment/create-vnpay-url", "POST");
            if (createVnpayUrl != null) renterPermission.add(createVnpayUrl);
            //Ocr
            if (ocrCccdPermission != null) {
                renterPermission.add(ocrCccdPermission);
            }
            // Room
            Permission viewRoom = permissionRepository.findByModuleAndApiPathAndMethod("Room", "/mpbhms/rooms", "GET");
            if (viewRoom != null) renterPermission.add(viewRoom);
            // Schedule/Booking
            Permission getAllSchedules = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/mpbhms/schedules", "GET");
            if (getAllSchedules != null) renterPermission.add(getAllSchedules);
            Permission getScheduleById = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/mpbhms/schedules/{id}", "GET");
            if (getScheduleById != null) renterPermission.add(getScheduleById);
            // Khai báo các permission Schedule dùng chung cho các role
            Permission createSchedule = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/mpbhms/schedules", "POST");
            Permission updateScheduleStatus = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/mpbhms/schedules/{id}/status", "PATCH");
            Permission updateSchedule = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/mpbhms/schedules/{id}", "PUT");
            Permission deleteSchedule = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/mpbhms/schedules/{id}", "DELETE");

            // Quyền cho RENTER
            if (createSchedule != null) renterPermission.add(createSchedule);
            if (updateScheduleStatus != null) renterPermission.add(updateScheduleStatus);
            if (updateSchedule != null) renterPermission.add(updateSchedule);
            if (deleteSchedule != null) renterPermission.add(deleteSchedule);
            if (viewRoom != null) renterPermission.add(viewRoom);

            // Quyền cập nhật lịch hẹn cho RENTER
            // Permission updateScheduleStatus = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/mpbhms/schedules/{id}/status", "PATCH");
            // if (updateScheduleStatus != null) renterPermission.add(updateScheduleStatus);

            // Quyền cập nhật toàn bộ lịch hẹn cho RENTER
            // Permission updateSchedule = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/mpbhms/schedules/{id}", "PUT");
            // if (updateSchedule != null) renterPermission.add(updateSchedule);

// Export contract permission
            Permission exportContract = permissionRepository.findByModuleAndApiPathAndMethod("Contract", "/mpbhms/contracts/{id}/export", "GET");
            if (exportContract != null) renterPermission.add(exportContract);
            // Notification
            if (viewMyNotification != null && !renterPermission.contains(viewMyNotification)) {
                renterPermission.add(viewMyNotification);
            }
            if (markReadNotification != null && !renterPermission.contains(markReadNotification)) {
                renterPermission.add(markReadNotification);
            }
            Permission getMySchedules = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/mpbhms/schedules/my", "GET");
            if (getMySchedules != null && !renterPermission.contains(getMySchedules)) {
                renterPermission.add(getMySchedules);
            }
            renterRole.setPermissionEntities(renterPermission);
            roleRepository.save(renterRole);

            Role landlordRole = new Role();
            landlordRole.setRoleName("LANDLORD");
            List<Permission> landlordPermission = new ArrayList<>(permissionRepository.findAll()
                    .stream()
                    .filter(p -> List.of("Room","ContractTemplate","Renter","RoomUser","Bill","Ocr","Contract","Service","Schedule","User","Asset","ElectricReading").contains(p.getModule())) // hoặc theo API cụ thể
                    .toList());
            // Đảm bảo LANDLORD có quyền xem booking (schedule)
            if (getAllSchedules != null && !landlordPermission.contains(getAllSchedules)) {
                landlordPermission.add(getAllSchedules);
            }
            if (getScheduleById != null && !landlordPermission.contains(getScheduleById)) {
                landlordPermission.add(getScheduleById);
            }
            if (viewMyNotification != null && !landlordPermission.contains(viewMyNotification)) {
                landlordPermission.add(viewMyNotification);
            }
            if (markReadNotification != null && !landlordPermission.contains(markReadNotification)) {
                landlordPermission.add(markReadNotification);
            }
            Permission sendNotification = permissionRepository.findByModuleAndApiPathAndMethod("Notification", "/mpbhms/notifications/send", "POST");
            if (sendNotification != null && !landlordPermission.contains(sendNotification)) {
                landlordPermission.add(sendNotification);
            }
            Permission sendMultipleNotifications = permissionRepository.findByModuleAndApiPathAndMethod("Notification", "/mpbhms/notifications/send-multiple", "POST");
            if (sendMultipleNotifications != null && !landlordPermission.contains(sendMultipleNotifications)) {
                landlordPermission.add(sendMultipleNotifications);
            }
            // Đảm bảo LANDLORD có quyền xem dashboard-stats
            Permission dashboardStats = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/dashboard-stats", "GET");
            if (dashboardStats != null && !landlordPermission.contains(dashboardStats)) {
                landlordPermission.add(dashboardStats);
            }
            landlordRole.setPermissionEntities(landlordPermission);
            roleRepository.save(landlordRole);

            Role subAdminRole = new Role();
            subAdminRole.setRoleName("SUBADMIN");
            List<Permission> subAdminPermission = new ArrayList<>(permissionRepository.findAll()
                    .stream()
                    .filter(p -> List.of("User", "Role", "Permission", "Notification", "Service", "Renter", "Schedule", "Bill", "Asset", "Room").contains(p.getModule())) // hoặc theo API cụ thể
                    .toList());
            if (viewMyNotification != null && !subAdminPermission.contains(viewMyNotification)) {
                subAdminPermission.add(viewMyNotification);
            }
            if (markReadNotification != null && !subAdminPermission.contains(markReadNotification)) {
                subAdminPermission.add(markReadNotification);
            }
            Permission sendMultipleNotificationsSubAdmin = permissionRepository.findByModuleAndApiPathAndMethod("Notification", "/mpbhms/notifications/send-multiple", "POST");
            if (sendMultipleNotificationsSubAdmin != null && !subAdminPermission.contains(sendMultipleNotificationsSubAdmin)) {
                subAdminPermission.add(sendMultipleNotificationsSubAdmin);
            }
            subAdminRole.setPermissionEntities(subAdminPermission);
            roleRepository.save(subAdminRole);

            // Thêm role USER cho user thường
            Role userRole = new Role();
            userRole.setRoleName("USER");
            List<Permission> userPermissions = new ArrayList<>();

            // Quyền cho USER: cho phép xóa lịch hẹn của chính mình
            if (deleteSchedule != null) userPermissions.add(deleteSchedule);

            // Quyền tạo lịch hẹn
            // Permission createSchedule = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/mpbhms/schedules", "POST");
            if (createSchedule != null) userPermissions.add(createSchedule);

            // Quyền xem lịch hẹn của mình
            // Permission getMySchedules = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/mpbhms/schedules/my", "GET");
            if (getMySchedules != null) userPermissions.add(getMySchedules);

            // Quyền cập nhật lịch hẹn
            // Permission updateScheduleStatus = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/mpbhms/schedules/{id}/status", "PATCH");
            if (updateScheduleStatus != null) userPermissions.add(updateScheduleStatus);

            // Quyền cập nhật toàn bộ lịch hẹn
            // Permission updateSchedule = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/mpbhms/schedules/{id}", "PUT");
            if (updateSchedule != null) userPermissions.add(updateSchedule);

            // Quyền xem thông báo của mình
            if (viewMyNotification != null && !userPermissions.contains(viewMyNotification)) {
                userPermissions.add(viewMyNotification);
            }
            if (markReadNotification != null && !userPermissions.contains(markReadNotification)) {
                userPermissions.add(markReadNotification);
            }

            // Quyền xem phòng
            if (viewRoom != null) userPermissions.add(viewRoom);

            // Quyền OCR CCCD cho USER (không được whitelist nên cần quyền cụ thể)
            if (ocrCccdPermission != null && !userPermissions.contains(ocrCccdPermission)) {
                userPermissions.add(ocrCccdPermission);
            }

            userRole.setPermissionEntities(userPermissions);
            roleRepository.save(userRole);
        }

        // --- Init Users ---
        if (countUsers == 0) {
            User admin = new User();
            admin.setEmail("admin@gmail.com");
            admin.setUsername("Administrator");
            admin.setPassword(passwordEncoder.encode("123123123aA@"));

            Role adminRole = roleRepository.findByRoleName("ADMIN");
            if (adminRole != null) {
                admin.setRole(adminRole);
            }
            userRepository.save(admin);


            User landlord  = new User();
            landlord.setEmail("landlord@gmail.com");
            landlord.setUsername("Landlord");
            landlord.setPassword(passwordEncoder.encode("123123123aA@"));

            Role landlordRole = roleRepository.findByRoleName("LANDLORD");
            if (landlordRole != null) {
                landlord.setRole(landlordRole);
            }
            userRepository.save(landlord);

            User subAdmin  = new User();
            subAdmin.setEmail("subadmin@gmail.com");
            subAdmin.setUsername("Sub admin");
            subAdmin.setPassword(passwordEncoder.encode("123123123aA@"));

            Role subAdminRole = roleRepository.findByRoleName("SUBADMIN");
            if (subAdminRole != null) {
                subAdmin.setRole(subAdminRole);
            }
            userRepository.save(subAdmin);
        }

        // --- Init Services ---
        if (countServices == 0) {
            List<CustomService> services = new ArrayList<>();

            CustomService electricity = new CustomService();
            electricity.setServiceName("Điện");
            electricity.setServiceType(ServiceType.ELECTRICITY);
            electricity.setUnit("kWh");
            electricity.setUnitPrice(new BigDecimal("3500"));
            services.add(electricity);

            CustomService water = new CustomService();
            water.setServiceName("Nước");
            water.setServiceType(ServiceType.WATER);
            water.setUnit("m³");
            water.setUnitPrice(new BigDecimal("25000"));
            services.add(water);

            CustomService internet = new CustomService();
            internet.setServiceName("Internet");
            internet.setServiceType(ServiceType.OTHER);
            internet.setUnit("tháng");
            internet.setUnitPrice(new BigDecimal("100000"));
            services.add(internet);

            serviceRepository.saveAll(services);
            
            // Khởi tạo lịch sử giá cho các dịch vụ mặc định
            initializeServicePriceHistory(services);
        }

        // --- Init Default Contract Templates ---
        if (countContractTemplates == 0) {
            initializeDefaultContractTemplates();
        }

        if (countPermissions > 0 && countRoles > 0 && countUsers > 0 && countServices > 0 && countContractTemplates > 0) {
            System.out.println(">>> SKIP INIT DATABASE <<<");
        }
        System.out.println(">>> INIT DONE <<<");
    }

    private void initializeServicePriceHistory(List<CustomService> services) {
        LocalDate today = LocalDate.now();
        
        for (CustomService service : services) {
            // Kiểm tra xem đã có lịch sử giá cho service này chưa
            if (servicePriceHistoryRepository.findByServiceIdOrderByEffectiveDateDesc(service.getId()).isEmpty()) {
                ServicePriceHistory priceHistory = new ServicePriceHistory();
                priceHistory.setService(service);
                priceHistory.setUnitPrice(service.getUnitPrice());
                priceHistory.setEffectiveDate(today);
                priceHistory.setEndDate(null); // Giá hiện tại chưa có ngày kết thúc
                priceHistory.setReason("Giá mặc định khi khởi tạo hệ thống");
                priceHistory.setIsActive(true);
                
                servicePriceHistoryRepository.save(priceHistory);
            }
        }
        
        System.out.println(">>> INITIALIZED SERVICE PRICE HISTORY <<<");
    }

    private void initializeDefaultContractTemplates() {
        // Lấy tất cả landlords để tạo template cho từng người
        List<User> landlords = userRepository.findAll().stream()
                .filter(user -> user.getRole() != null && "LANDLORD".equals(user.getRole().getRoleName()))
                .toList();

        String professionalTemplate = createProfessionalContractTemplate();

        for (User landlord : landlords) {
            ContractTemplate template = new ContractTemplate();
            template.setLandlordId(landlord.getId());
            template.setName("Mẫu hợp đồng chuyên nghiệp");
            template.setContent(professionalTemplate);
            template.setIsDefault(true);
            contractTemplateRepository.save(template);
        }

        // Tạo template mặc định cho landlords sẽ tạo sau này (landlordId = null)
        ContractTemplate defaultTemplate = new ContractTemplate();
        defaultTemplate.setLandlordId(null);
        defaultTemplate.setName("Mẫu hợp đồng mặc định");
        defaultTemplate.setContent(professionalTemplate);
        defaultTemplate.setIsDefault(true);
        contractTemplateRepository.save(defaultTemplate);

        System.out.println(">>> INITIALIZED CONTRACT TEMPLATES <<<");
    }

    private String createProfessionalContractTemplate() {
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px;
            color: #333;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .title { 
            font-size: 24px; 
            font-weight: bold; 
            color: #d32f2f;
            margin: 20px 0;
        }
        .section { 
            margin: 20px 0; 
        }
        .section-title { 
            font-size: 16px; 
            font-weight: bold; 
            color: #1976d2;
            margin: 15px 0 10px 0;
            border-left: 4px solid #1976d2;
            padding-left: 10px;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .info-table td {
            padding: 8px;
            border: 1px solid #ddd;
            vertical-align: top;
        }
        .info-table .label {
            background-color: #f5f5f5;
            font-weight: bold;
            width: 30%;
        }
        .signature-section {
            margin-top: 50px;
        }
        .signature-box {
            width: 45%;
            text-align: center;
            border: 1px solid #ddd;
            padding: 20px;
            min-height: 100px;
            display: inline-block;
            vertical-align: top;
        }
        .legal-note {
            background-color: #f9f9f9;
            border-left: 4px solid #ff9800;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
        }
        ul {
            margin: 10px 0;
            padding-left: 25px;
        }
        li {
            margin: 8px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div style="font-weight: bold; font-size: 16px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style="font-weight: bold; font-size: 16px;">Độc lập - Tự do - Hạnh phúc</div>
        <div style="margin: 15px 0;">═══════════════════════════════════════════</div>
    </div>

    <div class="title" style="text-align: center;">HỢP ĐỒNG THUÊ PHÒNG TRỌ</div>
    
    <div style="text-align: center; margin-bottom: 20px;">
        <strong>Số hợp đồng: {{contract.contractNumber}}</strong><br />
        <em>Ký {{startDate}}</em>
    </div>

    <div class="legal-note">
        <strong>Căn cứ pháp lý:</strong><br />
        - Bộ luật Dân sự năm 2015;<br />
        - Luật Nhà ở năm 2014;<br />
        - Nghị định số 99/2015/NĐ-CP ngày 20/10/2015 của Chính phủ;<br />
        - Các quy định pháp luật có liên quan và thỏa thuận của các bên.
    </div>

    <p>Hôm nay, <strong>{{startDate}}</strong>, tại <strong>{{room.roomNumber}}</strong>, chúng tôi gồm các bên:</p>

    <div class="section">
        <div class="section-title">BÊN CHO THUÊ (BÊN A)</div>
        <table class="info-table">
            <tr>
                <td class="label">Họ và tên:</td>
                <td>{{landlord.userInfo.fullName}}</td>
            </tr>
            <tr>
                <td class="label">Số điện thoại:</td>
                <td>{{landlord.userInfo.phoneNumber}}</td>
            </tr>
            <tr>
                <td class="label">CCCD/CMND:</td>
                <td>{{landlord.userInfo.nationalID}}</td>
            </tr>
            <tr>
                <td class="label">Địa chỉ thường trú:</td>
                <td>{{landlord.userInfo.permanentAddress}}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">BÊN THUÊ PHÒNG (BÊN B)</div>
        {{#each renters}}
        <table class="info-table" style="margin-bottom: 15px;">
            <tr>
                <td class="label">Họ và tên:</td>
                <td>{{fullName}}</td>
            </tr>
            <tr>
                <td class="label">Số điện thoại:</td>
                <td>{{phoneNumber}}</td>
            </tr>
            <tr>
                <td class="label">CCCD/CMND:</td>
                <td>{{identityNumber}}</td>
            </tr>
            <tr>
                <td class="label">Địa chỉ thường trú:</td>
                <td>{{address}}</td>
            </tr>
        </table>
        {{/each}}
    </div>

    <p><strong>Sau khi bàn bạc thỏa thuận, hai bên cùng nhau ký kết hợp đồng thuê phòng trọ với những nội dung sau:</strong></p>

    <div class="section">
        <div class="section-title">Điều 1: ĐỐI TƯỢNG CỦA HỢP ĐỒNG</div>
        <p>Bên A đồng ý cho Bên B thuê phòng trọ với các thông tin như sau:</p>
        <table class="info-table">
            <tr>
                <td class="label">Số phòng:</td>
                <td>{{room.roomNumber}}</td>
            </tr>
            <tr>
                <td class="label">Địa chỉ:</td>
                <td>Địa chỉ nhà trọ</td>
            </tr>
            <tr>
                <td class="label">Diện tích:</td>
                <td>Theo thực tế bàn giao</td>
            </tr>
            <tr>
                <td class="label">Mục đích sử dụng:</td>
                <td>Để ở</td>
            </tr>
            <tr>
                <td class="label">Tình trạng phòng:</td>
                <td>Bàn giao theo hiện trạng</td>
            </tr>
            <tr>
                <td class="label">Trang thiết bị:</td>
                <td>Theo biên bản bàn giao tài sản</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Điều 2: THỜI HẠN THUÊ</div>
        <table class="info-table">
            <tr>
                <td class="label">Thời hạn thuê:</td>
                <td>Từ ngày {{startDate}} đến ngày {{endDate}}</td>
            </tr>
            <tr>
                <td class="label">Hiệu lực:</td>
                <td>Hợp đồng có hiệu lực kể từ ngày ký</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Điều 3: GIÁ THUÊ VÀ PHƯƠNG THỨC THANH TOÁN</div>
        <table class="info-table">
            <tr>
                <td class="label">Giá thuê phòng:</td>
                <td>{{contract.rentAmount}} VNĐ/tháng</td>
            </tr>
            <tr>
                <td class="label">Tiền đặt cọc:</td>
                <td>{{contract.depositAmount}} VNĐ (hoàn trả khi kết thúc hợp đồng, không vi phạm)</td>
            </tr>
            <tr>
                <td class="label">Chu kỳ thanh toán:</td>
                <td>{{contract.paymentCycle}}</td>
            </tr>
            <tr>
                <td class="label">Hạn thanh toán:</td>
                <td>Trước ngày 05 của chu kỳ thanh toán</td>
            </tr>
            <tr>
                <td class="label">Phương thức:</td>
                <td>Tiền mặt hoặc chuyển khoản</td>
            </tr>
            <tr>
                <td class="label">Các khoản phí khác:</td>
                <td>Điện, nước, internet, rác... (theo thực tế sử dụng)</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Điều 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN CHO THUÊ</div>
        <p><strong>4.1. Quyền của Bên A:</strong></p>
        <ul>
            <li>Yêu cầu Bên B thanh toán đầy đủ, đúng hạn các khoản tiền theo hợp đồng</li>
            <li>Yêu cầu Bên B bồi thường thiệt hại do vi phạm hợp đồng gây ra</li>
            <li>Đơn phương chấm dứt hợp đồng nếu Bên B vi phạm nghiêm trọng</li>
            <li>Kiểm tra tình hình sử dụng phòng trọ (báo trước 24 giờ)</li>
        </ul>
        <p><strong>4.2. Nghĩa vụ của Bên A:</strong></p>
        <ul>
            <li>Bàn giao phòng trọ đúng tình trạng thỏa thuận</li>
            <li>Bảo đảm quyền sử dụng ổn định của Bên B trong thời hạn hợp đồng</li>
            <li>Bảo trì, sửa chữa phòng trọ theo thỏa thuận</li>
            <li>Hoàn trả tiền đặt cọc khi kết thúc hợp đồng (trừ các khoản vi phạm)</li>
        </ul>
    </div>

    <div class="section">
        <div class="section-title">Điều 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN THUÊ</div>
        <p><strong>5.1. Quyền của Bên B:</strong></p>
        <ul>
            <li>Được sử dụng phòng trọ đúng mục đích đã thỏa thuận</li>
            <li>Yêu cầu Bên A sửa chữa những hỏng hóc không do lỗi của mình</li>
            <li>Được gia hạn hợp đồng nếu hai bên đồng ý</li>
        </ul>
        <p><strong>5.2. Nghĩa vụ của Bên B:</strong></p>
        <ul>
            <li>Thanh toán đầy đủ, đúng hạn các khoản tiền theo hợp đồng</li>
            <li>Sử dụng phòng trọ đúng mục đích, giữ gìn vệ sinh chung</li>
            <li>Tuân thủ quy định về phòng cháy chữa cháy, an ninh trật tự</li>
            <li>Bồi thường thiệt hại do mình gây ra</li>
            <li>Trả lại phòng trọ khi kết thúc hợp đồng</li>
        </ul>
    </div>

    <div class="section">
        <div class="section-title">Điều 6: CAM KẾT CHUNG</div>
        <ul>
            <li>Hai bên cam kết thực hiện đúng và đầy đủ các điều khoản đã thỏa thuận</li>
            <li>Trường hợp có tranh chấp, hai bên cùng bàn bạc giải quyết trên tinh thần thiện chí</li>
            <li>Nếu không thỏa thuận được, tranh chấp sẽ được giải quyết tại Tòa án có thẩm quyền</li>
            <li>Hợp đồng có thể được sửa đổi, bổ sung bằng văn bản khi hai bên đồng ý</li>
        </ul>
    </div>

    {{#if terms}}
    <div class="section">
        <div class="section-title">ĐIỀU KHOẢN BỔ SUNG</div>
        <ol>
            {{#each terms}}
            <li>{{this}}</li>
            {{/each}}
        </ol>
    </div>
    {{/if}}

    <div class="legal-note">
        <strong>Điều cuối:</strong> Hợp đồng này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản. 
        Hợp đồng có hiệu lực kể từ ngày ký và chấm dứt theo đúng thỏa thuận.
    </div>

    <div class="signature-section">
        <div class="signature-box" style="margin-right: 10%;">
            <div style="font-weight: bold; margin-bottom: 10px;">BÊN CHO THUÊ (BÊN A)</div>
            <div style="font-style: italic; margin-bottom: 60px;">(Ký và ghi rõ họ tên)</div>
            <div style="font-weight: bold;">{{landlord.userInfo.fullName}}</div>
        </div>
        <div class="signature-box">
            <div style="font-weight: bold; margin-bottom: 10px;">BÊN THUÊ PHÒNG (BÊN B)</div>
            <div style="font-style: italic; margin-bottom: 60px;">(Ký và ghi rõ họ tên)</div>
            <div style="font-weight: bold;">
                {{#each renters}}
                {{fullName}}{{#unless @last}}<br />{{/unless}}
                {{/each}}
            </div>
        </div>
    </div>
</body>
</html>
                """;
    }
}
