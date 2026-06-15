package com.uisolution.platform.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "upload_settings")
@Getter
@Setter
@NoArgsConstructor
public class UploadSettings {

    @Id
    private Long id = 1L;

    @Column(name = "base_path", nullable = false, length = 500)
    private String basePath = "uploads";

    /** DATE | SCREEN_ID | FIXED */
    @Column(name = "sub_dir_type", nullable = false, length = 20)
    private String subDirType = "DATE";

    @Column(name = "fixed_sub_dir", length = 200)
    private String fixedSubDir;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", length = 50)
    private String updatedBy;
}
