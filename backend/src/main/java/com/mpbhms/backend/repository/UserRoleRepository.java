package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.entity.UserRoleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRoleEntity, Long> {
    Optional<UserRoleEntity> findByUser(UserEntity user);
}

