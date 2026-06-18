package com.uisolution.platform.schema.repository;

import com.uisolution.platform.schema.entity.ScreenDef;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ScreenDefRepository extends JpaRepository<ScreenDef, String> {

    @Query("""
        SELECT s FROM ScreenDef s
        LEFT JOIN FETCH s.fields
        WHERE s.screenId = :screenId AND s.useYn = 'Y'
        """)
    Optional<ScreenDef> findWithFieldsAndRules(@Param("screenId") String screenId);

    List<ScreenDef> findByProjectIdOrderByScreenNmAsc(String projectId);

    @Modifying
    @Query(value = "DELETE FROM role_screen WHERE screen_id = :screenId", nativeQuery = true)
    void deleteRoleScreenByScreenId(@Param("screenId") String screenId);

    @Modifying
    @Query(value = "DELETE FROM biz_data WHERE screen_id = :screenId", nativeQuery = true)
    void deleteBizDataByScreenId(@Param("screenId") String screenId);
}
