package com.mpbhms.backend.config;

import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.entity.Permission;
import com.mpbhms.backend.entity.Role;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.entity.ContractTemplate;
import com.mpbhms.backend.entity.ServicePriceHistory;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.RoomImage;
import com.mpbhms.backend.entity.Asset;
import com.mpbhms.backend.entity.RoomServiceMapping;
import com.mpbhms.backend.entity.RoomAsset;
import com.mpbhms.backend.entity.ServiceReading;
import com.mpbhms.backend.enums.ServiceType;
import com.mpbhms.backend.enums.RoomStatus;
import com.mpbhms.backend.repository.PermissionRepository;
import com.mpbhms.backend.repository.RoleRepository;
import com.mpbhms.backend.repository.ServiceRepository;
import com.mpbhms.backend.repository.ServicePriceHistoryRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.repository.ContractTemplateRepository;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.AssetRepository;
import com.mpbhms.backend.repository.RoomServiceMappingRepository;
import com.mpbhms.backend.repository.RoomAssetRepository;
import com.mpbhms.backend.repository.ServiceReadingRepository;
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
public class    DatabaseInitializer implements CommandLineRunner {

    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ServiceRepository serviceRepository;
    private final ServicePriceHistoryRepository servicePriceHistoryRepository;
    private final ContractTemplateRepository contractTemplateRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoomRepository roomRepository;
    private final AssetRepository assetRepository;
    private final RoomServiceMappingRepository roomServiceMappingRepository;
    private final RoomAssetRepository roomAssetRepository;
    private final ServiceReadingRepository serviceReadingRepository;

