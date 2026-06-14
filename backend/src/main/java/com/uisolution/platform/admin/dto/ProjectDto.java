package com.uisolution.platform.admin.dto;

import com.uisolution.platform.admin.entity.Project;
import lombok.*;

import java.time.LocalDateTime;

public class ProjectDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private String projectId;
        private String projectNm;
        private String description;
        private String useYn;
        private int sortOrder;
        private String createdBy;
        private LocalDateTime createdAt;

        public static Response from(Project p) {
            return Response.builder()
                    .projectId(p.getProjectId())
                    .projectNm(p.getProjectNm())
                    .description(p.getDescription())
                    .useYn(p.getUseYn())
                    .sortOrder(p.getSortOrder())
                    .createdBy(p.getCreatedBy())
                    .createdAt(p.getCreatedAt())
                    .build();
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SaveRequest {
        private String projectId;
        private String projectNm;
        private String description;
        private String useYn = "Y";
        private int sortOrder = 0;
    }
}
