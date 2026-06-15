package com.uisolution.platform.biz.controller;

import com.uisolution.platform.biz.entity.UploadedFile;
import com.uisolution.platform.biz.repository.UploadedFileRepository;
import com.uisolution.platform.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
public class FileController {

    private static final Path UPLOAD_DIR = Paths.get("uploads").toAbsolutePath();
    private final UploadedFileRepository uploadedFileRepository;

    private String currentUser() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @PostMapping("/upload")
    public ApiResponse<Map<String, Object>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String screenId,
            @RequestParam(required = false) String fieldNm) throws IOException {

        Files.createDirectories(UPLOAD_DIR);
        String ext = "";
        String originalName = file.getOriginalFilename();
        if (originalName != null && originalName.contains("."))
            ext = originalName.substring(originalName.lastIndexOf('.'));

        String storedName = UUID.randomUUID() + ext;
        Path target = UPLOAD_DIR.resolve(storedName);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        UploadedFile saved = uploadedFileRepository.save(UploadedFile.builder()
                .originalNm(originalName)
                .storedPath(storedName)
                .fileSize(file.getSize())
                .contentType(file.getContentType())
                .screenId(screenId)
                .fieldNm(fieldNm)
                .createdBy(currentUser())
                .build());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("fileId", saved.getFileId());
        result.put("originalNm", saved.getOriginalNm());
        result.put("fileSize", saved.getFileSize());
        result.put("contentType", saved.getContentType());
        return ApiResponse.ok(result);
    }

    @GetMapping("/{fileId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long fileId) throws MalformedURLException {
        UploadedFile meta = uploadedFileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("파일을 찾을 수 없습니다."));

        Path filePath = UPLOAD_DIR.resolve(meta.getStoredPath());
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists())
            return ResponseEntity.notFound().build();

        String contentType = meta.getContentType() != null ? meta.getContentType() : "application/octet-stream";
        String encodedName;
        try {
            encodedName = java.net.URLEncoder.encode(meta.getOriginalNm(), "UTF-8").replace("+", "%20");
        } catch (Exception e) {
            encodedName = meta.getOriginalNm();
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encodedName)
                .body(resource);
    }

    @GetMapping("/{fileId}/info")
    public ApiResponse<Map<String, Object>> info(@PathVariable Long fileId) {
        UploadedFile meta = uploadedFileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("파일을 찾을 수 없습니다."));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("fileId", meta.getFileId());
        result.put("originalNm", meta.getOriginalNm());
        result.put("fileSize", meta.getFileSize());
        result.put("contentType", meta.getContentType());
        result.put("createdAt", meta.getCreatedAt());
        result.put("createdBy", meta.getCreatedBy());
        return ApiResponse.ok(result);
    }
}
