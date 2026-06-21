package com.uisolution.platform.git.service;

import com.uisolution.platform.git.entity.GitConfig;
import com.uisolution.platform.git.repository.GitConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.jgit.api.*;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.diff.DiffEntry;
import org.eclipse.jgit.lib.*;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.storage.file.FileRepositoryBuilder;
import org.eclipse.jgit.transport.UsernamePasswordCredentialsProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class GitService {

    private static final String CONFIG_ID = "DEFAULT";
    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final GitConfigRepository configRepository;

    /* ── 설정 ─────────────────────────────────────────────── */

    @Transactional(readOnly = true)
    public Map<String, Object> getConfig() {
        return configRepository.findById(CONFIG_ID)
                .map(this::configToMap)
                .orElseGet(HashMap::new);
    }

    @Transactional
    public Map<String, Object> saveConfig(Map<String, Object> req) {
        String repoPath      = str(req, "repoPath");
        String remoteUrl     = str(req, "remoteUrl");
        String username      = str(req, "username");
        String accessToken   = str(req, "accessToken");
        String branch        = str(req, "branch");
        String autoRestart   = str(req, "autoRestart");
        String restartCmd    = str(req, "restartCommand");

        GitConfig cfg = configRepository.findById(CONFIG_ID)
                .map(c -> { c.update(repoPath, remoteUrl, username, accessToken, branch, autoRestart, restartCmd); return c; })
                .orElseGet(() -> configRepository.save(GitConfig.builder()
                        .configId(CONFIG_ID).repoPath(repoPath).remoteUrl(remoteUrl)
                        .username(username).accessToken(accessToken).branch(branch)
                        .autoRestart(autoRestart).restartCommand(restartCmd)
                        .build()));
        return configToMap(cfg);
    }

    /* ── 상태 조회 ─────────────────────────────────────────── */

    public Map<String, Object> getStatus() throws Exception {
        GitConfig cfg = requireConfig();
        try (Git git = openGit(cfg)) {
            Status status = git.status().call();

            List<Map<String, String>> files = new ArrayList<>();
            addFiles(files, status.getModified(),  "modified");
            addFiles(files, status.getAdded(),      "added");
            addFiles(files, status.getUntracked(),  "untracked");
            addFiles(files, status.getRemoved(),    "deleted");
            addFiles(files, status.getMissing(),    "missing");
            addFiles(files, status.getConflicting(),"conflict");

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("files", files);
            result.put("conflicting", new ArrayList<>(status.getConflicting()));
            result.put("clean", status.isClean());
            result.put("branch", git.getRepository().getBranch());
            return result;
        }
    }

    /* ── 커밋 ──────────────────────────────────────────────── */

    public Map<String, Object> commit(List<String> paths, String message, String authorName) throws Exception {
        if (message == null || message.isBlank()) throw new IllegalArgumentException("커밋 메시지를 입력하세요.");
        GitConfig cfg = requireConfig();

        try (Git git = openGit(cfg)) {
            AddCommand add = git.add();
            if (paths == null || paths.isEmpty()) {
                add.addFilepattern(".");
            } else {
                for (String p : paths) add.addFilepattern(p);
            }
            add.call();

            String author = (authorName != null && !authorName.isBlank()) ? authorName : cfg.getUsername();
            RevCommit commit = git.commit()
                    .setMessage(message)
                    .setAuthor(author, cfg.getUsername() + "@git")
                    .call();

            return Map.of(
                "commitId", commit.abbreviate(8).name(),
                "message",  commit.getShortMessage()
            );
        }
    }

    /* ── 푸시 ──────────────────────────────────────────────── */

    public Map<String, Object> push() throws Exception {
        GitConfig cfg = requireConfig();
        try (Git git = openGit(cfg)) {
            git.push()
               .setCredentialsProvider(creds(cfg))
               .setRemote("origin")
               .call();
            return Map.of("success", true, "message", "Push 완료");
        }
    }

    /* ── 풀 ────────────────────────────────────────────────── */

    public Map<String, Object> pull() throws Exception {
        GitConfig cfg = requireConfig();
        Map<String, Object> result = new LinkedHashMap<>();

        try (Git git = openGit(cfg)) {
            PullResult pr = git.pull()
                    .setCredentialsProvider(creds(cfg))
                    .setRemoteBranchName(cfg.getBranch())
                    .call();

            boolean success = pr.isSuccessful();
            result.put("success", success);

            MergeResult merge = pr.getMergeResult();
            if (merge != null) {
                String status = merge.getMergeStatus().name();
                result.put("mergeStatus", status);

                if (merge.getMergeStatus() == MergeResult.MergeStatus.CONFLICTING) {
                    result.put("conflicting", new ArrayList<>(merge.getConflicts().keySet()));
                    result.put("message", "충돌이 발생했습니다. 충돌 해결 후 커밋하세요.");
                    result.put("hasConflict", true);
                } else {
                    result.put("message", "Pull 완료: " + status);
                    result.put("hasConflict", false);

                    // 자동 재시작
                    if ("Y".equals(cfg.getAutoRestart()) && cfg.getRestartCommand() != null
                            && !cfg.getRestartCommand().isBlank()) {
                        triggerRestart(cfg.getRestartCommand());
                        result.put("restarting", true);
                    }
                }
            } else {
                result.put("message", "Pull 완료 (최신 상태)");
                result.put("hasConflict", false);
            }
        }
        return result;
    }

    /* ── 충돌 파일 내용 조회 ───────────────────────────────── */

    public Map<String, Object> getConflictFile(String filePath) throws Exception {
        GitConfig cfg = requireConfig();
        Path fullPath = Path.of(cfg.getRepoPath()).resolve(filePath);
        String content = Files.readString(fullPath, StandardCharsets.UTF_8);
        List<Map<String, Object>> sections = parseConflictSections(content);

        return Map.of(
            "filePath", filePath,
            "rawContent", content,
            "sections", sections
        );
    }

    /* ── 충돌 해결 저장 ────────────────────────────────────── */

    public Map<String, Object> resolveConflict(String filePath, String resolvedContent) throws Exception {
        GitConfig cfg = requireConfig();
        Path fullPath = Path.of(cfg.getRepoPath()).resolve(filePath);
        Files.writeString(fullPath, resolvedContent, StandardCharsets.UTF_8);

        try (Git git = openGit(cfg)) {
            git.add().addFilepattern(filePath).call();
        }
        return Map.of("success", true, "message", filePath + " 충돌 해결 완료");
    }

    /* ── 커밋 히스토리 ─────────────────────────────────────── */

    public List<Map<String, Object>> getLog(int count) throws Exception {
        GitConfig cfg = requireConfig();
        try (Git git = openGit(cfg)) {
            List<Map<String, Object>> logs = new ArrayList<>();
            int limit = count > 0 ? count : 30;
            for (RevCommit c : git.log().setMaxCount(limit).call()) {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("commitId",  c.abbreviate(8).name());
                entry.put("fullId",    c.getName());
                entry.put("message",   c.getFullMessage().trim());
                entry.put("shortMsg",  c.getShortMessage());
                entry.put("author",    c.getAuthorIdent().getName());
                entry.put("email",     c.getAuthorIdent().getEmailAddress());
                LocalDateTime dt = LocalDateTime.ofInstant(
                        c.getAuthorIdent().getWhenAsInstant(), ZoneId.systemDefault());
                entry.put("date",      dt.format(DT_FMT));
                entry.put("timestamp", dt.atZone(ZoneId.systemDefault()).toEpochSecond());
                logs.add(entry);
            }
            return logs;
        }
    }

    /* ── 연결 테스트 ────────────────────────────────────────── */

    public Map<String, Object> testConnection() {
        GitConfig cfg;
        try {
            cfg = requireConfig();
        } catch (IllegalStateException e) {
            return Map.of("success", false, "message", "Git 설정이 저장되지 않았습니다. 설정을 먼저 저장해 주세요.");
        }

        // 로컬 저장소 경로 확인
        File gitDir = new File(cfg.getRepoPath() != null ? cfg.getRepoPath() : "", ".git");
        if (!gitDir.exists()) {
            return Map.of("success", false, "message",
                "로컬 저장소를 찾을 수 없습니다: " + cfg.getRepoPath());
        }

        // 현재 브랜치 조회
        String currentBranch = "unknown";
        try (Git git = openGit(cfg)) {
            currentBranch = git.getRepository().getBranch();
        } catch (Exception e) {
            return Map.of("success", false, "message", "로컬 저장소 열기 실패: " + e.getMessage());
        }

        // 원격 저장소 연결 테스트
        if (cfg.getRemoteUrl() != null && !cfg.getRemoteUrl().isBlank()) {
            try {
                Git.lsRemoteRepository()
                    .setRemote(cfg.getRemoteUrl())
                    .setCredentialsProvider(creds(cfg))
                    .call();
                return Map.of("success", true, "branch", currentBranch,
                    "message", "원격 저장소 연결 성공 (현재 브랜치: " + currentBranch + ")");
            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                return Map.of("success", false, "message", "원격 저장소 연결 실패: " + msg);
            }
        }

        return Map.of("success", true, "branch", currentBranch,
            "message", "로컬 저장소 연결 성공 (브랜치: " + currentBranch + ")");
    }

    /* ── 내부 유틸 ─────────────────────────────────────────── */

    private GitConfig requireConfig() {
        return configRepository.findById(CONFIG_ID)
                .orElseThrow(() -> new IllegalStateException("Git 설정이 등록되지 않았습니다. 설정 페이지에서 먼저 등록해 주세요."));
    }

    private Git openGit(GitConfig cfg) throws IOException {
        if (cfg.getRepoPath() == null || cfg.getRepoPath().isBlank())
            throw new IllegalArgumentException("저장소 경로(repoPath)가 설정되지 않았습니다.");
        Repository repo = new FileRepositoryBuilder()
                .setGitDir(new File(cfg.getRepoPath() + "/.git"))
                .readEnvironment()
                .build();
        return new Git(repo);
    }

    private UsernamePasswordCredentialsProvider creds(GitConfig cfg) {
        return new UsernamePasswordCredentialsProvider(
                cfg.getUsername() != null ? cfg.getUsername() : "",
                cfg.getAccessToken() != null ? cfg.getAccessToken() : "");
    }

    private void addFiles(List<Map<String, String>> list, Set<String> paths, String statusLabel) {
        for (String p : paths) {
            Map<String, String> m = new LinkedHashMap<>();
            m.put("path",   p);
            m.put("status", statusLabel);
            list.add(m);
        }
    }

    private List<Map<String, Object>> parseConflictSections(String content) {
        List<Map<String, Object>> sections = new ArrayList<>();
        // 충돌 마커 패턴: <<<< HEAD ... ==== ... >>>> branch
        Pattern p = Pattern.compile(
                "(?s)<<<<<<< (.+?)\\n(.*?)=======\\n(.*?)>>>>>>> (.+?)\\n",
                Pattern.DOTALL);
        Matcher m = p.matcher(content);
        while (m.find()) {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("oursLabel",   "내 변경 (HEAD)");
            s.put("theirsLabel", "서버 변경 (" + m.group(4).trim() + ")");
            s.put("ours",        m.group(2));
            s.put("theirs",      m.group(3));
            s.put("start",       m.start());
            s.put("end",         m.end());
            s.put("marker",      m.group(0));
            sections.add(s);
        }
        return sections;
    }

    private void triggerRestart(String command) {
        new Thread(() -> {
            try {
                Thread.sleep(1000); // 응답 전송 후 실행
                List<String> parts = Arrays.asList(command.split("\\s+"));
                new ProcessBuilder(parts).inheritIO().start();
            } catch (Exception e) {
                log.warn("재시작 명령 실행 실패: {}", e.getMessage());
            }
        }).start();
    }

    private Map<String, Object> configToMap(GitConfig c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("repoPath",       c.getRepoPath());
        m.put("remoteUrl",      c.getRemoteUrl());
        m.put("username",       c.getUsername());
        m.put("accessToken",    c.getAccessToken() != null ? "••••••••" : null); // 마스킹
        m.put("branch",         c.getBranch());
        m.put("autoRestart",    c.getAutoRestart());
        m.put("restartCommand", c.getRestartCommand());
        return m;
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString().trim() : null;
    }
}
