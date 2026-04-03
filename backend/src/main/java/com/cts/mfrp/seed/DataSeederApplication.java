package com.cts.mfrp.seed;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

/**
 * Standalone Seed Application — runs separately from the main MediConnect app.
 *
 * HOW TO RUN (from IntelliJ):
 *   Right-click this file → Run 'DataSeederApplication.main()'
 *
 * What happens:
 *   1. Spring Boot starts (NO web server, NO security)
 *   2. DataSeederRunner executes: clears all tables, inserts dummy data
 *   3. Application exits automatically
 *
 * Default password seeded for ALL users: MediConnect@123
 */
@SpringBootApplication(
    scanBasePackages = "com.cts.mfrp",
    exclude = {
        SecurityAutoConfiguration.class,
        UserDetailsServiceAutoConfiguration.class
    }
)
public class DataSeederApplication {

    public static void main(String[] args) {
        // Activate the seed profile — loads application-seed.properties
        System.setProperty("spring.profiles.active", "seed");
        SpringApplication.run(DataSeederApplication.class, args);
    }
}
