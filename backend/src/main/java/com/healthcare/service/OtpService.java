package com.healthcare.service;

import com.healthcare.model.OtpToken;
import com.healthcare.repository.OtpTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
public class OtpService {

    private final OtpTokenRepository otpTokenRepository;
    private final JavaMailSender mailSender;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${otp.expiry.minutes:5}")
    private int otpExpiryMinutes;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public OtpService(OtpTokenRepository otpTokenRepository, JavaMailSender mailSender) {
        this.otpTokenRepository = otpTokenRepository;
        this.mailSender = mailSender;
    }

    public void generateAndSendOtp(String email) {
        // Delete any existing OTPs for this email
        otpTokenRepository.deleteByEmail(email);

        // Generate 6-digit OTP
        String otp = String.format("%06d", secureRandom.nextInt(1000000));

        // Save OTP token
        OtpToken otpToken = new OtpToken(email, otp, LocalDateTime.now().plusMinutes(otpExpiryMinutes));
        otpTokenRepository.save(otpToken);

        // Send email
        sendOtpEmail(email, otp);
    }

    public boolean verifyOtp(String email, String otp) {
        var otpTokenOpt = otpTokenRepository.findTopByEmailAndVerifiedFalseOrderByCreatedAtDesc(email);

        if (otpTokenOpt.isEmpty()) {
            return false;
        }

        OtpToken otpToken = otpTokenOpt.get();

        if (otpToken.isExpired()) {
            return false;
        }

        if (!otpToken.getOtp().equals(otp)) {
            return false;
        }

        // Mark as verified
        otpToken.setVerified(true);
        otpTokenRepository.save(otpToken);
        return true;
    }

    public boolean isEmailVerified(String email) {
        return otpTokenRepository.findTopByEmailAndVerifiedTrueOrderByCreatedAtDesc(email).isPresent();
    }

    public void cleanupOtps(String email) {
        otpTokenRepository.deleteByEmail(email);
    }

    private void sendOtpEmail(String email, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("HealthCare Platform - Email Verification Code");
            helper.setText(buildEmailTemplate(otp), true);

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send OTP email: " + e.getMessage(), e);
        }
    }

    private String buildEmailTemplate(String otp) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">
                                <!-- Header -->
                                <tr>
                                    <td style="background:linear-gradient(135deg,#0f172a 0%%,#1e3a8a 100%%);padding:32px 40px;text-align:center;">
                                        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                                            Health<span style="color:#38bdf8;">Care</span>
                                        </h1>
                                        <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">Smart Healthcare Platform</p>
                                    </td>
                                </tr>
                                <!-- Body -->
                                <tr>
                                    <td style="padding:40px;">
                                        <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:600;">Verify Your Email</h2>
                                        <p style="margin:0 0 28px;color:#64748b;font-size:15px;line-height:1.6;">
                                            Use the verification code below to complete your registration. This code expires in <strong>%d minutes</strong>.
                                        </p>
                                        <!-- OTP Code -->
                                        <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                                            <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1a56db;font-family:'Courier New',monospace;">%s</span>
                                        </div>
                                        <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                                            If you didn't request this code, you can safely ignore this email. Someone may have entered your email address by mistake.
                                        </p>
                                    </td>
                                </tr>
                                <!-- Footer -->
                                <tr>
                                    <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                                        <p style="margin:0;color:#94a3b8;font-size:12px;">
                                            &copy; 2024 HealthCare Platform. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(otpExpiryMinutes, otp);
    }

    public void sendVideoCallInvite(String toEmail, String roomId, String doctorName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Telemedicine Consultation Invite - " + doctorName);
            
            String emailContent = """
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
                                <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Telemedicine Consultation</h2>
                                <p style="color:#64748b;font-size:15px;line-height:1.6;"><strong>%s</strong> has invited you to a secure video consultation.</p>
                                <p style="color:#64748b;font-size:15px;line-height:1.6;">Your unique Room ID is:</p>
                                <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:16px;text-align:center;margin:24px 0;">
                                    <span style="font-size:20px;font-weight:700;color:#1a56db;">%s</span>
                                </div>
                                <p style="color:#64748b;font-size:15px;line-height:1.6;">Please log in to the platform, navigate to the Telemedicine section, and enter this Room ID to join the call.</p>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            """.formatted(doctorName, roomId);
            
            helper.setText(emailContent, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send invite email", e);
        }
    }
}
