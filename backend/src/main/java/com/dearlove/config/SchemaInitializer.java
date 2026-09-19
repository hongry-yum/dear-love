package com.dearlove.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

@Component
public class SchemaInitializer implements CommandLineRunner {

    private static final String LETTERS_DDL = """
        CREATE TABLE IF NOT EXISTS letters (
          id CHAR(36) PRIMARY KEY,
          title VARCHAR(80) NULL,
          body TEXT NOT NULL,
          lat DOUBLE NOT NULL,
          lng DOUBLE NOT NULL,
          radius_m INT NOT NULL,
          place_label VARCHAR(200) NULL,
          owner_token CHAR(36) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        """;

    private static final String USERS_DDL = """
        CREATE TABLE IF NOT EXISTS users (
          username VARCHAR(20) PRIMARY KEY,
          password_hash VARCHAR(100) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        """;

    private static final String SESSIONS_DDL = """
        CREATE TABLE IF NOT EXISTS sessions (
          token CHAR(36) PRIMARY KEY,
          username VARCHAR(20) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          INDEX idx_sessions_username (username)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        """;

    private final DataSource dataSource;

    public SchemaInitializer(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute(LETTERS_DDL);
            stmt.execute(USERS_DDL);
            stmt.execute(SESSIONS_DDL);
            addUsernameColumnIfMissing(conn);
        }
    }

    /** letters.username was added after the table already existed in production, so migrate defensively. */
    private void addUsernameColumnIfMissing(Connection conn) throws Exception {
        boolean hasColumn;
        try (ResultSet rs = conn.getMetaData().getColumns(null, null, "letters", "username")) {
            hasColumn = rs.next();
        }
        if (!hasColumn) {
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE letters ADD COLUMN username VARCHAR(20) NULL AFTER owner_token");
            }
        }
    }
}
