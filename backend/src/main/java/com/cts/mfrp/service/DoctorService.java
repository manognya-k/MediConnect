package com.cts.mfrp.service;

import com.cts.mfrp.dto.DoctorCreateRequest;
import com.cts.mfrp.entity.Doctor;
import com.cts.mfrp.entity.User;
import com.cts.mfrp.repository.DepartmentRepository;
import com.cts.mfrp.repository.DoctorRepository;
import com.cts.mfrp.repository.HospitalRepository;
import com.cts.mfrp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final HospitalRepository hospitalRepository;
    private final DepartmentRepository departmentRepository;

    public List<Doctor> getAllDoctors() {
        return doctorRepository.findAll();
    }

    public Doctor getDoctorById(Integer id) {
        return doctorRepository.findById(id).orElse(null);
    }

    public List<Doctor> getDoctorsByHospital(Integer hospitalId) {
        return doctorRepository.findByHospitalHospitalId(hospitalId);
    }

    public List<Doctor> getDoctorsBySpecialization(String specialization) {
        return doctorRepository.findBySpecialization(specialization);
    }

    public Doctor saveDoctor(Doctor doctor) {
        return doctorRepository.save(doctor);
    }

    @Transactional
    public void deleteDoctor(Integer id) {
        Doctor doctor = doctorRepository.findById(id).orElse(null);
        if (doctor == null) return;
        User user = doctor.getUser();
        doctorRepository.delete(doctor);
        if (user != null) {
            userRepository.deleteById(user.getUserId());
        }
    }

    @Transactional
    public Doctor createDoctorWithUser(DoctorCreateRequest req) {
        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        User user = new User();
        user.setName(req.getName());
        user.setEmail(req.getEmail());
        user.setPhone(req.getPhone());
        user.setPassword(req.getPassword());
        user.setRole("DOCTOR");
        User savedUser = userRepository.save(user);

        Doctor doctor = new Doctor();
        doctor.setUser(savedUser);
        doctor.setSpecialization(req.getSpecialization() != null ? req.getSpecialization() : "General");
        doctor.setAvailabilityStatus(req.getAvailabilityStatus() != null ? req.getAvailabilityStatus() : "AVAILABLE");
        if (req.getHospitalId() != null) {
            hospitalRepository.findById(req.getHospitalId()).ifPresent(doctor::setHospital);
        }
        if (req.getDepartmentId() != null) {
            departmentRepository.findById(req.getDepartmentId()).ifPresent(doctor::setDepartment);
        }
        return doctorRepository.save(doctor);
    }

    @Transactional
    public Doctor updateDoctorWithUser(Integer doctorId, DoctorCreateRequest req) {
        Doctor doctor = doctorRepository.findById(doctorId)
            .orElseThrow(() -> new RuntimeException("Doctor not found"));

        User user = doctor.getUser();
        if (user != null) {
            user.setName(req.getName());
            user.setEmail(req.getEmail());
            user.setPhone(req.getPhone());
            if (req.getPassword() != null && !req.getPassword().isBlank()) {
                user.setPassword(req.getPassword());
            }
            userRepository.save(user);
        }

        doctor.setSpecialization(req.getSpecialization() != null ? req.getSpecialization() : doctor.getSpecialization());
        doctor.setAvailabilityStatus(req.getAvailabilityStatus() != null ? req.getAvailabilityStatus() : doctor.getAvailabilityStatus());
        if (req.getHospitalId() != null) {
            hospitalRepository.findById(req.getHospitalId()).ifPresent(doctor::setHospital);
        }
        if (req.getDepartmentId() != null) {
            departmentRepository.findById(req.getDepartmentId()).ifPresent(doctor::setDepartment);
        } else {
            doctor.setDepartment(null);
        }
        return doctorRepository.save(doctor);
    }
}
