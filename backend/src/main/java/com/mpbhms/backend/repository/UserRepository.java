package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    User findByEmail(String email);

    User findByRefreshTokenAndEmail(String refreshToken, String email);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    User findByUsername(String username);

    @Query("SELECT u FROM User u WHERE u.role.roleName = 'RENTER' " +
           "AND NOT EXISTS (SELECT 1 FROM RoomUser ru WHERE ru.user = u AND ru.isActive = true) " +
           "AND (LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(u.userInfo.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) )")
    List<User> findRentersWithoutActiveRoomAndSearch(@Param("keyword") String keyword);
}

