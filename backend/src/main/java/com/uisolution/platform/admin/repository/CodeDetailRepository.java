package com.uisolution.platform.admin.repository;

import com.uisolution.platform.admin.entity.CodeDetail;
import com.uisolution.platform.admin.entity.CodeDetailId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CodeDetailRepository extends JpaRepository<CodeDetail, CodeDetailId> {
    List<CodeDetail> findByGroupCdAndUseYnOrderBySortOrderAsc(String groupCd, String useYn);
    List<CodeDetail> findByGroupCdOrderBySortOrderAsc(String groupCd);
}
