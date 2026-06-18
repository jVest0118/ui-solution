package com.uisolution.platform.admin.repository;

import com.uisolution.platform.admin.entity.SiteRoleScreen;
import com.uisolution.platform.admin.entity.SiteRoleScreenId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SiteRoleScreenRepository extends JpaRepository<SiteRoleScreen, SiteRoleScreenId> {
    List<SiteRoleScreen> findByIdProjectIdAndIdRoleId(String projectId, String roleId);
    void deleteByIdProjectIdAndIdRoleId(String projectId, String roleId);
}