    @Override
    public void run(String... args) throws Exception {
        System.out.println(">>> START INIT DATABASE <<<");

        long countPermissions = permissionRepository.count();
        long countRoles = roleRepository.count();
        long countUsers = userRepository.count();
        long countServices = serviceRepository.count();
        long countContractTemplates = contractTemplateRepository.count();
        long countRooms = roomRepository.count();
        long countAssets = assetRepository.count();

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
            permissions.add(new Permission("Reactivate service of room", "/mpbhms/rooms/{roomId}/reactivate-service/{serviceId}", "PATCH", "Room"));
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
            permissions.add(new Permission("Assign user to Room Single", "/mpbhms/room-users/assign", "POST", "RoomUser"));
    
            permissions.add(new Permission("Process Expired Contracts", "/mpbhms/room-users/process-expired-contracts", "POST", "RoomUser"));
            permissions.add(new Permission("Renew Contract", "/mpbhms/room-users/renew-contract/{contractId}", "POST", "RoomUser"));
            permissions.add(new Permission("Get Expiring Contracts", "/mpbhms/room-users/expiring-contracts", "GET", "RoomUser"));
            permissions.add(new Permission("Update Contract", "/mpbhms/room-users/update-contract", "POST", "RoomUser"));
            permissions.add(new Permission("Terminate Contract", "/mpbhms/room-users/request-terminate-contract/{contractId}", "POST", "RoomUser"));
            permissions.add(new Permission("Direct Terminate Contract", "/mpbhms/room-users/terminate-contract/{contractId}", "POST", "RoomUser"));
            permissions.add(new Permission("Approve Amendment", "/mpbhms/room-users/approve-amendment/{amendmentId}", "POST", "RoomUser"));
            permissions.add(new Permission("Reject Amendment", "/mpbhms/room-users/reject-amendment/{amendmentId}", "POST", "RoomUser"));
            permissions.add(new Permission("Get Contract Amendments", "/mpbhms/room-users/contract-amendments/{contractId}", "GET", "RoomUser"));
            permissions.add(new Permission("Get Contract Amendments By Status", "/mpbhms/room-users/contract-amendments/{contractId}/status/{status}", "GET", "RoomUser"));
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
            permissions.add(new Permission("Manual Scan", "/mpbhms/ocr/manual-scan", "POST", "Ocr"));
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
            permissions.add(new Permission("Send Bill", "/mpbhms/bills/{id}/send", "POST", "Bill"));
            permissions.add(new Permission("Send Penalty Notification", "/mpbhms/bills/{billId}/send-penalty-notification", "POST", "Bill"));
            permissions.add(new Permission("Send Overdue Warning", "/mpbhms/bills/{billId}/send-overdue-warning", "POST", "Bill"));
            permissions.add(new Permission("Dashboard Bill Stats", "/mpbhms/bills/dashboard-stats", "GET", "Bill"));
            permissions.add(new Permission("Bulk Generate Bills", "/mpbhms/bills/bulk-generate", "POST", "Bill"));
            permissions.add(new Permission("Auto Generate Service Bills", "/mpbhms/bills/auto-generate-service-bills", "POST", "Bill"));
            permissions.add(new Permission("Update Bill Payment Status", "/mpbhms/bills/{id}/payment-status", "PUT", "Bill"));
            permissions.add(new Permission("Create Late Penalty Bill", "/mpbhms/bills/{id}/create-penalty", "POST", "Bill"));
            permissions.add(new Permission("Check And Create Late Penalties", "/mpbhms/bills/check-and-create-penalties", "POST", "Bill"));
            permissions.add(new Permission("Get Overdue Bills", "/mpbhms/bills/overdue", "GET", "Bill"));
            permissions.add(new Permission("Partial Payment", "/mpbhms/bills/partial-payment", "POST", "Bill"));
            permissions.add(new Permission("Partial Payment VNPay", "/mpbhms/bills/partial-payment/vnpay", "POST", "Bill"));
            permissions.add(new Permission("Get Payment Count", "/mpbhms/bills/{id}/payment-count", "GET", "Bill"));
            permissions.add(new Permission("Cash Partial Payment", "/mpbhms/bills/cash-partial-payment", "POST", "Bill"));
            permissions.add(new Permission("Cash Full Payment", "/mpbhms/bills/cash-full-payment", "POST", "Bill"));
            permissions.add(new Permission("Confirm Cash Payment", "/mpbhms/bills/{billId}/confirm-cash-payment/{paymentHistoryId}", "POST", "Bill"));
            permissions.add(new Permission("Reject Cash Payment", "/mpbhms/bills/{billId}/reject-cash-payment/{paymentHistoryId}", "POST", "Bill"));
            //Payment History
            permissions.add(new Permission("Get Payment Statistics", "/mpbhms/payment-history/bill/{billId}/statistics", "GET", "payment-history"));
            permissions.add(new Permission("Get Payment History Page", "/mpbhms/payment-history/bill/{billId}/page", "GET", "payment-history"));
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
            permissions.add(new Permission("Check Asset In Use", "/mpbhms/assets/{id}/in-use", "GET", "Asset"));
            permissions.add(new Permission("Check Duplicate Asset Name", "/mpbhms/assets/check-duplicate", "GET", "Asset"));
            permissions.add(new Permission("Assign Asset To Room", "/mpbhms/assets/{assetId}/assign-room", "POST", "Asset"));       
            //Electric Reading
            permissions.add(new Permission("Create Electric Reading", "/mpbhms/electric-readings", "POST", "ElectricReading"));
            permissions.add(new Permission("Update Electric Reading", "/mpbhms/electric-readings/{id}", "PUT", "ElectricReading"));
            permissions.add(new Permission("Delete Electric Reading", "/mpbhms/electric-readings/{id}", "DELETE", "ElectricReading"));
            permissions.add(new Permission("View Electric Readings", "/mpbhms/electric-readings", "GET", "ElectricReading"));
            permissions.add(new Permission("Get Electric Reading by ID", "/mpbhms/electric-readings/{id}", "GET", "ElectricReading"));
            //Asset-Inventory
            permissions.add(new Permission("Asset Checkin/Checkout", "/mpbhms/asset-inventory/checkin", "POST", "AssetInventory"));
            permissions.add(new Permission("Asset List By Room Contract", "/mpbhms/asset-inventory/by-room-contract", "GET", "AssetInventory"));
            permissions.add(new Permission("Asset List By Room ", "/mpbhms/asset-inventory/by-room", "GET", "AssetInventory"));
            permissions.add(new Permission("Upload Asset Inventory Photo", "/mpbhms/asset-inventory/upload-photo", "POST", "AssetInventory"));
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
                            List.of("User", "Role", "Permission", "Notification", "Service", "Renter", "Schedule", "Bill", "Asset", "payment-history").contains(p.getModule()) ||
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
            // Bổ sung quyền xem danh sách tài sản theo phòng cho ADMIN
            Permission viewRoomAssetsByRoom = permissionRepository.findByModuleAndApiPathAndMethod("RoomAsset", "/mpbhms/room-assets/by-room", "GET");
            Permission viewRoomAssetsByRoomNumber = permissionRepository.findByModuleAndApiPathAndMethod("RoomAsset", "/mpbhms/room-assets/by-room-number", "GET");
            if (viewRoomAssetsByRoom != null && !adminPermissions.contains(viewRoomAssetsByRoom)) {
                adminPermissions.add(viewRoomAssetsByRoom);
            }
            if (viewRoomAssetsByRoomNumber != null && !adminPermissions.contains(viewRoomAssetsByRoomNumber)) {
                adminPermissions.add(viewRoomAssetsByRoomNumber);
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
            
            Permission getReadings = permissionRepository.findByModuleAndApiPathAndMethod(
                "Service", 
                "/mpbhms/services/readings", 
                "GET"
            );
            if (getReadings != null) renterPermission.add(getReadings);
            

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
            
            Permission getContractAmendmentsByStatus = permissionRepository.findByModuleAndApiPathAndMethod("RoomUser", "/mpbhms/room-users/contract-amendments/{contractId}/status/{status}", "GET");
            if (getContractAmendmentsByStatus != null) renterPermission.add(getContractAmendmentsByStatus);
            
            Permission renewContract = permissionRepository.findByModuleAndApiPathAndMethod("RoomUser", "/mpbhms/room-users/renew-contract/{contractId}", "POST");
            if (renewContract != null) renterPermission.add(renewContract);
            // Asset
            Permission viewAssets = permissionRepository.findByModuleAndApiPathAndMethod("Asset", "/mpbhms/assets", "GET");
            if (viewAssets != null) renterPermission.add(viewAssets);
            Permission getAssetById = permissionRepository.findByModuleAndApiPathAndMethod("Asset", "/mpbhms/assets/{id}", "GET");
            if (getAssetById != null) renterPermission.add(getAssetById);
            Permission checkinAsset = permissionRepository.findByModuleAndApiPathAndMethod("Asset", "/mpbhms/assets/checkin", "POST");
            if (checkinAsset != null) renterPermission.add(checkinAsset);
            Permission checkoutAsset = permissionRepository.findByModuleAndApiPathAndMethod("Asset", "/mpbhms/assets/checkout", "POST");
            if (checkoutAsset != null) renterPermission.add(checkoutAsset);
            // AssetInventory
            Permission assetCheckinCheckout = permissionRepository.findByModuleAndApiPathAndMethod("AssetInventory", "/mpbhms/asset-inventory/checkin", "POST");
            if (assetCheckinCheckout != null) renterPermission.add(assetCheckinCheckout);
            Permission assetListByRoomContract = permissionRepository.findByModuleAndApiPathAndMethod("AssetInventory", "/mpbhms/asset-inventory/by-room-contract", "GET");
            if (assetListByRoomContract != null) renterPermission.add(assetListByRoomContract);
            // Allow renter to view assets by room
            Permission assetListByRoom = permissionRepository.findByModuleAndApiPathAndMethod("AssetInventory", "/mpbhms/asset-inventory/by-room", "GET");
            if (assetListByRoom != null && !renterPermission.contains(assetListByRoom)) renterPermission.add(assetListByRoom);
            Permission uploadInventoryPhoto = permissionRepository.findByModuleAndApiPathAndMethod("AssetInventory", "/mpbhms/asset-inventory/upload-photo", "POST");
            if (uploadInventoryPhoto != null) renterPermission.add(uploadInventoryPhoto);
            // RoomAsset
            Permission getAssetsByRoomNumber = permissionRepository.findByModuleAndApiPathAndMethod("RoomAsset", "/mpbhms/room-assets/by-room-number", "GET");
            if (getAssetsByRoomNumber != null) renterPermission.add(getAssetsByRoomNumber);
            Permission getAssetsByRoom = permissionRepository.findByModuleAndApiPathAndMethod("RoomAsset", "/mpbhms/room-assets/by-room", "GET");
            if (getAssetsByRoom != null && !renterPermission.contains(getAssetsByRoom)) renterPermission.add(getAssetsByRoom);
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
            // Electricity usage readings (chart) permission for RENTER
            Permission serviceReadings = permissionRepository.findByModuleAndApiPathAndMethod("Service", "/mpbhms/services/readings", "GET");
            if (serviceReadings != null && !renterPermission.contains(serviceReadings)) {
                renterPermission.add(serviceReadings);
            }
            //Payment
            Permission createVnpayUrl = permissionRepository.findByModuleAndApiPathAndMethod("Payment", "/mpbhms/payment/create-vnpay-url", "POST");
            if (createVnpayUrl != null) renterPermission.add(createVnpayUrl);
            
            // Bill permissions for RENTER
            Permission partialPayment = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/partial-payment", "POST");
            if (partialPayment != null) renterPermission.add(partialPayment);
            
            Permission partialPaymentVnpay = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/partial-payment/vnpay", "POST");
            if (partialPaymentVnpay != null) renterPermission.add(partialPaymentVnpay);
            
            Permission getPaymentCount = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/{id}/payment-count", "GET");
            if (getPaymentCount != null) renterPermission.add(getPaymentCount);
            
            Permission cashPartialPayment = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/cash-partial-payment", "POST");
            if (cashPartialPayment != null) renterPermission.add(cashPartialPayment);
            
            Permission cashFullPayment = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/cash-full-payment", "POST");
            if (cashFullPayment != null) renterPermission.add(cashFullPayment);
            
            Permission confirmCashPayment = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/{billId}/confirm-cash-payment/{paymentHistoryId}", "POST");
            if (confirmCashPayment != null) renterPermission.add(confirmCashPayment);
            
            // RENTER không cần quyền từ chối thanh toán tiền mặt (chỉ LANDLORD mới có quyền này)
            
            // Payment History permissions for RENTER
            Permission getPaymentStatistics = permissionRepository.findByModuleAndApiPathAndMethod("payment-history", "/mpbhms/payment-history/bill/{billId}/statistics", "GET");
            if (getPaymentStatistics != null) renterPermission.add(getPaymentStatistics);
            
            Permission getPaymentHistoryPage = permissionRepository.findByModuleAndApiPathAndMethod("payment-history", "/mpbhms/payment-history/bill/{billId}/page", "GET");
            if (getPaymentHistoryPage != null) renterPermission.add(getPaymentHistoryPage);
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
                    .filter(p -> List.of("Room","ContractTemplate","Renter","RoomUser","Bill","Ocr","Contract","Service","Schedule","User","Asset","ElectricReading","RoomAsset","AssetInventory").contains(p.getModule())) // hoặc theo API cụ thể
                    .toList());
            
            // Đảm bảo LANDLORD có quyền assign user to room single
            Permission assignUserToRoomSingle = permissionRepository.findByModuleAndApiPathAndMethod("RoomUser", "/mpbhms/room-users/assign", "POST");
            if (assignUserToRoomSingle != null && !landlordPermission.contains(assignUserToRoomSingle)) {
                landlordPermission.add(assignUserToRoomSingle);
            }
            // Đảm bảo LANDLORD có quyền xem booking (schedule)
            if (getAllSchedules != null && !landlordPermission.contains(getAllSchedules)) {
                landlordPermission.add(getAllSchedules);
            }
            if (getScheduleById != null && !landlordPermission.contains(getScheduleById)) {
                landlordPermission.add(getScheduleById);
            }
            // Đảm bảo LANDLORD có quyền xóa lịch hẹn
            if (deleteSchedule != null && !landlordPermission.contains(deleteSchedule)) {
                landlordPermission.add(deleteSchedule);
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
            
            // Đảm bảo LANDLORD có quyền quản lý tài sản (checkin/checkout)
            Permission landlordCheckinAsset = permissionRepository.findByModuleAndApiPathAndMethod("Asset", "/mpbhms/assets/checkin", "POST");
            if (landlordCheckinAsset != null && !landlordPermission.contains(landlordCheckinAsset)) {
                landlordPermission.add(landlordCheckinAsset);
            }
            
            Permission landlordCheckoutAsset = permissionRepository.findByModuleAndApiPathAndMethod("Asset", "/mpbhms/assets/checkout", "POST");
            if (landlordCheckoutAsset != null && !landlordPermission.contains(landlordCheckoutAsset)) {
                landlordPermission.add(landlordCheckoutAsset);
            }

            // Quyền kiểm tra tài sản đang được sử dụng
            Permission checkAssetInUse = permissionRepository.findByModuleAndApiPathAndMethod("Asset", "/mpbhms/assets/{id}/in-use", "GET");
            if (checkAssetInUse != null && !landlordPermission.contains(checkAssetInUse)) {
                landlordPermission.add(checkAssetInUse);
            }

            // Quyền kiểm tra trùng tên tài sản
            Permission checkDuplicateAssetName = permissionRepository.findByModuleAndApiPathAndMethod("Asset", "/mpbhms/assets/check-duplicate", "GET");
            if (checkDuplicateAssetName != null && !landlordPermission.contains(checkDuplicateAssetName)) {
                landlordPermission.add(checkDuplicateAssetName);
            }
            
            // Bill permissions for LANDLORD
            Permission landlordPartialPayment = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/partial-payment", "POST");
            if (landlordPartialPayment != null && !landlordPermission.contains(landlordPartialPayment)) {
                landlordPermission.add(landlordPartialPayment);
            }
            
            Permission landlordPartialPaymentVnpay = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/partial-payment/vnpay", "POST");
            if (landlordPartialPaymentVnpay != null && !landlordPermission.contains(landlordPartialPaymentVnpay)) {
                landlordPermission.add(landlordPartialPaymentVnpay);
            }
            
            Permission landlordGetPaymentCount = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/{id}/payment-count", "GET");
            if (landlordGetPaymentCount != null && !landlordPermission.contains(landlordGetPaymentCount)) {
                landlordPermission.add(landlordGetPaymentCount);
            }
            
            Permission landlordCashPartialPayment = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/cash-partial-payment", "POST");
            if (landlordCashPartialPayment != null && !landlordPermission.contains(landlordCashPartialPayment)) {
                landlordPermission.add(landlordCashPartialPayment);
            }
            
            Permission landlordConfirmCashPayment = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/{billId}/confirm-cash-payment/{paymentHistoryId}", "POST");
            if (landlordConfirmCashPayment != null && !landlordPermission.contains(landlordConfirmCashPayment)) {
                landlordPermission.add(landlordConfirmCashPayment);
            }
            
            Permission landlordRejectCashPayment = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/{billId}/reject-cash-payment/{paymentHistoryId}", "POST");
            if (landlordRejectCashPayment != null && !landlordPermission.contains(landlordRejectCashPayment)) {
                landlordPermission.add(landlordRejectCashPayment);
            }
            
            // Send Bill permission for LANDLORD
            Permission sendBill = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/{id}/send", "POST");
            if (sendBill != null && !landlordPermission.contains(sendBill)) {
                landlordPermission.add(sendBill);
            }
            
            // 🆕 Send Penalty Notification permission for LANDLORD
            Permission sendPenaltyNotification = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/{billId}/send-penalty-notification", "POST");
            if (sendPenaltyNotification != null && !landlordPermission.contains(sendPenaltyNotification)) {
                landlordPermission.add(sendPenaltyNotification);
            }
            
            // 🆕 Send Overdue Warning permission for LANDLORD
            Permission sendOverdueWarning = permissionRepository.findByModuleAndApiPathAndMethod("Bill", "/mpbhms/bills/{billId}/send-overdue-warning", "POST");
            if (sendOverdueWarning != null && !landlordPermission.contains(sendOverdueWarning)) {
                landlordPermission.add(sendOverdueWarning);
            }
            
            // Payment History permissions for LANDLORD
            Permission landlordGetPaymentStatistics = permissionRepository.findByModuleAndApiPathAndMethod("payment-history", "/mpbhms/payment-history/bill/{billId}/statistics", "GET");
            if (landlordGetPaymentStatistics != null && !landlordPermission.contains(landlordGetPaymentStatistics)) {
                landlordPermission.add(landlordGetPaymentStatistics);
            }
            
            Permission landlordGetPaymentHistoryPage = permissionRepository.findByModuleAndApiPathAndMethod("payment-history", "/mpbhms/payment-history/bill/{billId}/page", "GET");
            if (landlordGetPaymentHistoryPage != null && !landlordPermission.contains(landlordGetPaymentHistoryPage)) {
                landlordPermission.add(landlordGetPaymentHistoryPage);
            }
            
            // Đảm bảo LANDLORD có quyền chấm dứt hợp đồng trực tiếp
            Permission landlordDirectTerminateContract = permissionRepository.findByModuleAndApiPathAndMethod("RoomUser", "/mpbhms/room-users/terminate-contract/{contractId}", "POST");
            if (landlordDirectTerminateContract != null && !landlordPermission.contains(landlordDirectTerminateContract)) {
                landlordPermission.add(landlordDirectTerminateContract);
            }
            landlordRole.setPermissionEntities(landlordPermission);
            roleRepository.save(landlordRole);

            Role subAdminRole = new Role();
            subAdminRole.setRoleName("SUBADMIN");
            List<Permission> subAdminPermission = new ArrayList<>(permissionRepository.findAll()
                    .stream()
                    .filter(p -> List.of("User", "Role", "Permission", "Notification", "Service", "Renter", "Schedule", "Bill", "Asset", "Room", "payment-history").contains(p.getModule())) // hoặc theo API cụ thể
                    .toList());
            // Đảm bảo mọi role đều có quyền xem danh sách tài sản (danh mục gốc)
            Permission viewAssetsPerm = permissionRepository.findByModuleAndApiPathAndMethod("Asset", "/mpbhms/assets", "GET");
            if (viewAssetsPerm != null) {
                if (!adminPermissions.contains(viewAssetsPerm)) {
                    adminPermissions.add(viewAssetsPerm);
                }
                if (!subAdminPermission.contains(viewAssetsPerm)) {
                    subAdminPermission.add(viewAssetsPerm);
                }
            }

            // Và xem tài sản theo phòng cho SUBADMIN
            if (viewRoomAssetsByRoom == null) {
                viewRoomAssetsByRoom = permissionRepository.findByModuleAndApiPathAndMethod("RoomAsset", "/mpbhms/room-assets/by-room", "GET");
            }
            if (viewRoomAssetsByRoomNumber == null) {
                viewRoomAssetsByRoomNumber = permissionRepository.findByModuleAndApiPathAndMethod("RoomAsset", "/mpbhms/room-assets/by-room-number", "GET");
            }
            if (viewRoomAssetsByRoom != null && !subAdminPermission.contains(viewRoomAssetsByRoom)) {
                subAdminPermission.add(viewRoomAssetsByRoom);
            }
            if (viewRoomAssetsByRoomNumber != null && !subAdminPermission.contains(viewRoomAssetsByRoomNumber)) {
                subAdminPermission.add(viewRoomAssetsByRoomNumber);
            }
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

            // Quyền xem danh sách tài sản cho tất cả mọi người
            if (viewAssetsPerm == null) {
                viewAssetsPerm = permissionRepository.findByModuleAndApiPathAndMethod("Asset", "/mpbhms/assets", "GET");
            }
            if (viewAssetsPerm != null && !userPermissions.contains(viewAssetsPerm)) {
                userPermissions.add(viewAssetsPerm);
            }

            // Quyền xem tài sản theo phòng cho USER (phục vụ hiển thị ở RoomDetailPage, Renter pages)
            if (viewRoomAssetsByRoom == null) {
                viewRoomAssetsByRoom = permissionRepository.findByModuleAndApiPathAndMethod("RoomAsset", "/mpbhms/room-assets/by-room", "GET");
            }
            if (viewRoomAssetsByRoomNumber == null) {
                viewRoomAssetsByRoomNumber = permissionRepository.findByModuleAndApiPathAndMethod("RoomAsset", "/mpbhms/room-assets/by-room-number", "GET");
            }
            if (viewRoomAssetsByRoom != null && !userPermissions.contains(viewRoomAssetsByRoom)) {
                userPermissions.add(viewRoomAssetsByRoom);
            }
            if (viewRoomAssetsByRoomNumber != null && !userPermissions.contains(viewRoomAssetsByRoomNumber)) {
                userPermissions.add(viewRoomAssetsByRoomNumber);
            }

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
            admin.setEmail("admpbhms@gmail.com");
            admin.setUsername("Administrator");
            admin.setPassword(passwordEncoder.encode("123123123aA@"));

            Role adminRole = roleRepository.findByRoleName("ADMIN");
            if (adminRole != null) {
                admin.setRole(adminRole);
            }
            userRepository.save(admin);


            User landlord  = new User();
            landlord.setEmail("lalormpbhms@gmail.com");
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

            CustomService parking = new CustomService();
            parking.setServiceName("Đỗ xe");
            parking.setServiceType(ServiceType.OTHER);
            parking.setUnit("tháng");
            parking.setUnitPrice(new BigDecimal("150000"));
            services.add(parking);

            CustomService cleaning = new CustomService();
            cleaning.setServiceName("Dọn dẹp");
            cleaning.setServiceType(ServiceType.OTHER);
            cleaning.setUnit("lần");
            cleaning.setUnitPrice(new BigDecimal("50000"));
            services.add(cleaning);

            CustomService wifi = new CustomService();
            wifi.setServiceName("WiFi");
            wifi.setServiceType(ServiceType.OTHER);
            wifi.setUnit("tháng");
            wifi.setUnitPrice(new BigDecimal("80000"));
            services.add(wifi);

            CustomService security = new CustomService();
            security.setServiceName("Bảo vệ");
            security.setServiceType(ServiceType.OTHER);
            security.setUnit("tháng");
            security.setUnitPrice(new BigDecimal("200000"));
            services.add(security);

            CustomService maintenance = new CustomService();
            maintenance.setServiceName("Bảo trì");
            maintenance.setServiceType(ServiceType.OTHER);
            maintenance.setUnit("lần");
            maintenance.setUnitPrice(new BigDecimal("100000"));
            services.add(maintenance);

            serviceRepository.saveAll(services);
            
            System.out.println(">>> INITIALIZED " + services.size() + " SERVICES <<<");
            System.out.println(">>> SERVICE NAMES: " + services.stream().map(CustomService::getServiceName).collect(java.util.stream.Collectors.joining(", ")) + " <<<");
            
            // Khởi tạo lịch sử giá cho các dịch vụ mặc định
            initializeServicePriceHistory(services);
        }

        // --- Init Default Contract Templates ---
        if (countContractTemplates == 0) {
            initializeDefaultContractTemplates();
        }

        // --- Init Rooms ---
        if (countRooms == 0) {
            initializeDefaultRooms();
        }

        // --- Init Assets ---
        if (countAssets == 0) {
            initializeDefaultAssets();
        }

        // Đảm bảo tất cả phòng đều có đầy đủ tài sản (an toàn, không tạo trùng)
        ensureAllRoomsHaveAssets();

        if (countPermissions > 0 && countRoles > 0 && countUsers > 0 && countServices > 0 && countContractTemplates > 0 && countRooms > 0 && countAssets > 0) {
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
        String simpleTemplate = createSimpleContractTemplate();
        String detailedTemplate = createDetailedContractTemplate();

        for (User landlord : landlords) {
            // Mẫu hợp đồng chuyên nghiệp
            ContractTemplate template1 = new ContractTemplate();
            template1.setLandlordId(landlord.getId());
            template1.setName("Mẫu hợp đồng chuyên nghiệp");
            template1.setContent(professionalTemplate);
            template1.setIsDefault(true);
            contractTemplateRepository.save(template1);

            // Mẫu hợp đồng đơn giản
            ContractTemplate template2 = new ContractTemplate();
            template2.setLandlordId(landlord.getId());
            template2.setName("Mẫu hợp đồng đơn giản");
            template2.setContent(simpleTemplate);
            template2.setIsDefault(false);
            contractTemplateRepository.save(template2);

            // Mẫu hợp đồng chi tiết
            ContractTemplate template3 = new ContractTemplate();
            template3.setLandlordId(landlord.getId());
            template3.setName("Mẫu hợp đồng chi tiết");
            template3.setContent(detailedTemplate);
            template3.setIsDefault(false);
            contractTemplateRepository.save(template3);
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
            font-size: 16px;
            line-height: 1.6; 
            margin: 40px;
            color: #333;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px;
            padding-bottom: 20px;
        }
        .title { 
            font-size: 24px; 
            font-weight: bold; 
            margin: 20px 0;
            text-align: center;
        }
        .section { 
            margin: 20px 0; 
        }
        .section-title { 
            font-size: 18px; 
            font-weight: bold; 
            margin: 15px 0 10px 0;
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
                        display: flex;
                        justify-content: space-between;
                        gap: 20px;
                    }
                    .signature-box {
                        width: 50%;
                        text-align: center;
                        min-height: 120px;
                        box-sizing: border-box;
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
        <div style="font-weight: bold; font-size: 20px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style="font-weight: bold; font-size: 18px;">Độc lập - Tự do - Hạnh phúc</div>
    </div>

    <div class="title">HỢP ĐỒNG THUÊ PHÒNG TRỌ</div>
    
    <div style="text-align: center; margin-bottom: 20px;">
        <strong>Số hợp đồng: {{contractNumber}}</strong><br />
        <em>Ký {{startDate}}</em>
    </div>

    <p>Hôm nay, <strong>{{startDate}}</strong>, tại <strong>{{room.roomNumber}}</strong>, chúng tôi gồm các bên:</p>

    <div class="section">
        <div class="section-title">BÊN CHO THUÊ (BÊN A)</div>
        <table class="info-table">
            <tr>
                <td class="label">Họ và tên:</td>
                <td>{{landlord.fullName}}</td>
            </tr>
            <tr>
                <td class="label">Số điện thoại:</td>
                <td>{{landlord.phoneNumber}}</td>
            </tr>
            <tr>
                <td class="label">CCCD/CMND:</td>
                <td>{{landlord.nationalID}}</td>
            </tr>
            <tr>
                <td class="label">Địa chỉ thường trú:</td>
                <td>{{landlord.permanentAddress}}</td>
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
                <td>{{nationalID}}</td>
            </tr>
            <tr>
                <td class="label">Địa chỉ thường trú:</td>
                <td>{{permanentAddress}}</td>
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
                <td>Thôn 2 Thạch Hoà, Thạch Thất HN</td>
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
                <td>{{rentAmount}} VNĐ/tháng</td>
            </tr>
            <tr>
                <td class="label">Tiền đặt cọc:</td>
                <td>{{depositAmount}} VNĐ</td>
            </tr>
            <tr>
                <td class="label">Chu kỳ thanh toán:</td>
                <td>{{paymentCycle}}</td>
            </tr>
            <tr>
                <td class="label">Hạn thanh toán:</td>
                <td>Trước ngày 07 của chu kỳ thanh toán</td>
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
        
        <div class="section-title" style="margin-top: 20px;">3.1. ĐIỀU KHOẢN THANH TOÁN TỪNG PHẦN</div>
        <p><strong>Bên B được phép thanh toán từng phần hóa đơn với các điều kiện sau:</strong></p>
        <ul>
            <li><strong>Khoảng thời gian tối thiểu:</strong> 30 ngày giữa các lần thanh toán từng phần</li>
            <li><strong>Số tiền thanh toán tối thiểu:</strong> 50% giá trị hóa đơn</li>
            <li><strong>Phí thanh toán từng phần:</strong>
                <ul>
                    <li>Lần 1: 200.000 VNĐ</li>
                    <li>Lần 2: 500.000 VNĐ</li>
                    <li>Lần 3 trở đi: 1.000.000 VNĐ</li>
                </ul>
            </li>
            <li><strong>Gia hạn tự động:</strong> Hạn thanh toán được gia hạn thêm 30 ngày sau mỗi lần thanh toán từng phần</li>
            <li><strong>Phạt chậm thanh toán:</strong> Bắt đầu tính phạt sau 7 ngày kể từ hạn thanh toán mới (sau khi gia hạn)</li>
        </ul>
        
        <div class="section-title" style="margin-top: 20px;">3.2. SỐ TIỀN THU VÀ PHƯƠNG THỨC THU</div>
        <table class="info-table">
            <tr>
                <td class="label">Tiền phòng:</td>
                <td>{{rentAmount}} VNĐ/tháng</td>
            </tr>
            <tr>
                <td class="label">Tiền đặt cọc:</td>
                <td>{{depositAmount}} VNĐ (thu 1 lần khi ký hợp đồng)</td>
            </tr>
            <tr>
                <td class="label">Tiền điện:</td>
                <td>Theo chỉ số công tơ điện thực tế</td>
            </tr>
            <tr>
                <td class="label">Tiền nước:</td>
                <td>Theo chỉ số đồng hồ nước thực tế</td>
            </tr>
            <tr>
                <td class="label">Tiền internet:</td>
                <td>Theo gói cước đã đăng ký</td>
            </tr>
            <tr>
                <td class="label">Tiền rác:</td>
                <td>Theo quy định của địa phương</td>
            </tr>
            <tr>
                <td class="label">Phí dịch vụ khác:</td>
                <td>Theo thỏa thuận và thông báo trước</td>
            </tr>
        </table>
        
        <p><strong>Lưu ý:</strong></p>
        <ul>
            <li>Tất cả các khoản tiền phải được thanh toán đầy đủ và đúng hạn</li>
            <li>Việc thanh toán từng phần chỉ áp dụng cho tiền phòng, không áp dụng cho các khoản phí dịch vụ</li>
            <li>Phí thanh toán từng phần được tính cố định theo số lần thanh toán, không phụ thuộc vào số tiền thanh toán</li>
            <li>Bên A có quyền từ chối thanh toán từng phần nếu Bên B vi phạm các điều khoản của hợp đồng</li>
        </ul>
    </div>

    <div class="section">
        <div class="section-title">Điều 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN CHO THUÊ</div>
        <p><strong>4.1. Quyền của Bên A:</strong></p>
        <ul>
            <li>Yêu cầu Bên B thanh toán đầy đủ, đúng hạn các khoản tiền theo hợp đồng</li>
            <li>Yêu cầu Bên B bồi thường thiệt hại do vi phạm hợp đồng gây ra</li>
            <li>Đơn phương chấm dứt hợp đồng nếu Bên B vi phạm nghiêm trọng</li>
        </ul>
        <p><strong>4.2. Nghĩa vụ của Bên A:</strong></p>
        <ul>
            <li>Bàn giao phòng trọ đúng tình trạng thỏa thuận</li>
            <li>Bảo đảm quyền sử dụng ổn định của Bên B trong thời hạn hợp đồng</li>
            <li>Bảo trì, sửa chữa phòng trọ theo thỏa thuận</li>
            <li>Hoàn trả tiền đặt cọc khi kết thúc hợp đồng</li>
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

    <p style="margin-top: 30px;"><strong>Điều cuối:</strong> Hợp đồng này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản. 
    Hợp đồng có hiệu lực kể từ ngày ký và chấm dứt theo đúng thỏa thuận.</p>

    <div class="signature-section">
        <div class="signature-box">
            <div style="font-weight: bold; margin-bottom: 10px;">ĐẠI DIỆN BÊN B</div>
            <div style="font-style: italic; margin-bottom: 60px;">(Ký và ghi rõ họ tên)</div>
        </div>
        <div class="signature-box">
            <div style="font-weight: bold; margin-bottom: 10px;">ĐẠI DIỆN BÊN A</div>
            <div style="font-style: italic; margin-bottom: 60px;">(Ký và ghi rõ họ tên)</div>
                        </div>
            </div>
        </body>
        </html>
                """;
    }

    private String createSimpleContractTemplate() {
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <style>
        body { 
            font-family: Arial, sans-serif; 
            font-size: 14px;
            line-height: 1.5; 
            margin: 30px;
            color: #333;
        }
        .header { 
            text-align: center; 
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }
        .title { 
            font-size: 20px; 
            font-weight: bold; 
            margin: 15px 0;
            text-align: center;
        }
        .section { 
            margin: 15px 0; 
        }
        .section-title { 
            font-size: 16px; 
            font-weight: bold; 
            margin: 10px 0 5px 0;
            color: #2c3e50;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        .info-table td {
            padding: 6px;
            border: 1px solid #ddd;
            vertical-align: top;
        }
        .info-table .label {
            background-color: #f8f9fa;
            font-weight: bold;
            width: 25%;
        }
        .signature-section {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            gap: 15px;
        }
        .signature-box {
            width: 50%;
            text-align: center;
            min-height: 80px;
            box-sizing: border-box;
        }
        ul {
            margin: 8px 0;
            padding-left: 20px;
        }
        li {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div style="font-weight: bold; font-size: 18px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style="font-weight: bold; font-size: 16px;">Độc lập - Tự do - Hạnh phúc</div>
    </div>

    <div class="title">HỢP ĐỒNG THUÊ PHÒNG</div>
    
    <div style="text-align: center; margin-bottom: 15px;">
        <strong>Số hợp đồng: {{contractNumber}}</strong><br />
        <em>Ngày: {{startDate}}</em>
    </div>

    <p><strong>BÊN CHO THUÊ:</strong> {{landlord.fullName}} - SĐT: {{landlord.phoneNumber}}</p>
    <p><strong>BÊN THUÊ:</strong></p>
    {{#each renters}}
    <p>- {{fullName}} - SĐT: {{phoneNumber}}</p>
    {{/each}}

    <div class="section">
        <div class="section-title">THÔNG TIN PHÒNG</div>
        <table class="info-table">
            <tr>
                <td class="label">Số phòng:</td>
                <td>{{room.roomNumber}}</td>
            </tr>
            <tr>
                <td class="label">Giá thuê:</td>
                <td>{{rentAmount}} VNĐ/tháng</td>
            </tr>
            <tr>
                <td class="label">Tiền cọc:</td>
                <td>{{depositAmount}} VNĐ</td>
            </tr>
            <tr>
                <td class="label">Thời hạn:</td>
                <td>{{startDate}} - {{endDate}}</td>
            </tr>
            <tr>
                <td class="label">Thanh toán:</td>
                <td>{{paymentCycle}}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU KHOẢN CHÍNH</div>
        <ul>
            <li>Bên thuê thanh toán đúng hạn tiền phòng và các dịch vụ</li>
            <li>Giữ gìn vệ sinh và trật tự chung</li>
            <li>Không được sửa chữa, thay đổi cấu trúc phòng</li>
            <li>Báo cáo ngay khi có sự cố về điện, nước</li>
            <li>Trả phòng đúng hạn khi kết thúc hợp đồng</li>
        </ul>
    </div>

    <div class="section">
        <div class="section-title">THANH TOÁN TỪNG PHẦN</div>
        <ul>
            <li>Được phép thanh toán từng phần với khoảng cách tối thiểu 30 ngày</li>
            <li>Số tiền tối thiểu: 50% giá trị hóa đơn</li>
            <li>Phí thanh toán từng phần: Lần 1 (200k), Lần 2 (500k), Lần 3+ (1M)</li>
            <li>Gia hạn tự động 30 ngày sau mỗi lần thanh toán</li>
            <li>Phạt chậm thanh toán sau 7 ngày kể từ hạn mới</li>
        </ul>
    </div>

    <div class="section">
        <div class="section-title">CÁC KHOẢN THU</div>
        <ul>
            <li><strong>Tiền phòng:</strong> {{rentAmount}} VNĐ/tháng</li>
            <li><strong>Tiền cọc:</strong> {{depositAmount}} VNĐ (thu 1 lần)</li>
            <li><strong>Tiền điện:</strong> Theo chỉ số thực tế</li>
            <li><strong>Tiền nước:</strong> Theo chỉ số thực tế</li>
            <li><strong>Internet:</strong> Theo gói cước</li>
            <li><strong>Tiền rác:</strong> Theo quy định địa phương</li>
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

    <p style="margin-top: 20px;"><strong>Hợp đồng này có hiệu lực từ ngày ký.</strong></p>

    <div class="signature-section">
        <div class="signature-box">
            <div style="font-weight: bold; margin-bottom: 8px;">BÊN THUÊ</div>
            <div style="font-style: italic; margin-bottom: 40px;">(Ký tên)</div>
        </div>
        <div class="signature-box">
            <div style="font-weight: bold; margin-bottom: 8px;">BÊN CHO THUÊ</div>
            <div style="font-style: italic; margin-bottom: 40px;">(Ký tên)</div>
        </div>
    </div>
</body>
</html>
                """;
    }

    private String createDetailedContractTemplate() {
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <style>
        body { 
            font-family: 'Times New Roman', serif; 
            font-size: 14px;
            line-height: 1.6; 
            margin: 40px;
            color: #2c3e50;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 3px solid #34495e;
            padding-bottom: 20px;
        }
        .title { 
            font-size: 22px; 
            font-weight: bold; 
            margin: 20px 0;
            text-align: center;
            color: #2c3e50;
        }
        .section { 
            margin: 20px 0; 
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }
        .section-title { 
            font-size: 16px; 
            font-weight: bold; 
            margin: 15px 0 10px 0;
            color: #2980b9;
            text-transform: uppercase;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .info-table td {
            padding: 10px;
            border: 1px solid #bdc3c7;
            vertical-align: top;
        }
        .info-table .label {
            background-color: #ecf0f1;
            font-weight: bold;
            width: 30%;
            color: #2c3e50;
        }
        .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            gap: 30px;
        }
        .signature-box {
            width: 50%;
            text-align: center;
            min-height: 120px;
            box-sizing: border-box;
            border: 1px solid #bdc3c7;
            padding: 15px;
            border-radius: 5px;
        }
        ul {
            margin: 12px 0;
            padding-left: 25px;
        }
        li {
            margin: 8px 0;
        }
        .highlight {
            background-color: #fff3cd;
            padding: 10px;
            border-left: 4px solid #ffc107;
            margin: 15px 0;
        }
        .warning {
            background-color: #f8d7da;
            padding: 10px;
            border-left: 4px solid #dc3545;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div style="font-weight: bold; font-size: 18px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style="font-weight: bold; font-size: 16px;">Độc lập - Tự do - Hạnh phúc</div>
        <div style="font-size: 12px; margin-top: 10px;">---o0o---</div>
    </div>

    <div class="title">HỢP ĐỒNG THUÊ PHÒNG TRỌ CHI TIẾT</div>
    
    <div style="text-align: center; margin-bottom: 25px;">
        <strong>Số hợp đồng: {{contractNumber}}</strong><br />
        <em>Ngày ký: {{startDate}}</em><br />
        <em>Địa điểm: {{room.roomNumber}}</em>
    </div>

    <div class="highlight">
        <strong>LƯU Ý:</strong> Hợp đồng này được lập theo quy định của pháp luật Việt Nam về nhà ở và các văn bản pháp luật có liên quan.
    </div>

    <div class="section">
        <div class="section-title">THÔNG TIN CÁC BÊN</div>
        
        <div style="margin-bottom: 20px;">
            <strong style="color: #e74c3c;">BÊN CHO THUÊ (BÊN A):</strong>
            <table class="info-table">
                <tr>
                    <td class="label">Họ và tên:</td>
                    <td>{{landlord.fullName}}</td>
                </tr>
                <tr>
                    <td class="label">Số điện thoại:</td>
                    <td>{{landlord.phoneNumber}}</td>
                </tr>
                <tr>
                    <td class="label">CCCD/CMND:</td>
                    <td>{{landlord.nationalID}}</td>
                </tr>
                <tr>
                    <td class="label">Địa chỉ thường trú:</td>
                    <td>{{landlord.permanentAddress}}</td>
                </tr>
            </table>
        </div>

        <div>
            <strong style="color: #27ae60;">BÊN THUÊ PHÒNG (BÊN B):</strong>
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
                    <td>{{nationalID}}</td>
                </tr>
                <tr>
                    <td class="label">Địa chỉ thường trú:</td>
                    <td>{{permanentAddress}}</td>
                </tr>
            </table>
            {{/each}}
        </div>
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU 1: ĐỐI TƯỢNG VÀ MỤC ĐÍCH THUÊ</div>
        <p>Bên A đồng ý cho Bên B thuê phòng trọ với các thông tin chi tiết:</p>
        <table class="info-table">
            <tr>
                <td class="label">Số phòng:</td>
                <td>{{room.roomNumber}}</td>
            </tr>
            <tr>
                <td class="label">Địa chỉ:</td>
                <td>Thôn 2 Thạch Hoà, Thạch Thất, Hà Nội</td>
            </tr>
            <tr>
                <td class="label">Diện tích:</td>
                <td>Theo thực tế bàn giao</td>
            </tr>
            <tr>
                <td class="label">Mục đích sử dụng:</td>
                <td>Để ở và sinh hoạt cá nhân</td>
            </tr>
            <tr>
                <td class="label">Tình trạng phòng:</td>
                <td>Bàn giao theo hiện trạng, có đầy đủ tiện nghi cơ bản</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU 2: THỜI HẠN VÀ HIỆU LỰC HỢP ĐỒNG</div>
        <table class="info-table">
            <tr>
                <td class="label">Thời hạn thuê:</td>
                <td>Từ ngày {{startDate}} đến ngày {{endDate}}</td>
            </tr>
            <tr>
                <td class="label">Hiệu lực:</td>
                <td>Hợp đồng có hiệu lực kể từ ngày ký và bàn giao phòng</td>
            </tr>
            <tr>
                <td class="label">Gia hạn:</td>
                <td>Có thể gia hạn nếu hai bên đồng ý trước 30 ngày</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU 3: GIÁ THUÊ VÀ PHƯƠNG THỨC THANH TOÁN</div>
        <table class="info-table">
            <tr>
                <td class="label">Giá thuê phòng:</td>
                <td>{{rentAmount}} VNĐ/tháng (đã bao gồm thuế)</td>
            </tr>
            <tr>
                <td class="label">Tiền đặt cọc:</td>
                <td>{{depositAmount}} VNĐ (hoàn trả khi kết thúc hợp đồng)</td>
            </tr>
            <tr>
                <td class="label">Chu kỳ thanh toán:</td>
                <td>{{paymentCycle}}</td>
            </tr>
            <tr>
                <td class="label">Hạn thanh toán:</td>
                <td>Trước ngày 05 của chu kỳ thanh toán</td>
            </tr>
            <tr>
                <td class="label">Phương thức:</td>
                <td>Tiền mặt hoặc chuyển khoản ngân hàng</td>
            </tr>
            <tr>
                <td class="label">Các khoản phí khác:</td>
                <td>Điện, nước, internet, rác, vệ sinh... (theo thực tế sử dụng)</td>
            </tr>
        </table>
        
        <div class="section-title" style="margin-top: 20px;">3.1. ĐIỀU KHOẢN THANH TOÁN TỪNG PHẦN</div>
        <p><strong>Bên B được phép thanh toán từng phần hóa đơn với các điều kiện sau:</strong></p>
        <ul>
            <li><strong>Khoảng thời gian tối thiểu:</strong> 30 ngày giữa các lần thanh toán từng phần</li>
            <li><strong>Số tiền thanh toán tối thiểu:</strong> 50% giá trị hóa đơn</li>
            <li><strong>Phí thanh toán từng phần:</strong>
                <ul>
                    <li>Lần 1: 200.000 VNĐ</li>
                    <li>Lần 2: 500.000 VNĐ</li>
                    <li>Lần 3 trở đi: 1.000.000 VNĐ</li>
                </ul>
            </li>
            <li><strong>Gia hạn tự động:</strong> Hạn thanh toán được gia hạn thêm 30 ngày sau mỗi lần thanh toán từng phần</li>
            <li><strong>Phạt chậm thanh toán:</strong> Bắt đầu tính phạt sau 7 ngày kể từ hạn thanh toán mới (sau khi gia hạn)</li>
        </ul>
        
        <div class="section-title" style="margin-top: 20px;">3.2. CHI TIẾT CÁC KHOẢN THU</div>
        <table class="info-table">
            <tr>
                <td class="label">Tiền phòng:</td>
                <td>{{rentAmount}} VNĐ/tháng</td>
            </tr>
            <tr>
                <td class="label">Tiền đặt cọc:</td>
                <td>{{depositAmount}} VNĐ (thu 1 lần khi ký hợp đồng)</td>
            </tr>
            <tr>
                <td class="label">Tiền điện:</td>
                <td>Theo chỉ số công tơ điện thực tế</td>
            </tr>
            <tr>
                <td class="label">Tiền nước:</td>
                <td>Theo chỉ số đồng hồ nước thực tế</td>
            </tr>
            <tr>
                <td class="label">Tiền internet:</td>
                <td>Theo gói cước đã đăng ký</td>
            </tr>
            <tr>
                <td class="label">Tiền rác:</td>
                <td>Theo quy định của địa phương</td>
            </tr>
            <tr>
                <td class="label">Phí dịch vụ khác:</td>
                <td>Theo thỏa thuận và thông báo trước</td>
            </tr>
        </table>
        
        <div class="warning" style="margin-top: 15px;">
            <strong>Lưu ý quan trọng:</strong>
            <ul>
                <li>Tất cả các khoản tiền phải được thanh toán đầy đủ và đúng hạn</li>
                <li>Việc thanh toán từng phần chỉ áp dụng cho tiền phòng, không áp dụng cho các khoản phí dịch vụ</li>
                <li>Phí thanh toán từng phần được tính cố định theo số lần thanh toán, không phụ thuộc vào số tiền thanh toán</li>
                <li>Bên A có quyền từ chối thanh toán từng phần nếu Bên B vi phạm các điều khoản của hợp đồng</li>
            </ul>
        </div>
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN CHO THUÊ</div>
        <p><strong>4.1. Quyền của Bên A:</strong></p>
        <ul>
            <li>Yêu cầu Bên B thanh toán đầy đủ, đúng hạn các khoản tiền theo hợp đồng</li>
            <li>Yêu cầu Bên B bồi thường thiệt hại do vi phạm hợp đồng gây ra</li>
            <li>Đơn phương chấm dứt hợp đồng nếu Bên B vi phạm nghiêm trọng</li>
            <li>Kiểm tra tình trạng phòng định kỳ (có báo trước)</li>
            <li>Thu hồi phòng khi hết hạn hợp đồng</li>
        </ul>
        <p><strong>4.2. Nghĩa vụ của Bên A:</strong></p>
        <ul>
            <li>Bàn giao phòng trọ đúng tình trạng thỏa thuận</li>
            <li>Bảo đảm quyền sử dụng ổn định của Bên B trong thời hạn hợp đồng</li>
            <li>Bảo trì, sửa chữa phòng trọ theo thỏa thuận</li>
            <li>Hoàn trả tiền đặt cọc khi kết thúc hợp đồng (trừ thiệt hại)</li>
            <li>Cung cấp thông tin liên lạc khẩn cấp</li>
        </ul>
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN THUÊ</div>
        <p><strong>5.1. Quyền của Bên B:</strong></p>
        <ul>
            <li>Được sử dụng phòng trọ đúng mục đích đã thỏa thuận</li>
            <li>Yêu cầu Bên A sửa chữa những hỏng hóc không do lỗi của mình</li>
            <li>Được gia hạn hợp đồng nếu hai bên đồng ý</li>
            <li>Được bảo mật thông tin cá nhân</li>
            <li>Được yêu cầu cung cấp hóa đơn thanh toán</li>
        </ul>
        <p><strong>5.2. Nghĩa vụ của Bên B:</strong></p>
        <ul>
            <li>Thanh toán đầy đủ, đúng hạn các khoản tiền theo hợp đồng</li>
            <li>Sử dụng phòng trọ đúng mục đích, giữ gìn vệ sinh chung</li>
            <li>Tuân thủ quy định về phòng cháy chữa cháy, an ninh trật tự</li>
            <li>Bồi thường thiệt hại do mình gây ra</li>
            <li>Trả lại phòng trọ khi kết thúc hợp đồng</li>
            <li>Báo cáo ngay khi có sự cố về điện, nước, an ninh</li>
            <li>Không được cho người khác thuê lại</li>
        </ul>
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU 6: ĐIỀU KHOẢN VỀ DỊCH VỤ</div>
        <ul>
            <li>Điện, nước: Tính theo đồng hồ, giá theo quy định</li>
            <li>Internet: Theo gói dịch vụ đã đăng ký</li>
            <li>Vệ sinh: Được cung cấp hàng tuần</li>
            <li>An ninh: Có camera giám sát 24/7</li>
            <li>Bảo trì: Miễn phí cho các hỏng hóc thông thường</li>
        </ul>
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU 7: ĐIỀU KHOẢN CHẤM DỨT HỢP ĐỒNG</div>
        <ul>
            <li>Hết hạn hợp đồng theo thỏa thuận</li>
            <li>Hai bên đồng ý chấm dứt sớm</li>
            <li>Vi phạm nghiêm trọng các điều khoản hợp đồng</li>
            <li>Phòng bị thu hồi theo quyết định của cơ quan có thẩm quyền</li>
        </ul>
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU 8: GIẢI QUYẾT TRANH CHẤP</div>
        <ul>
            <li>Hai bên cam kết giải quyết tranh chấp bằng thương lượng</li>
            <li>Nếu không thỏa thuận được, sẽ giải quyết tại Tòa án có thẩm quyền</li>
            <li>Áp dụng pháp luật Việt Nam để giải quyết</li>
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

    <div class="warning">
        <strong>LƯU Ý QUAN TRỌNG:</strong> Bên thuê cần đọc kỹ tất cả điều khoản trước khi ký. Việc ký hợp đồng đồng nghĩa với việc đồng ý tuân thủ tất cả điều khoản đã thỏa thuận.
    </div>

    <p style="margin-top: 30px;"><strong>Điều cuối:</strong> Hợp đồng này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản. 
    Hợp đồng có hiệu lực kể từ ngày ký và chấm dứt theo đúng thỏa thuận.</p>

    <div class="signature-section">
        <div class="signature-box">
            <div style="font-weight: bold; margin-bottom: 10px; color: #e74c3c;">ĐẠI DIỆN BÊN B</div>
            <div style="font-style: italic; margin-bottom: 60px;">(Ký và ghi rõ họ tên)</div>
            <div style="font-size: 12px; color: #7f8c8d;">Ngày: ............</div>
        </div>
        <div class="signature-box">
            <div style="font-weight: bold; margin-bottom: 10px; color: #27ae60;">ĐẠI DIỆN BÊN A</div>
            <div style="font-style: italic; margin-bottom: 60px;">(Ký và ghi rõ họ tên)</div>
            <div style="font-size: 12px; color: #7f8c8d;">Ngày: ............</div>
        </div>
    </div>
</body>
</html>
                """;
    }

    private void initializeDefaultRooms() {
        List<Room> rooms = new ArrayList<>();
        
        // Lấy landlord đầu tiên để gán cho tất cả phòng
        User landlord = userRepository.findByRoleRoleName("LANDLORD");
        if (landlord == null) {
            System.out.println(">>> WARNING: No LANDLORD found, rooms will be created without landlord <<<");
        }

        // Tạo danh sách số phòng từ 122 đến 325 (bỏ qua 324 như trong hình)
        List<String> roomNumbers = new ArrayList<>();
        
        // Tầng 1: 122
        roomNumbers.add("122");
        
        // Tầng 2: 201-220 (bỏ qua 204)
        for (int i = 201; i <= 220; i++) {
            if (i != 204) {
                roomNumbers.add(String.valueOf(i));
            }
        }
        
        // Tầng 2: 221-223, 225
        roomNumbers.addAll(List.of("221", "222", "223", "225"));
        
        // Tầng 3: 301-320
        for (int i = 301; i <= 320; i++) {
            roomNumbers.add(String.valueOf(i));
        }
        
        // Tầng 3: 321-323, 325
        roomNumbers.addAll(List.of("321", "322", "323", "325"));

        // Tạo phòng cho mỗi số phòng
        for (String roomNumber : roomNumbers) {
            Room room = new Room();
            
            // Phân chia tòa nhà A và B
            String building = determineBuilding(roomNumber);
            String fullRoomNumber = building + roomNumber; // A122, B201, etc.
            
            room.setRoomNumber(fullRoomNumber); // Room number với format A122, B201
            room.setArea(new BigDecimal("25.0")); // Diện tích mặc định 25m²
            // Thiết lập giá thuê linh hoạt theo tầng/khu
            double basePrice = 2200000.0; // 2.2 triệu
            // Tầng càng cao giá càng cao một chút
            int roomNumInt = Integer.parseInt(roomNumber);
            int floor = roomNumInt == 122 ? 1 : (roomNumInt / 100); // 122 thuộc tầng 1
            double floorBonus = (floor - 1) * 100000.0; // +100k mỗi tầng
            // Building A phụ thu 100k so với B (ví dụ vị trí đẹp hơn)
            double buildingBonus = "A".equals(building) ? 100000.0 : 0.0;
            room.setPricePerMonth(basePrice + floorBonus + buildingBonus);
            room.setRoomStatus(RoomStatus.Available); // Trạng thái có sẵn
            room.setNumberOfBedrooms(1); // 1 phòng ngủ
            room.setNumberOfBathrooms(1); // 1 phòng tắm
            room.setMaxOccupants(2); // Tối đa 2 người
            
            room.setBuilding(building);
            
            room.setDescription("Phòng trọ " + fullRoomNumber + " - Tòa nhà " + building + " - Tiện nghi đầy đủ, an ninh 24/7");
            room.setIsActive(true);
            room.setDeleted(false);
            room.setScanFolder(fullRoomNumber); // Thư mục scan với format A122, B201

            // Thêm ảnh mặc định cho tất cả phòng
            java.util.List<String> defaultImageUrls = java.util.List.of(
                "/uploads/Tongquanphong.jpg",
                "/uploads/Banruabat.jpg",
                "/uploads/DieuhoaCasper.jpg",
                "/uploads/Dieukhiendieuhoa.jpg",
                "/uploads/Giuong.jpg",
                "/uploads/nhavesinh.jpg",
                "/uploads/Tudungquanao.jpg",
                "/uploads/Tulanh.jpg"
            );
            for (String url : defaultImageUrls) {
                RoomImage image = new RoomImage();
                image.setRoom(room);
                image.setImageURL(url);
                room.getImages().add(image);
            }
            
            // Gán landlord nếu có
            if (landlord != null) {
                room.setLandlord(landlord);
            }
            
            rooms.add(room);
        }

        // Lưu tất cả phòng vào database
        roomRepository.saveAll(rooms);
        
        System.out.println(">>> INITIALIZED " + rooms.size() + " ROOMS <<<");
        System.out.println(">>> ROOM NUMBERS: " + String.join(", ", roomNumbers) + " <<<");
        
        // Gán dịch vụ cơ bản cho tất cả phòng
        assignBasicServicesToRooms(rooms);
        // Gán thêm các dịch vụ mở rộng (internet, dọn dẹp, bảo vệ, đỗ xe...)
        assignAdditionalServicesToRooms(rooms);
        
        // Gán asset cho tất cả phòng
        assignAssetsToRooms(rooms);
        
        // Tạo service reading cho dịch vụ điện
        createElectricServiceReadings(rooms);
        
        // Tạo folder cho electric reading
        createElectricReadingFolders(roomNumbers);
    }
    
    private String determineBuilding(String roomNumber) {
        int roomNum = Integer.parseInt(roomNumber);
        
        // Building A: Phòng 122, 201-210, 221-223, 301-310, 321-323
        if (roomNum == 122 || 
            (roomNum >= 201 && roomNum <= 210) || 
            (roomNum >= 221 && roomNum <= 223) || 
            (roomNum >= 301 && roomNum <= 310) || 
            (roomNum >= 321 && roomNum <= 323)) {
            return "A";
        }
        // Building B: Phòng 211-220, 225, 311-320, 325
        else {
            return "B";
        }
    }

    private void initializeDefaultAssets() {
        List<Asset> assets = new ArrayList<>();
        
        // 1. Bàn rửa bát (Dishwashing table/Kitchen sink)
        Asset banRuaBat = new Asset();
        banRuaBat.setAssetName("Bàn rửa bát");
        banRuaBat.setQuantity(new BigDecimal("1"));
        banRuaBat.setConditionNote("Bàn rửa bát inox, có vòi nước và kệ để đồ");
        banRuaBat.setAssetImage("/uploads/Banruabat.jpg");
        assets.add(banRuaBat);

        // 2. Điều hòa Casper (Casper Air conditioner)
        Asset dieuHoaCasper = new Asset();
        dieuHoaCasper.setAssetName("Điều hòa Casper");
        dieuHoaCasper.setQuantity(new BigDecimal("1"));
        dieuHoaCasper.setConditionNote("Điều hòa Casper 1 chiều, công suất 9000 BTU");
        dieuHoaCasper.setAssetImage("/uploads/DieuhoaCasper.jpg");
        assets.add(dieuHoaCasper);

        // 3. Điều khiển điều hòa (Air conditioner remote control)
        Asset dieuKhienDieuHoa = new Asset();
        dieuKhienDieuHoa.setAssetName("Điều khiển điều hòa");
        dieuKhienDieuHoa.setQuantity(new BigDecimal("1"));
        dieuKhienDieuHoa.setConditionNote("Remote điều khiển điều hòa Casper, có pin");
        dieuKhienDieuHoa.setAssetImage("/uploads/Dieukhiendieuhoa.jpg");
        assets.add(dieuKhienDieuHoa);

        // 4. Giường (Bed)
        Asset giuong = new Asset();
        giuong.setAssetName("Giường");
        giuong.setQuantity(new BigDecimal("1"));
        giuong.setConditionNote("Giường đơn, khung sắt, có ván lót");
        giuong.setAssetImage("/uploads/Giuong.jpg");
        assets.add(giuong);

        // 5. Nhà vệ sinh (Bathroom)
        Asset nhaVeSinh = new Asset();
        nhaVeSinh.setAssetName("Nhà vệ sinh");
        nhaVeSinh.setQuantity(new BigDecimal("1"));
        nhaVeSinh.setConditionNote("Nhà vệ sinh riêng, có bồn cầu và vòi sen");
        nhaVeSinh.setAssetImage("/uploads/nhavesinh.jpg");
        assets.add(nhaVeSinh);

        // 6. Tủ đựng quần áo (Wardrobe/Closet)
        Asset tuDungQuanAo = new Asset();
        tuDungQuanAo.setAssetName("Tủ đựng quần áo");
        tuDungQuanAo.setQuantity(new BigDecimal("1"));
        tuDungQuanAo.setConditionNote("Tủ quần áo 2 cánh, có kệ bên trong");
        tuDungQuanAo.setAssetImage("/uploads/Tudungquanao.jpg");
        assets.add(tuDungQuanAo);

        // 7. Tủ lạnh (Refrigerator)
        Asset tuLanh = new Asset();
        tuLanh.setAssetName("Tủ lạnh");
        tuLanh.setQuantity(new BigDecimal("1"));
        tuLanh.setConditionNote("Tủ lạnh 2 cửa, dung tích 150L");
        tuLanh.setAssetImage("/uploads/Tulanh.jpg");
        assets.add(tuLanh);

        // Lưu tất cả asset vào database
        assetRepository.saveAll(assets);
        
        System.out.println(">>> INITIALIZED " + assets.size() + " ASSETS <<<");
        System.out.println(">>> ASSET NAMES: " + assets.stream().map(Asset::getAssetName).collect(java.util.stream.Collectors.joining(", ")) + " <<<");
    }
    
    private void assignBasicServicesToRooms(List<Room> rooms) {
        // Lấy các dịch vụ cơ bản (Điện và Nước)
        CustomService electricityService = serviceRepository.findByServiceType(ServiceType.ELECTRICITY);
        CustomService waterService = serviceRepository.findByServiceType(ServiceType.WATER);
        
        if (electricityService == null || waterService == null) {
            System.out.println(">>> WARNING: Basic services (Electricity/Water) not found <<<");
            return;
        }
        
        List<RoomServiceMapping> mappings = new ArrayList<>();
        
        for (Room room : rooms) {
            // Gán dịch vụ điện
            RoomServiceMapping electricityMapping = new RoomServiceMapping();
            electricityMapping.setRoom(room);
            electricityMapping.setService(electricityService);
            electricityMapping.setIsActive(true);
            electricityMapping.setNote("Tính tiền theo chỉ số công tơ điện thực tế");
            mappings.add(electricityMapping);
            
            // Gán dịch vụ nước
            RoomServiceMapping waterMapping = new RoomServiceMapping();
            waterMapping.setRoom(room);
            waterMapping.setService(waterService);
            waterMapping.setIsActive(true);
            waterMapping.setNote("Tính tiền theo chỉ số đồng hồ nước thực tế");
            mappings.add(waterMapping);
        }
        
        // Lưu tất cả mappings
        roomServiceMappingRepository.saveAll(mappings);
        
        System.out.println(">>> ASSIGNED BASIC SERVICES TO " + rooms.size() + " ROOMS <<<");
        System.out.println(">>> SERVICES: Điện, Nước <<<");
    }

    // Gán thêm các dịch vụ khác (ngoài điện, nước) cho phòng với ghi chú hợp lý
    private void assignAdditionalServicesToRooms(List<Room> rooms) {
        // Lấy danh sách dịch vụ đã khởi tạo từ DB
        List<CustomService> allServices = serviceRepository.findAll();
        CustomService internet = allServices.stream().filter(s -> "Internet".equalsIgnoreCase(s.getServiceName())).findFirst().orElse(null);
        CustomService wifi = allServices.stream().filter(s -> "WiFi".equalsIgnoreCase(s.getServiceName())).findFirst().orElse(null);
        CustomService parking = allServices.stream().filter(s -> "Đỗ xe".equalsIgnoreCase(s.getServiceName())).findFirst().orElse(null);
        CustomService cleaning = allServices.stream().filter(s -> "Dọn dẹp".equalsIgnoreCase(s.getServiceName())).findFirst().orElse(null);
        CustomService security = allServices.stream().filter(s -> "Bảo vệ".equalsIgnoreCase(s.getServiceName())).findFirst().orElse(null);

        List<RoomServiceMapping> mappings = new ArrayList<>();

        for (Room room : rooms) {
            String numberPart = room.getRoomNumber().replaceAll("^[A-Za-z]", "");
            int floor = 1;
            try { floor = Integer.parseInt(numberPart.substring(0, 1)); } catch (Exception ignored) {}

            // Internet/WiFi: cung cấp cho tất cả phòng
            if (internet != null) {
                RoomServiceMapping internetMap = new RoomServiceMapping();
                internetMap.setRoom(room);
                internetMap.setService(internet);
                internetMap.setIsActive(true);
                internetMap.setNote("Kết nối Internet cố định trong phòng");
                mappings.add(internetMap);
            } else if (wifi != null) { // fallback dùng WiFi nếu không có Internet
                RoomServiceMapping wifiMap = new RoomServiceMapping();
                wifiMap.setRoom(room);
                wifiMap.setService(wifi);
                wifiMap.setIsActive(true);
                wifiMap.setNote("WiFi tốc độ cao phủ sóng toàn tòa nhà");
                mappings.add(wifiMap);
            }

            // Bảo vệ: áp dụng cho tất cả phòng
            if (security != null) {
                RoomServiceMapping secMap = new RoomServiceMapping();
                secMap.setRoom(room);
                secMap.setService(security);
                secMap.setIsActive(true);
                secMap.setNote("Bảo vệ và camera an ninh 24/7");
                mappings.add(secMap);
            }

            // Dọn dẹp: áp dụng cho tất cả phòng (khu vực chung)
            if (cleaning != null) {
                RoomServiceMapping cleanMap = new RoomServiceMapping();
                cleanMap.setRoom(room);
                cleanMap.setService(cleaning);
                cleanMap.setIsActive(true);
                cleanMap.setNote("Dọn dẹp khu vực chung định kỳ hàng tuần");
                mappings.add(cleanMap);
            }

            // Đỗ xe: ưu tiên tòa B hoặc tầng 1,2
            if (parking != null) {
                boolean shouldAddParking = room.getBuilding() != null && ("B".equals(room.getBuilding()) || floor <= 2);
                if (shouldAddParking) {
                    RoomServiceMapping parkMap = new RoomServiceMapping();
                    parkMap.setRoom(room);
                    parkMap.setService(parking);
                    parkMap.setIsActive(true);
                    parkMap.setNote("Bãi đỗ xe tầng trệt, phí tính theo tháng");
                    mappings.add(parkMap);
                }
            }
        }

        if (!mappings.isEmpty()) {
            roomServiceMappingRepository.saveAll(mappings);
        }
    }
    
    private void createElectricReadingFolders(List<String> roomNumbers) {
        String baseDir = System.getProperty("user.dir") + "/frontend/public/img/ocr/";
        java.io.File baseDirectory = new java.io.File(baseDir);
        
        if (!baseDirectory.exists()) {
            baseDirectory.mkdirs();
            System.out.println(">>> CREATED BASE DIRECTORY: " + baseDir + " <<<");
        }
        
        int createdFolders = 0;
        
        for (String roomNumber : roomNumbers) {
            // Tạo folder name với format A122, B201
            String building = determineBuilding(roomNumber);
            String folderName = building + roomNumber;
            
            String roomDir = baseDir + folderName + "/";
            java.io.File roomDirectory = new java.io.File(roomDir);
            
            if (!roomDirectory.exists()) {
                roomDirectory.mkdirs();
                createdFolders++;
                
                // Tạo file README.txt trong mỗi folder
                try {
                    java.io.File readmeFile = new java.io.File(roomDir + "README.txt");
                    java.io.FileWriter writer = new java.io.FileWriter(readmeFile);
                    writer.write("OCR Reading Folder for Room " + folderName + "\n");
                    writer.write("Building: " + building + "\n");
                    writer.write("Room Number: " + roomNumber + "\n");
                    writer.write("Created: " + java.time.LocalDateTime.now() + "\n");
                    writer.write("Purpose: Store OCR readings and related images\n");
                    writer.write("Format: YYYY-MM-DD_HH-MM-SS_reading.jpg\n");
                    writer.write("Access URL: /img/ocr/" + folderName + "/\n");
                    writer.close();
                } catch (Exception e) {
                    System.out.println(">>> WARNING: Could not create README for room " + folderName + ": " + e.getMessage() + " <<<");
                }
            }
        }
        
        System.out.println(">>> CREATED " + createdFolders + " OCR READING FOLDERS <<<");
        System.out.println(">>> BASE PATH: " + baseDir + " <<<");
        System.out.println(">>> FOLDER FORMAT: A122, A201, B211, etc. <<<");
        System.out.println(">>> ACCESS URL: /img/ocr/{folderName}/ <<<");
    }
    
    private void assignAssetsToRooms(List<Room> rooms) {
        // Lấy tất cả asset từ database
        List<Asset> allAssets = assetRepository.findAll();
        
        if (allAssets.isEmpty()) {
            System.out.println(">>> WARNING: No assets found to assign to rooms <<<");
            return;
        }
        
        List<RoomAsset> roomAssets = new ArrayList<>();
        
        for (Room room : rooms) {
            for (Asset asset : allAssets) {
                RoomAsset roomAsset = new RoomAsset();
                roomAsset.setRoom(room);
                roomAsset.setAsset(asset);
                roomAsset.setQuantity(1); // Mỗi phòng có 1 asset mỗi loại
                roomAsset.setStatus("Tốt");
                // Ghi chú hợp lý theo loại tài sản
                String note;
                switch (asset.getAssetName()) {
                    case "Bàn rửa bát" -> note = "Bàn rửa bát inox kèm chậu và vòi nước";
                    case "Điều hòa Casper" -> note = "Máy lạnh 1 chiều, công suất phù hợp diện tích phòng";
                    case "Điều khiển điều hòa" -> note = "Kèm pin, hoạt động tốt";
                    case "Giường" -> note = "Giường đơn khung sắt chắc chắn";
                    case "Nhà vệ sinh" -> note = "Khu vệ sinh khép kín, đầy đủ thiết bị cơ bản";
                    case "Tủ đựng quần áo" -> note = "Tủ 2 cánh, có ngăn kệ bên trong";
                    case "Tủ lạnh" -> note = "Tủ lạnh 2 cửa, dung tích 150L";
                    default -> note = "Trang bị tiêu chuẩn của phòng";
                }
                roomAsset.setNote(note);
                roomAssets.add(roomAsset);
            }
        }
        
        // Lưu tất cả room assets
        roomAssetRepository.saveAll(roomAssets);
        
        System.out.println(">>> ASSIGNED " + allAssets.size() + " ASSETS TO " + rooms.size() + " ROOMS <<<");
        System.out.println(">>> TOTAL ROOM-ASSET MAPPINGS: " + roomAssets.size() + " <<<");
        System.out.println(">>> ASSET NAMES: " + allAssets.stream().map(Asset::getAssetName).collect(java.util.stream.Collectors.joining(", ")) + " <<<");
    }
    
    // Backfill: Đảm bảo mọi phòng đều có đầy đủ tài sản nếu trước đó đã tồn tại phòng/tài sản
    private void ensureAllRoomsHaveAssets() {
        List<Room> allRooms = roomRepository.findAll();
        List<Asset> allAssets = assetRepository.findAll();
        if (allRooms.isEmpty() || allAssets.isEmpty()) {
            System.out.println(">>> SKIP BACKFILL ROOM-ASSET: rooms or assets empty <<<");
            return;
        }

        List<RoomAsset> newMappings = new ArrayList<>();
        int existingCount = 0;
        for (Room room : allRooms) {
            for (Asset asset : allAssets) {
                RoomAsset existing = roomAssetRepository.findByRoomAndAsset(room, asset);
                if (existing == null) {
                    RoomAsset mapping = new RoomAsset();
                    mapping.setRoom(room);
                    mapping.setAsset(asset);
                    mapping.setQuantity(1);
                    mapping.setStatus("Tốt");
                    mapping.setNote("Tự động bổ sung khi khởi tạo");
                    newMappings.add(mapping);
                } else {
                    existingCount++;
                }
            }
        }

        if (!newMappings.isEmpty()) {
            roomAssetRepository.saveAll(newMappings);
        }
        System.out.println(">>> BACKFILL ROOM-ASSET DONE. Existing: " + existingCount + ", Created: " + newMappings.size() + " <<<");
    }
    
    private void createElectricServiceReadings(List<Room> rooms) {
        // Lấy dịch vụ điện
        CustomService electricityService = serviceRepository.findByServiceType(ServiceType.ELECTRICITY);
        
        if (electricityService == null) {
            System.out.println(">>> WARNING: Electricity service not found <<<");
            return;
        }
        
        List<ServiceReading> serviceReadings = new ArrayList<>();
        
        for (Room room : rooms) {
            ServiceReading reading = new ServiceReading();
            reading.setRoom(room);
            reading.setService(electricityService);
            reading.setOldReading(new BigDecimal("0.000")); // Bắt đầu từ 0
            reading.setNewReading(new BigDecimal("0.000")); // Chưa có reading mới
            serviceReadings.add(reading);
        }
        
        // Lưu tất cả service readings
        serviceReadingRepository.saveAll(serviceReadings);
        
        System.out.println(">>> CREATED " + serviceReadings.size() + " ELECTRIC SERVICE READINGS <<<");
        System.out.println(">>> SERVICE: " + electricityService.getServiceName() + " (" + electricityService.getUnit() + ") <<<");
        System.out.println(">>> INITIAL READING: 0.000 <<<");
    }
}
