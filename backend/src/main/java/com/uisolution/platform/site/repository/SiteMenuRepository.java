package com.uisolution.platform.site.repository;

import com.uisolution.platform.site.entity.SiteMenu;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SiteMenuRepository extends JpaRepository<SiteMenu, String> {
    List<SiteMenu> findByProjectIdAndUseYnOrderBySortOrderAsc(String projectId, String useYn);
}
