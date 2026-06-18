package com.uisolution.platform.admin.repository;

import com.uisolution.platform.admin.entity.SiteRole;
import com.uisolution.platform.admin.entity.SiteRoleId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SiteRoleRepository extends JpaRepository<SiteRole, SiteRoleId> {
    List<SiteRole> findByIdProjectIdOrderBySortOrderAsc(String projectId);
}
