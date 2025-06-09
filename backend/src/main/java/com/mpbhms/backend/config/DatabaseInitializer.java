package com.mpbhms.backend.config;

import com.mpbhms.backend.entity.PermissionEntity;
import com.mpbhms.backend.entity.RoleEntity;
import com.mpbhms.backend.entity.UserEntity;
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
            List<PermissionEntity> permissions = new ArrayList<>();
            //Rooms
            permissions.add(new PermissionEntity("Update Room", "/mpbhms/rooms/{id}", "PUT", "Room"));
            permissions.add(new PermissionEntity("Delete Room", "/mpbhms/rooms/{id}", "DELETE", "Room"));
            permissions.add(new PermissionEntity("Create Room", "/mpbhms/rooms", "POST", "Room"));
            //User
            permissions.add(new PermissionEntity("Create User", "/mpbhms/users", "POST", "User"));
            permissions.add(new PermissionEntity("Active/ De-Active User", "/mpbhms/users/{id}/status", "PUT", "User"));
            //Roles
            permissions.add(new PermissionEntity("Create Role", "/mpbhms/roles", "POST", "Role"));
            permissions.add(new PermissionEntity("Update Role", "/mpbhms/roles", "PUT", "Role"));
            permissions.add(new PermissionEntity("Delete Role", "/mpbhms/roles/{id}", "DELETE", "Role"));
            permissions.add(new PermissionEntity("View Roles", "/mpbhms/roles", "GET", "Role"));
            //Permissions
            permissions.add(new PermissionEntity("Create Permission", "/mpbhms/permissions", "POST", "Permission"));
            permissions.add(new PermissionEntity("Update Permission", "/mpbhms/permissions", "PUT", "Permission"));
            permissions.add(new PermissionEntity("Delete Permission", "/mpbhms/permissions/{id}", "DELETE", "Permission"));
            permissions.add(new PermissionEntity("View Permissions", "/mpbhms/permissions", "GET", "Permission"));
            permissions = permissionRepository.saveAll(permissions);
        }

        // --- Init Roles ---
        if (countRoles == 0) {
            RoleEntity adminRole = new RoleEntity();
            adminRole.setRoleName("ADMIN");
            List<PermissionEntity> adminPermissions = permissionRepository.findAll()
                    .stream()
                    .filter(p -> List.of("User", "Role", "Permission").contains(p.getModule())) // hoặc theo API cụ thể
                    .toList();

            adminRole.setPermissionEntities(adminPermissions);
            roleRepository.save(adminRole);

            RoleEntity renterRole = new RoleEntity();
            renterRole.setRoleName("RENTER");
            List<PermissionEntity> renterPermission = permissionRepository.findAll()
                    .stream()
                    .filter(p -> List.of().contains(p.getModule())) // hoặc theo API cụ thể
                    .toList();
            renterRole.setPermissionEntities(renterPermission);
            roleRepository.save(renterRole);

            RoleEntity landlordRole = new RoleEntity();
            landlordRole.setRoleName("LANDLORD");
            List<PermissionEntity> landlordPermission = permissionRepository.findAll()
                    .stream()
                    .filter(p -> List.of("Room").contains(p.getModule())) // hoặc theo API cụ thể
                    .toList();
            landlordRole.setPermissionEntities(landlordPermission);
            roleRepository.save(landlordRole);
        }

        // --- Init Users ---
        if (countUsers == 0) {
            UserEntity admin = new UserEntity();
            admin.setEmail("admin@gmail.com");
            admin.setUsername("Administrator");
            admin.setPassword(passwordEncoder.encode("123123123aA@"));

            RoleEntity adminRole = roleRepository.findByRoleName("ADMIN");
            if (adminRole != null) {
                admin.setRole(adminRole);
            }
            userRepository.save(admin);


            UserEntity landlord  = new UserEntity();
            landlord.setEmail("landlord@gmail.com");
            landlord.setUsername("Landlord");
            landlord.setPassword(passwordEncoder.encode("123123123aA@"));

            RoleEntity landlordRole = roleRepository.findByRoleName("LANDLORD");
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
