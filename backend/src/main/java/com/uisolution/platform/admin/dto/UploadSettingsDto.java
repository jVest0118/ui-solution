package com.uisolution.platform.admin.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UploadSettingsDto {
    private String basePath;
    private String subDirType;
    private String fixedSubDir;
}
