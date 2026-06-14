package com.uisolution.platform.admin.repository;

import com.uisolution.platform.admin.entity.RoleDef;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<RoleDef, String> {
}
