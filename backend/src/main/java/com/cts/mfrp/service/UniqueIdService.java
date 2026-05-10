package com.cts.mfrp.service;

import com.cts.mfrp.entity.User;
import com.cts.mfrp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class UniqueIdService {
    private final UserRepository userRepository;

    public String ensureUserUniqueId(User user) {
        if (user.getUniqueId() != null && !user.getUniqueId().isBlank()) {
            return user.getUniqueId();
        }
        String generated = generateForRole(user.getRole());
        user.setUniqueId(generated);
        userRepository.save(user);
        return generated;
    }

    public String generateForRole(String role) {
        String prefix = switch ((role == null ? "" : role).toUpperCase(Locale.ROOT)) {
            case "PATIENT" -> "PAT";
            case "DOCTOR" -> "DOC";
            case "ADMIN" -> "ADM";
            default -> "USR";
        };

        String candidate;
        do {
            int seq = ThreadLocalRandom.current().nextInt(1000, 10000);
            candidate = prefix + "-" + seq;
        } while (userRepository.existsByUniqueId(candidate));
        return candidate;
    }
}
