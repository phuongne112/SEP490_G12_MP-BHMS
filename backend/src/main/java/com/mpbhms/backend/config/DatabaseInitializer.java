package com.mpbhms.backend.config;

import com.mpbhms.backend.entity.Permission;
import com.mpbhms.backend.entity.Role;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.repository.PermissionRepository;
import com.mpbhms.backend.repository.RoleRepository;
import com.mpbhms.backend.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class DatabaseInitializer implements CommandLineRunner {

    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        System.out.println(">>> START INIT DATABASE <<<");

        long countPermissions = permissionRepository.count();
        long countRoles = roleRepository.count();
        long countUsers = userRepository.count();

        // --- Init Permissions ---
        if (countPermissions == 0) {
            List<Permission> permissions = new ArrayList<>();
            //Rooms
            permissions.add(new Permission("Update Room", "/mpbhms/rooms/{id}", "PUT", "Room"));
            permissions.add(new Permission("Delete Room", "/mpbhms/rooms/{id}", "DELETE", "Room"));
            permissions.add(new Permission("Create Room", "/mpbhms/rooms", "POST", "Room"));
            permissions.add(new Permission("View Room", "/mpbhms/rooms", "GET", "Room"));
            //User
            permissions.add(new Permission("Create User", "/mpbhms/users", "POST", "User"));
            permissions.add(new Permission("Update User", "/mpbhms/users", "PUT", "User"));
            permissions.add(new Permission("Get User", "/mpbhms/users", "GET", "User"));
            permissions.add(new Permission("Active/ De-Active User", "/mpbhms/users/{id}/status", "PUT", "User"));
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
            //Permissions
            permissions.add(new Permission("Create Permission", "/mpbhms/permissions", "POST", "Permission"));
            permissions.add(new Permission("Update Permission", "/mpbhms/permissions", "PUT", "Permission"));
            permissions.add(new Permission("Delete Permission", "/mpbhms/permissions/{id}", "DELETE", "Permission"));
            permissions.add(new Permission("View Permissions", "/mpbhms/permissions", "GET", "Permission"));
            //Room User
            permissions.add(new Permission("Assign user to Room", "/mpbhms/room-users/add-many", "POST", "RoomUser"));
            //
            permissions.add(new Permission("Export contract", "/mpbhms/contracts/{id}/export", "GET", "Contract"));
            permissions = permissionRepository.saveAll(permissions);
        }

        // --- Init Roles ---
        if (countRoles == 0) {
            Role adminRole = new Role();
            adminRole.setRoleName("ADMIN");
            List<Permission> adminPermissions = permissionRepository.findAll()
                    .stream()
                    .filter(p ->
                            List.of("User", "Role", "Permission", "Notification").contains(p.getModule()) ||
                                    (p.getModule().equals("Room") && p.getMethod().equals("GET"))
                    )// hoặc theo API cụ thể
                    .toList();

            adminRole.setPermissionEntities(adminPermissions);
            roleRepository.save(adminRole);

            Role renterRole = new Role();
            renterRole.setRoleName("RENTER");
            List<Permission> renterPermission = permissionRepository.findAll()
                    .stream()
                    .filter(p -> List.of().contains(p.getModule())) // hoặc theo API cụ thể
                    .toList();
            renterRole.setPermissionEntities(renterPermission);
            roleRepository.save(renterRole);

            Role landlordRole = new Role();
            landlordRole.setRoleName("LANDLORD");
            List<Permission> landlordPermission = permissionRepository.findAll()
                    .stream()
                    .filter(p -> List.of("Room","RoomUser").contains(p.getModule())) // hoặc theo API cụ thể
                    .toList();
            landlordRole.setPermissionEntities(landlordPermission);
            roleRepository.save(landlordRole);
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
        }

        if (countPermissions > 0 && countRoles > 0 && countUsers > 0) {
            System.out.println(">>> SKIP INIT DATABASE <<<");
        }
        System.out.println(">>> INIT DONE <<<");
    }

}
