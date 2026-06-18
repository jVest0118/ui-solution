package com.uisolution.platform.admin.repository;

import com.uisolution.platform.admin.entity.SiteUserRole;
import com.uisolution.platform.admin.entity.SiteUserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SiteUserRoleRepository extends JpaRepository<SiteUserRole, SiteUserRoleId> {

    List<SiteUserRole> findByIdProjectIdAndIdRoleId(String projectId, String roleId);

    @Query("SELECT sur FROM SiteUserRole sur WHERE sur.id.projectId = :projectId AND sur.id.userId = :userId")
    List<SiteUserRole> findByProjectIdAndUserId(@Param("projectId") String projectId,
                                                @Param("userId") String userId);

    void deleteByIdProjectIdAndIdRoleId(String projectId, String roleId);
}
