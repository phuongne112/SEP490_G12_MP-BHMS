package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.PermissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PermissionRepository extends JpaRepository<PermissionEntity, Long>, JpaSpecificationExecutor<PermissionEntity> {
    boolean existsByModuleAndApiPathAndMethod(String module, String apiPath, String method);
    List<PermissionEntity> findByIdIn(List<Long> ids);
    boolean existsByName(String name);
}
