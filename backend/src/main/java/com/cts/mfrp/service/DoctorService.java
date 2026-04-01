package com.cts.mfrp.service;

import com.cts.mfrp.entity.Doctor;
import com.cts.mfrp.repository.DoctorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorService {
    private final DoctorRepository doctorRepository;

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

    public void deleteDoctor(Integer id) {
        doctorRepository.deleteById(id);
    }
}
