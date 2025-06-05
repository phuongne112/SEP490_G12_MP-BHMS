package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.NotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<NotificationEntity, Long>, JpaSpecificationExecutor<NotificationEntity> {
    //List<NotificationEntity> findAllByOrderByIdDesc(Long recipientId);

    List<NotificationEntity> findByRecipientIdOrderByCreatedDateDesc(Long recipientId);
}
