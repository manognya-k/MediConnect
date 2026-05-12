package com.cts.mfrp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MediconnectApplication {
    public static void main(String[] args) {
        SpringApplication.run(MediconnectApplication.class, args);
    }
}
