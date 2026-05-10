package com.cts.mfrp.controller;

import com.cts.mfrp.entity.Notification;
import com.cts.mfrp.entity.User;
import com.cts.mfrp.repository.UserRepository;
import com.cts.mfrp.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Notification>> getNotificationsByUser(@PathVariable Integer userId) {
        verifyOwnership(userId);
        return ResponseEntity.ok(notificationService.getNotificationsByUser(userId));
    }

    @GetMapping("/user/{userId}/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(@PathVariable Integer userId) {
        verifyOwnership(userId);
        return ResponseEntity.ok(notificationService.getUnreadNotifications(userId));
    }

    @PostMapping
    public ResponseEntity<Notification> createNotification(@RequestBody Notification notification) {
        return ResponseEntity.ok(notificationService.saveNotification(notification));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Integer id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User caller = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        Notification notif = notificationService.getById(id);
        boolean isAdmin = "ADMIN".equalsIgnoreCase(caller.getRole());
        if (!notif.getUser().getUserId().equals(caller.getUserId()) && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot mark another user's notification as read");
        }
        notificationService.markAsRead(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/read-all/{userId}")
    public ResponseEntity<Void> markAllAsRead(@PathVariable Integer userId) {
        verifyOwnership(userId);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Notification> updateNotification(@PathVariable Integer id, @RequestBody Notification notification) {
        notification.setNotificationId(id);
        return ResponseEntity.ok(notificationService.saveNotification(notification));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Integer id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }

    private void verifyOwnership(Integer targetUserId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User caller = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        boolean isAdmin = "ADMIN".equalsIgnoreCase(caller.getRole());
        if (!caller.getUserId().equals(targetUserId) && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot access another user's notifications");
        }
    }
}
