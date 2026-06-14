package com.uisolution.platform.admin.repository;

import com.uisolution.platform.admin.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, String> {

    List<Project> findByUseYnOrderBySortOrderAsc(String useYn);

    @Query(value = """
        SELECT DISTINCT p.* FROM project p
        JOIN role_project rp ON rp.project_id = p.project_id
        WHERE rp.role_id IN (:roleIds) AND p.use_yn = 'Y'
        ORDER BY p.sort_order
        """, nativeQuery = true)
    List<Project> findProjectsByRoleIds(@Param("roleIds") List<String> roleIds);
}
