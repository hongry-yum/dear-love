package com.dearlove.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
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

    private static final String MIGRATIONS_DDL = """
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id VARCHAR(80) PRIMARY KEY,
          applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        """;

    /** One-time cleanup: wipe dev/test data and standardize on a fixed set of test accounts. */
    private static final String RESET_TEST_DATA_MIGRATION_ID = "reset-test-data-2026-09-20";
    private static final String[] TEST_USERNAMES = {"test001", "test002", "test003", "test004", "test005"};
    private static final String TEST_PASSWORD = "asdf1234";

    private final DataSource dataSource;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public SchemaInitializer(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute(LETTERS_DDL);
            stmt.execute(USERS_DDL);
            stmt.execute(SESSIONS_DDL);
            stmt.execute(MIGRATIONS_DDL);
            addColumnIfMissing(conn, "letters", "username", "VARCHAR(20) NULL AFTER owner_token");
            addColumnIfMissing(conn, "letters", "recipient_username", "VARCHAR(20) NULL AFTER username");
            addColumnIfMissing(conn, "letters", "relationship_day", "INT NULL AFTER recipient_username");
            addColumnIfMissing(conn, "users", "partner_username", "VARCHAR(20) NULL AFTER password_hash");
            addColumnIfMissing(conn, "users", "relationship_start_date", "DATE NULL AFTER partner_username");
            addColumnIfMissing(conn, "users", "is_admin", "BOOLEAN NOT NULL DEFAULT FALSE AFTER relationship_start_date");
            addColumnIfMissing(conn, "letters", "read_at", "DATETIME NULL AFTER relationship_day");
            addColumnIfMissing(conn, "letters", "read_by_username", "VARCHAR(20) NULL AFTER read_at");

            // the "admin" account is always treated as an administrator, even if it already
            // existed before this flag was introduced or was created with an older code path
            stmt.execute("UPDATE users SET is_admin = TRUE WHERE username = 'admin' AND is_admin = FALSE");

            resetTestDataOnce(conn);
        }
    }

    /**
     * Runs exactly once (guarded by schema_migrations): clears out every letter and every
     * non-admin account accumulated from ad hoc testing, then (re)creates a fixed set of test
     * accounts with a shared password so future testing no longer litters the database with
     * one-off accounts.
     */
    private void resetTestDataOnce(Connection conn) throws Exception {
        try (PreparedStatement check = conn.prepareStatement("SELECT 1 FROM schema_migrations WHERE id = ?")) {
            check.setString(1, RESET_TEST_DATA_MIGRATION_ID);
            try (ResultSet rs = check.executeQuery()) {
                if (rs.next()) return;
            }
        }

        try (Statement stmt = conn.createStatement()) {
            stmt.execute("DELETE FROM letters");
            stmt.execute("DELETE FROM sessions");
            stmt.execute("DELETE FROM users WHERE username <> 'admin'");
        }

        String hash = passwordEncoder.encode(TEST_PASSWORD);
        try (PreparedStatement insertUser = conn.prepareStatement(
                "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, FALSE)")) {
            for (String username : TEST_USERNAMES) {
                insertUser.setString(1, username);
                insertUser.setString(2, hash);
                insertUser.addBatch();
            }
            insertUser.executeBatch();
        }

        try (PreparedStatement markDone = conn.prepareStatement("INSERT INTO schema_migrations (id) VALUES (?)")) {
            markDone.setString(1, RESET_TEST_DATA_MIGRATION_ID);
            markDone.executeUpdate();
        }
    }

    /** Columns added after their table already existed in production, so migrate defensively. */
    private void addColumnIfMissing(Connection conn, String table, String column, String definition) throws Exception {
        boolean hasColumn;
        try (ResultSet rs = conn.getMetaData().getColumns(null, null, table, column)) {
            hasColumn = rs.next();
        }
        if (!hasColumn) {
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
            }
        }
    }
}
