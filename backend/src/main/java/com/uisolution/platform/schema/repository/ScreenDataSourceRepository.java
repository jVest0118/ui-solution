package com.uisolution.platform.schema.repository;

import com.uisolution.platform.schema.entity.ScreenDataSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ScreenDataSourceRepository extends JpaRepository<ScreenDataSource, Long> {

    List<ScreenDataSource> findByScreenIdOrderBySortOrderAscSourceNmAsc(String screenId);

    Optional<ScreenDataSource> findByScreenIdAndSourceNm(String screenId, String sourceNm);

    boolean existsByScreenIdAndSourceNmAndIdNot(String screenId, String sourceNm, Long id);
}
