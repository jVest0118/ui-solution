package com.uisolution.platform.git.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "git_config")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class GitConfig {

    @Id
    @Column(name = "config_id", length = 50)
    private String configId;

    @Column(name = "repo_path", length = 500)
    private String repoPath;

    @Column(name = "remote_url", length = 500)
    private String remoteUrl;

    @Column(name = "username", length = 100)
    private String username;

    @Column(name = "access_token", length = 1000)
    private String accessToken;

    @Column(name = "branch", length = 100)
    @Builder.Default
    private String branch = "main";

    @Column(name = "auto_restart", length = 1)
    @Builder.Default
    private String autoRestart = "N";

    @Column(name = "restart_command", length = 1000)
    private String restartCommand;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    public void update(String repoPath, String remoteUrl, String username, String accessToken,
                       String branch, String autoRestart, String restartCommand) {
        this.repoPath       = repoPath;
        this.remoteUrl      = remoteUrl;
        this.username       = username;
        // 빈 값이거나 마스킹 문자(••••)면 기존 토큰 유지
        if (accessToken != null && !accessToken.isBlank() && !accessToken.contains("•"))
            this.accessToken = accessToken;
        this.branch         = branch != null ? branch : "main";
        this.autoRestart    = "Y".equals(autoRestart) ? "Y" : "N";
        this.restartCommand = restartCommand;
        this.updatedAt      = LocalDateTime.now();
    }
}
