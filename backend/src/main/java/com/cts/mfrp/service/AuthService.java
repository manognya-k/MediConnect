package com.cts.mfrp.service;

import com.cts.mfrp.config.JwtUtil;
import com.cts.mfrp.dto.LoginRequest;
import com.cts.mfrp.dto.LoginResponse;
import com.cts.mfrp.dto.RegisterRequest;
import com.cts.mfrp.entity.Patient;
import com.cts.mfrp.entity.User;
import com.cts.mfrp.repository.PatientRepository;
import com.cts.mfrp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public LoginResponse login(LoginRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty()) {
            throw new RuntimeException("Invalid email or password");
        }
        User user = userOpt.get();
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return new LoginResponse(user.getUserId(), user.getName(), user.getEmail(), user.getRole(), token);
    }

    public LoginResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        User user = new User();
        user.setName(request.getFirstName() + " " + request.getLastName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPhone(request.getPhone());
        user.setRole(request.getRole().toUpperCase());
        user.setDateOfBirth(request.getDateOfBirth());
        user.setBloodGroup(request.getBloodGroup());
        user.setGender(request.getGender());

        User savedUser = userRepository.save(user);

        if ("PATIENT".equalsIgnoreCase(request.getRole())) {
            Patient patient = new Patient();
            patient.setUser(savedUser);
            patient.setDateOfBirth(request.getDateOfBirth());
            patient.setBloodGroup(request.getBloodGroup());
            patient.setGender(request.getGender());
            patientRepository.save(patient);
        }

        String token = jwtUtil.generateToken(savedUser.getEmail(), savedUser.getRole());
        return new LoginResponse(savedUser.getUserId(), savedUser.getName(), savedUser.getEmail(), savedUser.getRole(), token);
    }
}
