package com.healthcare.service;

import com.healthcare.model.Notification;
import com.healthcare.model.User;
import com.healthcare.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.format.DateTimeFormatter;
import java.time.LocalDate;
import java.time.LocalTime;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public NotificationService(NotificationRepository notificationRepository, JavaMailSender mailSender) {
        this.notificationRepository = notificationRepository;
        this.mailSender = mailSender;
    }

    public void sendNotification(User user, String message) {
        // 1. Save in-app notification
        Notification notification = new Notification(user, message);
        notificationRepository.save(notification);

        // 2. Send email
        sendEmail(user.getEmail(), "New Notification from HealthCare Platform", message);
    }

    public void sendAppointmentUpdateNotification(User patient, User doctor, LocalDate date, LocalTime time, boolean isNewAssignment) {
        String dateStr = date.format(DateTimeFormatter.ofPattern("MMM dd, yyyy"));
        String timeStr = time.format(DateTimeFormatter.ofPattern("hh:mm a"));
        
        String action = isNewAssignment ? "assigned a time for" : "rescheduled";
        String message = String.format("Dr. %s has %s your appointment. Your new slot is %s at %s.", 
                                       doctor.getName(), action, dateStr, timeStr);
        
        // 1. Save in-app notification
        Notification notification = new Notification(patient, message);
        notificationRepository.save(notification);

        // 2. Send email
        String emailHtml = """
            <!DOCTYPE html>
            <html>
            <body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f0f4f8;padding:40px 20px;">
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;margin:0 auto;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#0f172a 0%%,#1e3a8a 100%%);padding:32px 40px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                                Health<span style="color:#38bdf8;">Care</span>
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px;">
                            <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Appointment Update</h2>
                            <p style="color:#64748b;font-size:15px;line-height:1.6;">Hello %s,</p>
                            <p style="color:#64748b;font-size:15px;line-height:1.6;">%s</p>
                            <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:16px;text-align:center;margin:24px 0;">
                                <span style="font-size:18px;font-weight:600;color:#1a56db;">%s at %s</span>
                            </div>
                            <p style="color:#64748b;font-size:15px;line-height:1.6;">Please log in to your dashboard to view your updated appointment details.</p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        """.formatted(patient.getName(), message, dateStr, timeStr);

        sendEmail(patient.getEmail(), "Appointment Update - HealthCare Platform", emailHtml);
    }

    private void sendEmail(String toEmail, String subject, String content) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            
            // Determine if content is HTML
            boolean isHtml = content.trim().toLowerCase().startsWith("<!doctype html>") || 
                             content.trim().toLowerCase().startsWith("<html>");
            
            helper.setText(content, isHtml);
            mailSender.send(mimeMessage);
        } catch (MessagingException e) {
            System.err.println("Failed to send notification email: " + e.getMessage());
        }
    }
}
