package com.uisolution.platform.datasource.repository;

import com.uisolution.platform.datasource.entity.DbConnection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DbConnectionRepository extends JpaRepository<DbConnection, String> {

    List<DbConnection> findAllByOrderByIsDefaultDescConnNameAsc();

    boolean existsByIsDefaultAndConnIdNot(String isDefault, String connId);
}
