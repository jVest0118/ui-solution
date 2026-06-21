package com.uisolution.platform.git.repository;

import com.uisolution.platform.git.entity.GitConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GitConfigRepository extends JpaRepository<GitConfig, String> {
}
