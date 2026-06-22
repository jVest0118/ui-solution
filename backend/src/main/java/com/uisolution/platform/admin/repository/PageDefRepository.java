package com.uisolution.platform.admin.repository;

import com.uisolution.platform.admin.entity.PageDef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PageDefRepository extends JpaRepository<PageDef, String> {
    List<PageDef> findByUseYnOrderByCreatedAtDesc(String useYn);
    List<PageDef> findByProjectIdAndUseYnOrderByCreatedAtDesc(String projectId, String useYn);
}
