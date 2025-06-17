package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long>, JpaSpecificationExecutor<Notification> {
    //List<NotificationEntity> findAllByOrderByIdDesc(Long recipientId);

    List<Notification> findByRecipientIdOrderByCreatedDateDesc(Long recipientId);
}