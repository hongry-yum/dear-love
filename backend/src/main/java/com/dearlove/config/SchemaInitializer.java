package com.dearlove.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

@Component
public class SchemaInitializer implements CommandLineRunner {

    private static final String DDL = """
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

    private final DataSource dataSource;

    public SchemaInitializer(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute(DDL);
        }
    }
}
