package com.vitacare.vitacare.Security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Component
public class DoctorInvitations {
    private final Map<String, byte[]> codes = new HashMap<>();

    public DoctorInvitations(@Value("${VITACARE_DOCTOR_INVITES:}") String configuration) {
        if (configuration.isBlank()) {
            return;
        }
        for (String invitation : configuration.split(";")) {
            String[] entry = invitation.split("=", 2);
            if (entry.length != 2 || !entry[0].contains("@") || !entry[1].matches("[A-Za-z0-9_-]{32,128}")) {
                throw new IllegalArgumentException("Invalid VITACARE_DOCTOR_INVITES entry");
            }
            if (codes.putIfAbsent(normalizeEmail(entry[0]), entry[1].getBytes(StandardCharsets.UTF_8)) != null) {
                throw new IllegalArgumentException("Duplicate email in VITACARE_DOCTOR_INVITES");
            }
        }
    }

    public static String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    public boolean matches(String email, String code) {
        byte[] expected = codes.get(normalizeEmail(email));
        return expected != null && code != null
                && MessageDigest.isEqual(expected, code.getBytes(StandardCharsets.UTF_8));
    }
}
