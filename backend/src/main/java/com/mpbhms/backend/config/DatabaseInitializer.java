package com.mpbhms.backend.config;

import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.entity.Permission;
import com.mpbhms.backend.entity.Role;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.enums.ServiceType;
import com.mpbhms.backend.repository.PermissionRepository;
import com.mpbhms.backend.repository.RoleRepository;
import com.mpbhms.backend.repository.ServiceRepository;
import com.mpbhms.backend.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class DatabaseInitializer implements CommandLineRunner {

    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ServiceRepository serviceRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        System.out.println(">>> START INIT DATABASE <<<");

        long countPermissions = permissionRepository.count();
        long countRoles = roleRepository.count();
        long countUsers = userRepository.count();
        long countServices = serviceRepository.count();

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
            //User
            permissions.add(new Permission("Create User", "/mpbhms/users", "POST", "User"));
            permissions.add(new Permission("Update User", "/mpbhms/users", "PUT", "User"));
            permissions.add(new Permission("Get User", "/mpbhms/users", "GET", "User"));
            permissions.add(new Permission("Active/ De-Active User", "/mpbhms/users/{id}/active", "PUT", "User"));
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
            permissions.add(new Permission("Approve Amendment", "/mpbhms/room-users/approve-amendment/{amendmentId}", "POST", "RoomUser"));
            permissions.add(new Permission("Reject Amendment", "/mpbhms/room-users/reject-amendment/{amendmentId}", "POST", "RoomUser"));
            permissions.add(new Permission("Get Contract Amendments", "/mpbhms/room-users/contract-amendments/{contractId}", "GET", "RoomUser"));
            //Contract
            permissions.add(new Permission("Export contract", "/mpbhms/contracts/{id}/export", "GET", "Contract"));
            permissions.add(new Permission("View List Contract", "/mpbhms/contracts", "GET", "Contract"));
            permissions.add(new Permission("Create Contract", "/mpbhms/contracts", "POST", "Contract"));
            permissions.add(new Permission("Update Contract", "/mpbhms/contracts", "PUT", "Contract"));
            permissions.add(new Permission("Delete Contract", "/mpbhms/contracts/{id}", "DELETE", "Contract"));
            permissions.add(new Permission("Test Update User Info", "/mpbhms/contracts/test-update-user-info", "GET", "Contract"));
            permissions.add(new Permission("Process Expired Contracts Service", "/mpbhms/contracts/process-expired", "POST", "Contract"));
            permissions.add(new Permission("Renew Contract Service", "/mpbhms/contracts/renew/{contractId}", "POST", "Contract"));
            permissions.add(new Permission("Get Expiring Contracts Service", "/mpbhms/contracts/expiring", "GET", "Contract"));
            permissions.add(new Permission("Get My Contracts", "/mpbhms/contracts/my-contracts", "GET", "Contract"));
            permissions.add(new Permission("Update Contract Terms", "/mpbhms/contracts/update", "POST", "Contract"));
            permissions.add(new Permission("Approve Contract Amendment", "/mpbhms/contracts/approve-amendment/{amendmentId}", "POST", "Contract"));
            permissions.add(new Permission("Reject Contract Amendment", "/mpbhms/contracts/reject-amendment/{amendmentId}", "POST", "Contract"));
            permissions.add(new Permission("Get Contract Amendments History", "/mpbhms/contracts/amendments/{contractId}", "GET", "Contract"));
            //OCR
            permissions.add(new Permission("OCR", "/mpbhms/ocr/detect-ocr", "POST", "Ocr"));
            permissions.add(new Permission("Save Reading", "/mpbhms/ocr/save-reading", "POST", "Ocr"));
            //Bill
            permissions.add(new Permission("Generate first", "/mpbhms/bills/generate-first", "POST", "Bill"));
            permissions.add(new Permission("Generate", "/mpbhms/bills/generate", "POST", "Bill"));
            permissions.add(new Permission("Create Bill", "/mpbhms/bills/create", "POST", "Bill"));
            permissions.add(new Permission("Get Bill", "/mpbhms/bills/{id}", "GET", "Bill"));
            permissions.add(new Permission("Get Bills", "/mpbhms/bills", "GET", "Bill"));
            permissions.add(new Permission("Delete Bill", "/mpbhms/bills/{id}", "DELETE", "Bill"));
            permissions.add(new Permission("Generate", "/mpbhms/bills/service-bill", "POST", "Bill"));
            permissions.add(new Permission("Export Bill", "/mpbhms/bills/{id}/export", "GET", "Bill"));
            //Renter
            permissions.add(new Permission("Get Renter List", "/mpbhms/renters", "GET", "Renter"));
            permissions.add(new Permission("Create new Renter", "/mpbhms/renters", "POST", "Renter"));
            permissions.add(new Permission("Change renter status", "/mpbhms/renters/{id}/status", "PUT", "Renter"));
            permissions.add(new Permission("Get Renters for Assign", "/mpbhms/renters/for-assign", "GET", "Renter"));
            permissions.add(new Permission("Get Renters for Assign Full", "/mpbhms/renters/for-assign-full", "GET", "Renter"));
            //Service
            permissions.add(new Permission("Create Service", "/mpbhms/services", "POST", "Service"));
            permissions.add(new Permission("Update Service", "/mpbhms/services/{id}", "PUT", "Service"));
            permissions.add(new Permission("Delete Service", "/mpbhms/services/{id}", "DELETE", "Service"));
            permissions.add(new Permission("View Services", "/mpbhms/services", "GET", "Service"));
            permissions.add(new Permission("View All Services", "/mpbhms/services/all", "GET", "Service"));
            permissions.add(new Permission("Get Service by ID", "/mpbhms/services/{id}", "GET", "Service"));
            permissions.add(new Permission("Get reading service", "/mpbhms/services/readings", "GET", "Service"));
            //Schedule
            permissions.add(new Permission("Create Schedule", "/api/schedules", "POST", "Schedule"));
            permissions.add(new Permission("Get All Schedules", "/api/schedules", "GET", "Schedule"));
            permissions.add(new Permission("Get Schedule", "/api/schedules/{id}", "GET", "Schedule"));
            permissions.add(new Permission("Update Schedule Status", "/api/schedules/{id}/status", "PATCH", "Schedule"));
            permissions.add(new Permission("Delete Schedule", "/api/schedules/{id}", "DELETE", "Schedule"));
            //Asset
            permissions.add(new Permission("Create Asset", "/mpbhms/assets", "POST", "Asset"));
            permissions.add(new Permission("Update Asset", "/mpbhms/assets/{id}", "PUT", "Asset"));
            permissions.add(new Permission("Delete Asset", "/mpbhms/assets/{id}", "DELETE", "Asset"));
            permissions.add(new Permission("View Assets", "/mpbhms/assets", "GET", "Asset"));
            permissions.add(new Permission("Get Asset by ID", "/mpbhms/assets/{id}", "GET", "Asset"));
            // Asset check-in/check-out (nếu có API riêng)
            permissions.add(new Permission("Check-in Asset", "/mpbhms/assets/checkin", "POST", "Asset"));
            permissions.add(new Permission("Check-out Asset", "/mpbhms/assets/checkout", "POST", "Asset"));
            //Electric Reading
            permissions.add(new Permission("Create Electric Reading", "/mpbhms/electric-readings", "POST", "ElectricReading"));
            permissions.add(new Permission("Update Electric Reading", "/mpbhms/electric-readings/{id}", "PUT", "ElectricReading"));
            permissions.add(new Permission("Delete Electric Reading", "/mpbhms/electric-readings/{id}", "DELETE", "ElectricReading"));
            permissions.add(new Permission("View Electric Readings", "/mpbhms/electric-readings", "GET", "ElectricReading"));
            permissions.add(new Permission("Get Electric Reading by ID", "/mpbhms/electric-readings/{id}", "GET", "ElectricReading"));

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
            Role adminRole = new Role();
            adminRole.setRoleName("ADMIN");
            List<Permission> adminPermissions = new ArrayList<>(permissionRepository.findAll()
                    .stream()
                    .filter(p ->
                            List.of("User", "Role", "Permission", "Notification", "Service", "Renter", "Schedule").contains(p.getModule()) ||
                                    (p.getModule().equals("Room") && p.getMethod().equals("GET"))
                    )// hoặc theo API cụ thể
                    .toList());

            if (viewMyNotification != null && !adminPermissions.contains(viewMyNotification)) {
                adminPermissions.add(viewMyNotification);
            }
            if (markReadNotification != null && !adminPermissions.contains(markReadNotification)) {
                adminPermissions.add(markReadNotification);
            }
            adminRole.setPermissionEntities(adminPermissions);
            roleRepository.save(adminRole);

            Role renterRole = new Role();
            renterRole.setRoleName("RENTER");
            List<Permission> renterPermission = new ArrayList<>();
            // Quyền cho RENTER:
            // Contract
            Permission viewContractList = permissionRepository.findByModuleAndApiPathAndMethod("Contract", "/mpbhms/contracts", "GET");
            if (viewContractList != null) renterPermission.add(viewContractList);
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
            // Room
            Permission viewRoom = permissionRepository.findByModuleAndApiPathAndMethod("Room", "/mpbhms/rooms", "GET");
            if (viewRoom != null) renterPermission.add(viewRoom);
            // Schedule/Booking
            Permission getAllSchedules = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/api/schedules", "GET");
            if (getAllSchedules != null) renterPermission.add(getAllSchedules);
            Permission getScheduleById = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/api/schedules/{id}", "GET");
            if (getScheduleById != null) renterPermission.add(getScheduleById);
            Permission createSchedule = permissionRepository.findByModuleAndApiPathAndMethod("Schedule", "/api/schedules", "POST");
            if (createSchedule != null) renterPermission.add(createSchedule);
            // Notification
            if (viewMyNotification != null && !renterPermission.contains(viewMyNotification)) {
                renterPermission.add(viewMyNotification);
            }
            if (markReadNotification != null && !renterPermission.contains(markReadNotification)) {
                renterPermission.add(markReadNotification);
            }
            renterRole.setPermissionEntities(renterPermission);
            roleRepository.save(renterRole);

            Role landlordRole = new Role();
            landlordRole.setRoleName("LANDLORD");
            List<Permission> landlordPermission = new ArrayList<>(permissionRepository.findAll()
                    .stream()
                    .filter(p -> List.of("Room","Renter","RoomUser","Bill","Ocr","Contract","Service","Schedule","User","Asset","ElectricReading").contains(p.getModule())) // hoặc theo API cụ thể
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
            landlordRole.setPermissionEntities(landlordPermission);
            roleRepository.save(landlordRole);

            Role subAdminRole = new Role();
            subAdminRole.setRoleName("SUBADMIN");
            List<Permission> subAdminPermission = new ArrayList<>(permissionRepository.findAll()
                    .stream()
                    .filter(p -> List.of().contains(p.getModule())) // hoặc theo API cụ thể
                    .toList());
            if (viewMyNotification != null && !subAdminPermission.contains(viewMyNotification)) {
                subAdminPermission.add(viewMyNotification);
            }
            if (markReadNotification != null && !subAdminPermission.contains(markReadNotification)) {
                subAdminPermission.add(markReadNotification);
            }
            subAdminRole.setPermissionEntities(subAdminPermission);
            roleRepository.save(subAdminRole);
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
        }

        if (countPermissions > 0 && countRoles > 0 && countUsers > 0 && countServices > 0) {
            System.out.println(">>> SKIP INIT DATABASE <<<");
        }
        System.out.println(">>> INIT DONE <<<");
    }

}
