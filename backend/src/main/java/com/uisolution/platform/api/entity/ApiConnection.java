package com.uisolution.platform.api.entity;

import com.uisolution.platform.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "api_connection")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ApiConnection extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conn_nm", nullable = false, length = 100)
    private String connNm;

    @Column(name = "base_url", nullable = false, length = 500)
    private String baseUrl;

    @Column(name = "health_url", length = 500)
    private String healthUrl;

    @Column(name = "method", length = 10)
    private String method;

    @Column(name = "req_headers", columnDefinition = "TEXT")
    private String reqHeaders;

    @Column(name = "timeout_ms")
    private int timeoutMs;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "project_id", length = 50)
    private String projectId;

    @Column(name = "use_yn", length = 1)
    private String useYn;

    public void update(String connNm, String baseUrl, String healthUrl, String method,
                       String reqHeaders, int timeoutMs, String description, String useYn) {
        this.connNm     = connNm;
        this.baseUrl    = baseUrl;
        this.healthUrl  = healthUrl;
        this.method     = method;
        this.reqHeaders = reqHeaders;
        this.timeoutMs  = timeoutMs;
        this.description = description;
        this.useYn      = useYn;
    }
}
