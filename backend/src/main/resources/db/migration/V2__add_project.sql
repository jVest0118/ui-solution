-- V2: Multi-project support
-- Add project table and project_id FK to screen_def, menu_def, code_group

CREATE TABLE IF NOT EXISTS project (
    project_id    VARCHAR(50)   NOT NULL,
    project_nm    VARCHAR(100)  NOT NULL,
    description   VARCHAR(500),
    use_yn        VARCHAR(1)    NOT NULL DEFAULT 'Y',
    sort_order    INT           NOT NULL DEFAULT 0,
    created_by    VARCHAR(50),
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_project PRIMARY KEY (project_id)
);

-- Role-Project mapping: which roles can access which project
CREATE TABLE IF NOT EXISTS role_project (
    role_id       VARCHAR(50)   NOT NULL,
    project_id    VARCHAR(50)   NOT NULL,
    CONSTRAINT pk_role_project PRIMARY KEY (role_id, project_id),
    CONSTRAINT fk_rp_role    FOREIGN KEY (role_id)    REFERENCES role_def(role_id),
    CONSTRAINT fk_rp_project FOREIGN KEY (project_id) REFERENCES project(project_id)
);

-- Add project_id to screen_def (nullable: NULL not used currently, all screens belong to a project)
ALTER TABLE screen_def ADD COLUMN project_id VARCHAR(50);
ALTER TABLE screen_def ADD CONSTRAINT fk_screen_project
    FOREIGN KEY (project_id) REFERENCES project(project_id);

-- Add project_id to menu_def (NULL = platform menu, non-null = project menu)
ALTER TABLE menu_def ADD COLUMN project_id VARCHAR(50);
ALTER TABLE menu_def ADD CONSTRAINT fk_menu_project
    FOREIGN KEY (project_id) REFERENCES project(project_id);

-- Add project_id to code_group (NULL = platform code, non-null = project business code)
ALTER TABLE code_group ADD COLUMN project_id VARCHAR(50);
ALTER TABLE code_group ADD CONSTRAINT fk_cg_project
    FOREIGN KEY (project_id) REFERENCES project(project_id);

-- Default project
INSERT INTO project (project_id, project_nm, description, sort_order, created_by) VALUES
('DEMO', 'Demo Project', 'Default demo project', 1, 'system');

-- SYSTEM_ADMIN and DEVELOPER access the demo project
INSERT INTO role_project (role_id, project_id) VALUES
('SYSTEM_ADMIN', 'DEMO'),
('SCREEN_ADMIN', 'DEMO'),
('DEVELOPER',    'DEMO'),
('USER',         'DEMO');

-- Platform admin menus stay project_id = NULL (already NULL, no update needed)
-- Add project-specific menu group under Business menu
INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order, project_id) VALUES
('MNU001_04', 'MNU001', 'Project Mgmt', '/admin/projects', 'ProjectOutlined', 4, NULL);

INSERT INTO role_menu (role_id, menu_id) VALUES
('SYSTEM_ADMIN', 'MNU001_04');
