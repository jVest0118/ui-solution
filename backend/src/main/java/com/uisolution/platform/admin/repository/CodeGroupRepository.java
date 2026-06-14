package com.uisolution.platform.admin.repository;

import com.uisolution.platform.admin.entity.CodeGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CodeGroupRepository extends JpaRepository<CodeGroup, String> {
    List<CodeGroup> findByProjectIdIsNullOrProjectIdOrderByGroupCdAsc(String projectId);
    List<CodeGroup> findByProjectIdIsNullAndUseYnOrderByGroupCdAsc(String useYn);
}
