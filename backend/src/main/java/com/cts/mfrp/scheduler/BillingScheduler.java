package com.cts.mfrp.scheduler;

import com.cts.mfrp.service.BillingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BillingScheduler {

    private final BillingService billingService;

    /** Runs every day at midnight to flip PENDING → OVERDUE where the due date has passed. */
    @Scheduled(cron = "0 0 0 * * *")
    public void runDailyOverdueCheck() {
        log.info("BillingScheduler: running daily overdue check");
        int updated = billingService.markOverdueBills();
        log.info("BillingScheduler: {} bill(s) marked OVERDUE", updated);
    }

    /**
     * Runs every day at 9 AM — notifies every patient who has a PENDING bill.
     * Runs after the midnight overdue check so newly-overdue bills are already
     * excluded (their status is OVERDUE by this point, not PENDING).
     */
    @Scheduled(cron = "0 0 9 * * *")
    public void runDailyPendingNotifications() {
        log.info("BillingScheduler: sending daily pending-bill notifications");
        billingService.notifyPendingBills();
        log.info("BillingScheduler: pending-bill notifications sent");
    }
}
