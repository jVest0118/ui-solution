package com.uisolution.platform.biz.repository;

import com.uisolution.platform.biz.entity.BizData;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BizDataRepository extends JpaRepository<BizData, Long> {

    @Query("SELECT b FROM BizData b WHERE b.screenId = :screenId AND b.statusCd = 'ACTIVE'")
    Page<BizData> findActiveByScreenId(@Param("screenId") String screenId, Pageable pageable);

    @Query("SELECT b FROM BizData b WHERE b.dataId = :dataId AND b.screenId = :screenId AND b.statusCd = 'ACTIVE'")
    Optional<BizData> findActiveById(@Param("dataId") Long dataId, @Param("screenId") String screenId);

    @Query("SELECT COUNT(b) FROM BizData b WHERE b.screenId = :screenId AND b.statusCd = 'ACTIVE'")
    long countActiveByScreenId(@Param("screenId") String screenId);
}
