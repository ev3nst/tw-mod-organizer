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
    ]
}
