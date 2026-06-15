package com.uisolution.platform.admin.controller;

import com.uisolution.platform.admin.dto.UploadSettingsDto;
import com.uisolution.platform.admin.entity.UploadSettings;
import com.uisolution.platform.admin.service.UploadSettingsService;
import com.uisolution.platform.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/upload-settings")
@RequiredArgsConstructor
public class UploadSettingsController {

    private final UploadSettingsService service;

    @GetMapping
    public ApiResponse<UploadSettingsDto> get() {
        UploadSettings s = service.get();
        return ApiResponse.ok(toDto(s));
    }

    @PutMapping
    public ApiResponse<UploadSettingsDto> save(@RequestBody UploadSettingsDto dto) {
        String user = SecurityContextHolder.getContext().getAuthentication().getName();
        UploadSettings s = service.save(dto, user);
        return ApiResponse.ok(toDto(s));
    }

    private UploadSettingsDto toDto(UploadSettings s) {
        UploadSettingsDto dto = new UploadSettingsDto();
        dto.setBasePath(s.getBasePath());
        dto.setSubDirType(s.getSubDirType());
        dto.setFixedSubDir(s.getFixedSubDir());
        return dto;
    }
}
