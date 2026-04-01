package com.cts.mfrp.service;

import com.cts.mfrp.entity.MedicalRecord;
import com.cts.mfrp.repository.MedicalRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MedicalRecordService {
    private final MedicalRecordRepository medicalRecordRepository;

    public List<MedicalRecord> getAllRecords() {
        return medicalRecordRepository.findAll();
    }

    public MedicalRecord getRecordById(Integer id) {
        return medicalRecordRepository.findById(id).orElse(null);
    }

    public List<MedicalRecord> getRecordsByPatient(Integer patientId) {
        return medicalRecordRepository.findByPatientPatientId(patientId);
    }

    public List<MedicalRecord> getRecordsByDoctor(Integer doctorId) {
        return medicalRecordRepository.findByDoctorDoctorId(doctorId);
    }

    public MedicalRecord saveRecord(MedicalRecord record) {
        return medicalRecordRepository.save(record);
    }

    public void deleteRecord(Integer id) {
        medicalRecordRepository.deleteById(id);
    }
}
