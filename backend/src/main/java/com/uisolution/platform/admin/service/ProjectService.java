package com.uisolution.platform.admin.service;

import com.uisolution.platform.admin.dto.ProjectDto;
import com.uisolution.platform.admin.entity.Project;
import com.uisolution.platform.admin.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {

    private final ProjectRepository projectRepository;

    public List<ProjectDto.Response> findAll() {
        return projectRepository.findByUseYnOrderBySortOrderAsc("Y")
                .stream().map(ProjectDto.Response::from).collect(Collectors.toList());
    }

    public List<ProjectDto.Response> findByRoleIds(List<String> roleIds) {
        return projectRepository.findProjectsByRoleIds(roleIds)
                .stream().map(ProjectDto.Response::from).collect(Collectors.toList());
    }

    @Transactional
    public ProjectDto.Response save(ProjectDto.SaveRequest req, String currentUserId) {
        Project project = projectRepository.findById(req.getProjectId())
                .map(p -> { p.update(req.getProjectNm(), req.getDescription(), req.getUseYn(), req.getSortOrder()); return p; })
                .orElseGet(() -> projectRepository.save(
                        Project.builder()
                                .projectId(req.getProjectId())
                                .projectNm(req.getProjectNm())
                                .description(req.getDescription())
                                .useYn(req.getUseYn())
                                .sortOrder(req.getSortOrder())
                                .createdBy(currentUserId)
                                .build()
                ));
        return ProjectDto.Response.from(project);
    }
}
