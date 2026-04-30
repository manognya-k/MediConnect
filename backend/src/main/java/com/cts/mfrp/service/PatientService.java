package com.cts.mfrp.service;

import com.cts.mfrp.entity.Patient;
import com.cts.mfrp.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientService {
    private final PatientRepository patientRepository;

    public List<Patient> getAllPatients() {
        return patientRepository.findAll();
    }

    public List<Patient> getPatientsByHospital(Integer hospitalId) {
        return patientRepository.findByHospitalHospitalId(hospitalId);
    }

    public Patient getPatientById(Integer id) {
        return patientRepository.findById(id).orElse(null);
    }

    public Patient savePatient(Patient patient) {
        return patientRepository.save(patient);
    }

    public void deletePatient(Integer id) {
        patientRepository.deleteById(id);
    }
}
