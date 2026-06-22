package com.uisolution.platform.api.repository;

import com.uisolution.platform.api.entity.ApiConnection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApiConnectionRepository extends JpaRepository<ApiConnection, Long> {
    List<ApiConnection> findByProjectIdOrderByIdAsc(String projectId);
    List<ApiConnection> findByProjectIdAndUseYnOrderByIdAsc(String projectId, String useYn);
}
