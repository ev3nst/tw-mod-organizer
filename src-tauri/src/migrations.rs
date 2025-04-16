use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_profiles_table",
            sql: r#"
            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_id INTEGER NOT NULL,
                name TEXT NOT NULL CHECK(length(name) <= 255),
                is_active INTEGER DEFAULT 0 CHECK(is_active IN (0, 1))
            );

            -- Indexes for performance on commonly queried fields
            CREATE INDEX idx_profile_app_id ON profiles (app_id);
            CREATE INDEX idx_profile_is_active ON profiles (is_active);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_settings_table",
            sql: r#"
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                selected_game INTEGER,
                column_selections TEXT NOT NULL DEFAULT '{"category": true, "conflict": true, "version": true}',
                mod_installation_path TEXT NOT NULL,
                mod_download_path TEXT NOT NULL,
                nexus_auth_params TEXT,
                nexus_api_key TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Trigger to auto-update updated_at on settings updates
            CREATE TRIGGER settings_updated_at
            AFTER UPDATE ON settings
            FOR EACH ROW
            BEGIN
                UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END;
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_mod_orders_table",
            sql: r#"
            CREATE TABLE IF NOT EXISTS mod_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER NOT NULL,
                app_id INTEGER NOT NULL,
                data TEXT
            );

            -- Indexes for performance on commonly queried fields
            CREATE INDEX idx_mod_order_profile_id ON mod_orders (profile_id);
            CREATE INDEX idx_mod_order_app_id ON mod_orders (app_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_mod_activations_table",
            sql: r#"
            CREATE TABLE IF NOT EXISTS mod_activations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER NOT NULL,
                app_id INTEGER NOT NULL,
                data TEXT
            );

            -- Indexes for performance on commonly queried fields
            CREATE INDEX idx_mod_activation_profile_id ON mod_activations (profile_id);
            CREATE INDEX idx_mod_activation_app_id ON mod_activations (app_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_mod_separators_table",
            sql: r#"
            CREATE TABLE IF NOT EXISTS mod_separators (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER NOT NULL,
                app_id INTEGER NOT NULL,
                data TEXT
            );

            -- Indexes for performance on commonly queried fields
            CREATE INDEX idx_mod_separator_profile_id ON mod_separators (profile_id);
            CREATE INDEX idx_mod_separator_app_id ON mod_separators (app_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create_downloads_table",
            sql: r#"
            CREATE TABLE IF NOT EXISTS downloads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_id INTEGER NOT NULL,
                item_id INTEGER NOT NULL,
                filename TEXT NOT NULL UNIQUE,
				url TEXT NOT NULL UNIQUE,
				total_size INTEGER NOT NULL,
				bytes_downloaded INTEGER NOT NULL,
				preview_url TEXT,
				version TEXT,
				mod_url TEXT,
				status TEXT NOT NULL,
                hidden INTEGER DEFAULT 0 CHECK(hidden IN (0, 1)),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Indexes for performance on commonly queried fields
            CREATE INDEX idx_downloads_item_id ON downloads (item_id);
            CREATE INDEX idx_downloads_filename ON downloads (filename);
            CREATE INDEX idx_downloads_url ON downloads (url);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "create_mod_metas_table",
            sql: r#"
            CREATE TABLE IF NOT EXISTS mod_metas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_id INTEGER NOT NULL,
                data TEXT
            );

            -- Indexes for performance on commonly queried fields
            CREATE INDEX idx_mod_metas_app_id ON mod_metas (app_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "add_unique_composite_key_to_profiles",
            sql: r#"
			-- Add a UNIQUE constraint for the combination of app_id and name
			CREATE UNIQUE INDEX idx_profile_app_id_name ON profiles (app_id, name);
			"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "add_dependency_confirmation_to_settings",
            sql: r#"
			ALTER TABLE settings ADD COLUMN dependency_confirmation INTEGER DEFAULT 0 CHECK(dependency_confirmation IN (0, 1));
			"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "add_sort_by_to_settings",
            sql: r#"
			ALTER TABLE settings ADD COLUMN sort_by TEXT NOT NULL DEFAULT 'load_order';
			"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "add_include_hidden_downloads_to_settings",
            sql: r#"
			ALTER TABLE settings ADD COLUMN include_hidden_downloads INTEGER DEFAULT 0 CHECK(include_hidden_downloads IN (0, 1));
			"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "add_updated_at_to_downloads",
            sql: r#"
			ALTER TABLE downloads ADD COLUMN updated_at TIMESTAMP;
			UPDATE downloads SET updated_at = CURRENT_TIMESTAMP;
		
			CREATE TRIGGER update_downloads_updated_at
			AFTER UPDATE ON downloads
			FOR EACH ROW
			BEGIN
				UPDATE downloads SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
			END;
			"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "add_compact_archive_names_to_settings",
            sql: r#"
			ALTER TABLE settings ADD COLUMN compact_archive_names INTEGER DEFAULT 0 CHECK(compact_archive_names IN (0, 1));
			"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "add_sidebar_accordion_to_settings",
            sql: r#"
			ALTER TABLE settings ADD COLUMN sidebar_accordion TEXT NOT NULL DEFAULT 'saves';
			"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "add_mod_table_scroll_to_settings",
            sql: r#"
			ALTER TABLE settings ADD COLUMN mod_table_scroll INTEGER NOT NULL DEFAULT 0;
			"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "add_toggle_updated_at_to_settings",
            sql: r#"
			ALTER TABLE settings ADD COLUMN toggle_updated_at INTEGER DEFAULT 0 CHECK(toggle_updated_at IN (0, 1));
			"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "add_sort_by_direction_to_settings",
            sql: r#"
			ALTER TABLE settings 
			ADD COLUMN sort_by_direction TEXT NOT NULL DEFAULT 'asc' 
			CHECK (sort_by_direction IN ('asc', 'desc'));
			"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "add_creator_to_downloads",
            sql: r#"
			ALTER TABLE downloads ADD COLUMN creator_id TEXT;
			ALTER TABLE downloads ADD COLUMN creator_name TEXT;
			"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 19,
            description: "add_preview_size_to_settings",
            sql: r#"
			ALTER TABLE settings ADD COLUMN preview_size INTEGER NOT NULL DEFAULT 6;
			"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 20,
            description: "create_mod_versions_table",
            sql: r#"
            CREATE TABLE IF NOT EXISTS mod_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_id INTEGER NOT NULL,
                data TEXT
            );

            -- Indexes for performance on commonly queried fields
            CREATE INDEX idx_mod_version_app_id ON mod_versions (app_id);
            "#,
            kind: MigrationKind::Up,
        },
		Migration {
			version: 21,
			description: "cleanup_duplicates_and_add_unique_indexes",
			sql: r#"
			-- 1) mod_orders: (app_id, profile_id) composite unique
			DELETE FROM mod_orders
			WHERE id NOT IN (
			  SELECT MAX(id) FROM mod_orders GROUP BY app_id, profile_id
			);
			CREATE UNIQUE INDEX IF NOT EXISTS idx_mod_orders_app_profile
			  ON mod_orders (app_id, profile_id);
		
			-- 2) mod_activations: (app_id, profile_id) composite unique
			DELETE FROM mod_activations
			WHERE id NOT IN (
			  SELECT MAX(id) FROM mod_activations GROUP BY app_id, profile_id
			);
			CREATE UNIQUE INDEX IF NOT EXISTS idx_mod_activations_app_profile
			  ON mod_activations (app_id, profile_id);
		
			-- 3) mod_separators: (app_id, profile_id) composite unique
			DELETE FROM mod_separators
			WHERE id NOT IN (
			  SELECT MAX(id) FROM mod_separators GROUP BY app_id, profile_id
			);
			CREATE UNIQUE INDEX IF NOT EXISTS idx_mod_separators_app_profile
			  ON mod_separators (app_id, profile_id);
		
			-- 4) mod_metas: app_id unique
			DELETE FROM mod_metas
			WHERE id NOT IN (
			  SELECT MAX(id) FROM mod_metas GROUP BY app_id
			);
			CREATE UNIQUE INDEX IF NOT EXISTS idx_mod_metas_app_id
			  ON mod_metas (app_id);
		
			-- 5) mod_versions: app_id unique
			DELETE FROM mod_versions
			WHERE id NOT IN (
			  SELECT MAX(id) FROM mod_versions GROUP BY app_id
			);
			CREATE UNIQUE INDEX IF NOT EXISTS idx_mod_versions_app_id
			  ON mod_versions (app_id);
			"#,
			kind: MigrationKind::Up,
		},
		
    ]
}
