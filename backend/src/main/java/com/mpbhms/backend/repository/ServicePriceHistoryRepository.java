package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.ServicePriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ServicePriceHistoryRepository extends JpaRepository<ServicePriceHistory, Long> {

    @Query("SELECT sph FROM ServicePriceHistory sph WHERE sph.service.id = :serviceId AND sph.effectiveDate <= :date AND (sph.endDate IS NULL OR sph.endDate >= :date) AND sph.isActive = true ORDER BY sph.effectiveDate DESC")
    Optional<ServicePriceHistory> findActivePriceByServiceAndDate(@Param("serviceId") Long serviceId, @Param("date") LocalDate date);

    @Query("SELECT sph FROM ServicePriceHistory sph WHERE sph.service.id = :serviceId ORDER BY sph.effectiveDate DESC")
    List<ServicePriceHistory> findByServiceIdOrderByEffectiveDateDesc(@Param("serviceId") Long serviceId);

    @Query("SELECT sph FROM ServicePriceHistory sph WHERE sph.service.id = :serviceId AND sph.effectiveDate <= :date AND sph.isActive = true ORDER BY sph.effectiveDate DESC LIMIT 1")
    Optional<ServicePriceHistory> findLatestPriceByServiceAndDate(@Param("serviceId") Long serviceId, @Param("date") LocalDate date);

    // Thêm method cho job kích hoạt giá
    @Query("SELECT sph FROM ServicePriceHistory sph WHERE sph.effectiveDate = :effectiveDate AND sph.isActive = false")
    List<ServicePriceHistory> findByEffectiveDateAndIsActiveFalse(@Param("effectiveDate") LocalDate effectiveDate);

    @Query("SELECT sph FROM ServicePriceHistory sph WHERE sph.service.id = :serviceId AND sph.isActive = true")
    List<ServicePriceHistory> findByServiceIdAndIsActiveTrue(@Param("serviceId") Long serviceId);
} 