package com.uisolution.platform.admin.controller;

import com.uisolution.platform.admin.dto.ProjectDto;
import com.uisolution.platform.admin.service.ProjectService;
import com.uisolution.platform.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    public ApiResponse<List<ProjectDto.Response>> list() {
        return ApiResponse.ok(projectService.findAll());
    }

    @PostMapping
    public ApiResponse<ProjectDto.Response> save(@RequestBody ProjectDto.SaveRequest req) {
        String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.ok(projectService.save(req, currentUser));
    }
}
