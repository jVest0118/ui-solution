package com.uisolution.platform.admin.service;

import com.uisolution.platform.admin.dto.UploadSettingsDto;
import com.uisolution.platform.admin.entity.UploadSettings;
import com.uisolution.platform.admin.repository.UploadSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class UploadSettingsService {

    private final UploadSettingsRepository repository;

    @Transactional(readOnly = true)
    public UploadSettings get() {
        return repository.findById(1L).orElseGet(() -> {
            UploadSettings s = new UploadSettings();
            return repository.save(s);
        });
    }

    @Transactional
    public UploadSettings save(UploadSettingsDto dto, String updatedBy) {
        UploadSettings s = get();
        s.setBasePath(dto.getBasePath());
        s.setSubDirType(dto.getSubDirType());
        s.setFixedSubDir(dto.getFixedSubDir());
        s.setUpdatedBy(updatedBy);
        return repository.save(s);
    }

    /** 업로드 파일이 실제로 저장될 디렉토리 경로 반환 */
    public Path resolveUploadDir(String screenId) {
        UploadSettings s = get();
        Path base = Paths.get(s.getBasePath()).toAbsolutePath();
        return switch (s.getSubDirType()) {
            case "DATE" -> {
                String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
                yield base.resolve(datePath);
            }
            case "SCREEN_ID" -> (screenId != null && !screenId.isBlank())
                    ? base.resolve(screenId)
                    : base;
            case "FIXED" -> (s.getFixedSubDir() != null && !s.getFixedSubDir().isBlank())
                    ? base.resolve(s.getFixedSubDir())
                    : base;
            default -> base;
        };
    }

    /** basePath의 절대경로 반환 (다운로드 시 storedPath 해석에 사용) */
    public Path getBasePath() {
        return Paths.get(get().getBasePath()).toAbsolutePath();
    }
}
