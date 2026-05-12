package com.cts.mfrp.service;

import com.cts.mfrp.entity.Bill;
import com.cts.mfrp.repository.BillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BillingService {

    private final BillRepository billRepository;
    private final NotificationService notificationService;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    /**
     * Finds all PENDING bills whose due date has passed and marks them OVERDUE.
     * Bills with no dueDate use billDate + 30 days as the effective due date.
     * PAID bills are never touched.
     *
     * @return number of bills updated to OVERDUE
     */
    @Transactional
    public int markOverdueBills() {
        LocalDate today = LocalDate.now();
        int count = 0;

        // Bills with an explicit dueDate that has passed
        List<Bill> explicitOverdue = billRepository
                .findByStatusAndDueDateIsNotNullAndDueDateBefore("PENDING", today);

        for (Bill bill : explicitOverdue) {
            bill.setStatus("OVERDUE");
            billRepository.save(bill);
            count++;
            log.info("Marked bill {} as OVERDUE (dueDate={})", bill.getId(), bill.getDueDate());
        }

        // Bills with null dueDate — fall back to billDate + 30 days
        List<Bill> noDatePending = billRepository.findByStatus("PENDING").stream()
                .filter(b -> b.getDueDate() == null
                        && b.getBillDate() != null
                        && b.getBillDate().plusDays(7).isBefore(today))
                .toList();

        for (Bill bill : noDatePending) {
            LocalDate effective = bill.getBillDate().plusDays(7);
            bill.setDueDate(effective);
            bill.setStatus("OVERDUE");
            billRepository.save(bill);
            count++;
            log.info("Marked bill {} as OVERDUE (effectiveDue={})", bill.getId(), effective);
        }

        return count;
    }

    /**
     * Creates a persistent in-app notification for each patient with a PENDING bill.
     * Message includes Bill ID, Amount Due, and Due Date.
     * Safe to call repeatedly — it does not deduplicate, so callers should rate-limit.
     */
    @Transactional
    public void notifyPendingBills() {
        List<Bill> pending = billRepository.findByStatus("PENDING");

        for (Bill bill : pending) {
            if (bill.getPatient() == null || bill.getPatient().getUser() == null) continue;

            Integer userId = bill.getPatient().getUser().getUserId();
            LocalDate due = bill.getDueDate() != null
                    ? bill.getDueDate()
                    : (bill.getBillDate() != null ? bill.getBillDate().plusDays(7) : null);

            String dueStr = due != null ? due.format(DATE_FMT) : "N/A";
            String message = String.format(
                    "Payment Reminder — Bill #%d | Amount Due: ₹%s | Due Date: %s. " +
                    "Please clear your dues to avoid overdue charges.",
                    bill.getId(),
                    bill.getAmount().toPlainString(),
                    dueStr
            );

            try {
                notificationService.createNotification(userId, "BILLING", message);
            } catch (Exception e) {
                log.warn("Could not notify user {} for bill {}: {}", userId, bill.getId(), e.getMessage());
            }
        }
    }

    /**
     * Runs both overdue marking and pending notifications in sequence.
     * Returns the count of bills newly marked OVERDUE.
     */
    @Transactional
    public int processAll() {
        int overdue = markOverdueBills();
        notifyPendingBills();
        return overdue;
    }
}
