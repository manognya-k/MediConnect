package com.cts.mfrp.service;

import com.cts.mfrp.config.JwtUtil;
import com.cts.mfrp.dto.LoginRequest;
import com.cts.mfrp.dto.LoginResponse;
import com.cts.mfrp.dto.RegisterRequest;
import com.cts.mfrp.entity.Doctor;
import com.cts.mfrp.entity.Hospital;
import com.cts.mfrp.entity.Patient;
import com.cts.mfrp.entity.User;
import com.cts.mfrp.repository.DoctorRepository;
import com.cts.mfrp.repository.HospitalRepository;
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
    private final DoctorRepository doctorRepository;
    private final HospitalRepository hospitalRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final UniqueIdService uniqueIdService;

    public LoginResponse login(LoginRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty()) {
            throw new RuntimeException("Invalid email or password");
        }
        User user = userOpt.get();
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }
        String uniqueId = uniqueIdService.ensureUserUniqueId(user);
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return new LoginResponse(user.getUserId(), uniqueId, user.getName(), user.getEmail(), user.getRole(), token);
    }

    public LoginResponse loginAdmin(LoginRequest request) {
        LoginResponse response = login(request);
        if (!"ADMIN".equalsIgnoreCase(response.getRole())) {
            throw new RuntimeException("This account does not have admin access");
        }
        return response;
    }

    public LoginResponse registerAdmin(RegisterRequest request) {
        if (request.getHospitalId() == null) {
            throw new RuntimeException("Please select a hospital");
        }
        Hospital hospital = hospitalRepository.findById(request.getHospitalId())
                .orElseThrow(() -> new RuntimeException("Selected hospital not found"));

        // Email domain must match hospital emailCode
        String emailCode = hospital.getEmailCode();
        if (emailCode != null && !emailCode.isBlank()) {
            String requiredDomain = "@" + emailCode.toLowerCase() + ".com";
            if (request.getEmail() == null || !request.getEmail().toLowerCase().endsWith(requiredDomain)) {
                throw new RuntimeException("Email must use hospital domain " + requiredDomain);
            }
        }

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        User user = new User();
        user.setName(request.getFirstName() + " " + request.getLastName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPhone(request.getPhone());
        user.setRole("ADMIN");
        user.setHospital(hospital);
        user.setUniqueId(uniqueIdService.generateForRole("ADMIN"));

        User saved = userRepository.save(user);
        String token = jwtUtil.generateToken(saved.getEmail(), saved.getRole());
        return new LoginResponse(saved.getUserId(), saved.getUniqueId(), saved.getName(), saved.getEmail(), saved.getRole(), token);
    }

    public LoginResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        Hospital hospital = null;
        if (request.getHospitalId() != null) {
            hospital = hospitalRepository.findById(request.getHospitalId()).orElse(null);
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
        user.setSpecialization(request.getSpecialization());
        user.setHospital(hospital);
        user.setUniqueId(uniqueIdService.generateForRole(user.getRole()));

        User savedUser = userRepository.save(user);

        if ("PATIENT".equalsIgnoreCase(request.getRole())) {
            Patient patient = new Patient();
            patient.setUser(savedUser);
            patient.setDateOfBirth(request.getDateOfBirth());
            patient.setBloodGroup(request.getBloodGroup());
            patient.setGender(request.getGender());
            patientRepository.save(patient);
        } else if ("DOCTOR".equalsIgnoreCase(request.getRole())) {
            Doctor doctor = new Doctor();
            doctor.setUser(savedUser);
            doctor.setHospital(hospital);
            doctor.setSpecialization(request.getSpecialization());
            doctor.setAvailabilityStatus("AVAILABLE");
            doctorRepository.save(doctor);
        }

        String token = jwtUtil.generateToken(savedUser.getEmail(), savedUser.getRole());
        return new LoginResponse(savedUser.getUserId(), savedUser.getUniqueId(), savedUser.getName(), savedUser.getEmail(), savedUser.getRole(), token);
    }
}
