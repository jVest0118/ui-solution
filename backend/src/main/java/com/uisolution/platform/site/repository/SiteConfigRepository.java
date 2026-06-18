package com.uisolution.platform.site.repository;

import com.uisolution.platform.site.entity.SiteConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteConfigRepository extends JpaRepository<SiteConfig, String> {
}
