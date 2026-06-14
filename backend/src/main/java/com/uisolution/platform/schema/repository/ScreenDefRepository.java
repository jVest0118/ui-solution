package com.uisolution.platform.schema.repository;

import com.uisolution.platform.schema.entity.ScreenDef;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ScreenDefRepository extends JpaRepository<ScreenDef, String> {

    @Query("""
        SELECT s FROM ScreenDef s
        LEFT JOIN FETCH s.fields
        WHERE s.screenId = :screenId AND s.useYn = 'Y'
        """)
    Optional<ScreenDef> findWithFieldsAndRules(@Param("screenId") String screenId);
}
