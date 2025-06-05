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
            permissions.add(new PermissionEntity("Create User", "/mpbhms/users", "POST", "User"));
            permissions.add(new PermissionEntity("Update Role", "/mpbhms/roles", "PUT", "User"));
            permissions = permissionRepository.saveAll(permissions);
        }

        // --- Init Roles ---
        if (countRoles == 0) {
                List<PermissionEntity> allPermissions = permissionRepository.findAll(); // lấy từ DB đã managed

            RoleEntity adminRole = new RoleEntity();
            adminRole.setRoleName("ADMIN");
            adminRole.setPermissionEntities(allPermissions); // gán luôn
            roleRepository.save(adminRole);

            RoleEntity renterRole = new RoleEntity();
            renterRole.setRoleName("RENTER");
            RoleEntity landlordRole = new RoleEntity();
            landlordRole.setRoleName("LANDLORD");
            roleRepository.save(renterRole);
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
        }

        if (countPermissions > 0 && countRoles > 0 && countUsers > 0) {
            System.out.println(">>> SKIP INIT DATABASE <<<");
        }
        System.out.println(">>> INIT DONE <<<");
    }
}
