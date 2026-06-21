package com.uisolution.platform.schema.repository;

import com.uisolution.platform.schema.entity.FieldDef;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FieldDefRepository extends JpaRepository<FieldDef, Long> {

    /** 필드의 검증 규칙을 먼저 삭제 (FK 제약 해제용) */
    @Modifying
    @Query("DELETE FROM ValidationRule r WHERE r.fieldDef.fieldId = :fieldId")
    void deleteValidationRulesByFieldId(@Param("fieldId") Long fieldId);

    /** 필드 직접 삭제 (screenId 검증 포함) */
    @Modifying
    @Query("DELETE FROM FieldDef f WHERE f.fieldId = :fieldId AND f.screenDef.screenId = :screenId")
    int deleteByFieldIdAndScreenId(@Param("fieldId") Long fieldId, @Param("screenId") String screenId);

    @Query("""
        SELECT f.fieldNm, COUNT(f) as cnt
        FROM FieldDef f
        WHERE LOWER(f.fieldNm) LIKE LOWER(CONCAT(:prefix, '%'))
        GROUP BY f.fieldNm
        ORDER BY cnt DESC
        """)
    List<Object[]> findTopFieldNames(@Param("prefix") String prefix, Pageable pageable);

    @Query("""
        SELECT f.fieldLabel, COUNT(f) as cnt
        FROM FieldDef f
        WHERE f.fieldLabel LIKE CONCAT(:prefix, '%')
        GROUP BY f.fieldLabel
        ORDER BY cnt DESC
        """)
    List<Object[]> findTopFieldLabels(@Param("prefix") String prefix, Pageable pageable);

    @Query("""
        SELECT f.fieldNm, COUNT(f) as cnt
        FROM FieldDef f
        GROUP BY f.fieldNm
        ORDER BY cnt DESC
        """)
    List<Object[]> findTopFieldNamesAll(Pageable pageable);

    @Query("""
        SELECT f.fieldLabel, COUNT(f) as cnt
        FROM FieldDef f
        GROUP BY f.fieldLabel
        ORDER BY cnt DESC
        """)
    List<Object[]> findTopFieldLabelsAll(Pageable pageable);
}
