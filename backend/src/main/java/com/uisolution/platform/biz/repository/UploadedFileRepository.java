package com.uisolution.platform.biz.repository;

import com.uisolution.platform.biz.entity.UploadedFile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UploadedFileRepository extends JpaRepository<UploadedFile, Long> {
}
