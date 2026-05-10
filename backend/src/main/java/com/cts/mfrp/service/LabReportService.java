package com.cts.mfrp.service;

import com.cts.mfrp.entity.LabReport;
import com.cts.mfrp.repository.LabReportRepository;
import com.cts.mfrp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LabReportService {
    private final LabReportRepository labReportRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public List<LabReport> getAllReports() {
        return labReportRepository.findAll();
    }

    public LabReport getReportById(Integer id) {
        return labReportRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lab report not found"));
    }

    public List<LabReport> getReportsByPatient(Integer patientId) {
        return labReportRepository.findByPatientPatientId(patientId);
    }

    public List<LabReport> getReportsByDoctor(Integer doctorId) {
        return labReportRepository.findByDoctorDoctorId(doctorId);
    }

    @Transactional
    public LabReport saveReport(LabReport report) {
        boolean isNew = report.getReportId() == null;
        LabReport saved = labReportRepository.save(report);

        // Notify all admins when a doctor creates a new lab report request
        if (isNew && saved.getDoctor() != null && saved.getPatient() != null) {
            String doctorName  = saved.getDoctor().getUser()  != null ? saved.getDoctor().getUser().getName()  : "Doctor";
            String patientName = saved.getPatient().getUser() != null ? saved.getPatient().getUser().getName() : "Patient";
            String msg = String.format("New lab report requested: %s for %s (by Dr. %s)",
                    saved.getTestName(), patientName, doctorName);
            userRepository.findByRoleIgnoreCase("ADMIN").forEach(admin ->
                    notificationService.createNotification(admin.getUserId(), "LAB_REPORT", msg));
        }
        return saved;
    }

    /** Admin updates the result of a pending report */
    @Transactional
    public LabReport updateResult(Integer id, String result, Boolean isAbnormal) {
        LabReport report = getReportById(id);
        report.setResult(result);
        report.setIsAbnormal(isAbnormal != null ? isAbnormal : false);
        LabReport saved = labReportRepository.save(report);

        // Notify the patient
        if (saved.getPatient() != null && saved.getPatient().getUser() != null) {
            String msg = String.format("Your %s lab report result is now available: %s",
                    saved.getTestName(), result);
            notificationService.createNotification(saved.getPatient().getUser().getUserId(), "LAB_REPORT", msg);
        }
        return saved;
    }

    public void deleteReport(Integer id) {
        if (!labReportRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Lab report not found");
        }
        labReportRepository.deleteById(id);
    }
}
