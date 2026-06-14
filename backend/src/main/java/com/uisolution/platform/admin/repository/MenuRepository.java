package com.uisolution.platform.admin.repository;

import com.uisolution.platform.admin.entity.MenuDef;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MenuRepository extends JpaRepository<MenuDef, String> {

    @Query(value = """
        SELECT DISTINCT m.* FROM menu_def m
        JOIN role_menu rm ON rm.menu_id = m.menu_id
        WHERE rm.role_id IN (:roleIds) AND m.use_yn = 'Y'
        ORDER BY m.sort_order
        """, nativeQuery = true)
    List<MenuDef> findMenusByRoleIds(@Param("roleIds") List<String> roleIds);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "UPDATE menu_def SET parent_id=:parentId, menu_nm=:menuNm, menu_url=:menuUrl, menu_icon=:menuIcon, sort_order=:sortOrder, use_yn=:useYn, project_id=:projectId WHERE menu_id=:menuId", nativeQuery = true)
    void updateMenu(@Param("menuId") String menuId, @Param("parentId") String parentId,
                    @Param("menuNm") String menuNm, @Param("menuUrl") String menuUrl,
                    @Param("menuIcon") String menuIcon, @Param("sortOrder") int sortOrder,
                    @Param("useYn") String useYn, @Param("projectId") String projectId);
}
