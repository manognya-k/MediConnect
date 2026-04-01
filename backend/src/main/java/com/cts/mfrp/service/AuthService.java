package com.cts.mfrp.service;

import com.cts.mfrp.entity.User;
import com.cts.mfrp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User register(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    // ADDED: expose encoder so AuthController can verify the password
    public PasswordEncoder getPasswordEncoder() {
        return passwordEncoder;
    }
}
