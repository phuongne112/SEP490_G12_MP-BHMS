package com.mpbhms.backend.repository;

import com.mpbhms.backend.dto.UserDTO;
import com.mpbhms.backend.dto.UserWithRoleDTO;
import com.mpbhms.backend.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long>, JpaSpecificationExecutor<UserEntity> {

    @Query("""
        SELECT new com.mpbhms.backend.dto.UserWithRoleDTO(
            u.id, u.username, u.email, u.isActive, 
            u.createdBy, u.createdDate, u.updatedBy, u.updatedDate, 
            r.roleName
        )
        FROM UserEntity u
        JOIN UserRoleEntity ur ON u.id = ur.user.id
        JOIN RoleEntity r ON ur.role.roleId = r.roleId
    """)
    List<UserWithRoleDTO> findAllUsersWithRoles();

    UserEntity findByEmail(String email);

    UserEntity findByRefreshTokenAndEmail(String refreshToken, String email);


}

