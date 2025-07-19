package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.UserInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserInfoRepository extends JpaRepository<UserInfo, Long> {
    Optional<UserInfo> findByUserId(Long userId);
    boolean existsByPhoneNumber(String phoneNumber);
    boolean existsByNationalID(String nationalID);
    boolean existsByPhoneNumberAndUserIdNot(String phoneNumber, Long userId);
    boolean existsByNationalIDAndUserIdNot(String nationalID, Long userId);
    boolean existsByPhoneNumber2(String phoneNumber2);
    boolean existsByPhoneNumber2AndUserIdNot(String phoneNumber2, Long userId);
}