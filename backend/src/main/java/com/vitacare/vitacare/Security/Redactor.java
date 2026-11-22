package com.vitacare.vitacare.Security;

import com.vitacare.vitacare.Model.User;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Redactor {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+",
            Pattern.CASE_INSENSITIVE
    );

    // Phone pattern (e.g. +216 98 123 456, 06 12 34 56 78, 22 123 456)
    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(?:(?:\\+|00)\\d{1,3}[\\s.-]?)?(?:\\(?\\d{1,4}\\)?[\\s.-]?)?\\d{2,4}[\\s.-]?\\d{2,4}[\\s.-]?\\d{2,4}(?:[\\s.-]?\\d{2,4})?"
    );

    // CIN / National ID: 8 digits or preceded by CIN/ID
    private static final Pattern CIN_EXPLICIT_PATTERN = Pattern.compile(
            "(?i)\\b(?:cin|c\\.i\\.n|carte d['’]identit[ée]|matricule|n° identité|id)\\s*[:#\\-]?\\s*([0-9]{6,12})\\b"
    );

    // Address pattern (French / standard street names)
    private static final Pattern ADDRESS_PATTERN = Pattern.compile(
            "(?i)\\b(?:\\d{1,4}\\s+(?:rue|avenue|boulevard|bd|av\\.?|impasse|all[ée]e|route|chemin)\\s+[^,\\n\\r]+|(?:adresse|domicile)\\s*[:\\-]\\s*[^,\\n\\r]+)"
    );

    // Patient header pattern in lab reports (e.g. "Patient: Jean Dupont", "Nom : Ben Ali Mohamed")
    private static final Pattern PATIENT_HEADER_PATTERN = Pattern.compile(
            "(?i)\\b(?:patient(?:e)?|nom(?:\\s*et\\s*pr[ée]nom)?|mr\\.?|mme\\.?|m\\.)\\s*[:\\-]\\s*([A-Za-zÀ-ÿ\\s]{3,35})(?=[,\\n\\r]|$)"
    );

    public static String redact(String text, User profile) {
        if (text == null || text.isBlank()) {
            return text;
        }

        String result = text;

        // 1. Redact specific profile information if present
        if (profile != null) {
            if (profile.getEmail() != null && !profile.getEmail().isBlank()) {
                result = result.replaceAll("(?i)" + Pattern.quote(profile.getEmail()), "[EMAIL]");
            }
            if (profile.getPhoneNumber() != null && !profile.getPhoneNumber().isBlank()) {
                result = result.replaceAll("(?i)" + Pattern.quote(profile.getPhoneNumber().trim()), "[PHONE]");
            }
            if (profile.getFirstName() != null && profile.getFirstName().trim().length() > 1) {
                result = result.replaceAll("(?i)\\b" + Pattern.quote(profile.getFirstName().trim()) + "\\b", "[PATIENT_NAME]");
            }
            if (profile.getLastName() != null && profile.getLastName().trim().length() > 1) {
                result = result.replaceAll("(?i)\\b" + Pattern.quote(profile.getLastName().trim()) + "\\b", "[PATIENT_NAME]");
            }
        }

        // 2. Redact email addresses
        result = EMAIL_PATTERN.matcher(result).replaceAll("[EMAIL]");

        // 3. Redact explicit CIN / National IDs
        Matcher cinMatcher = CIN_EXPLICIT_PATTERN.matcher(result);
        StringBuffer cinBuffer = new StringBuffer();
        while (cinMatcher.find()) {
            cinMatcher.appendReplacement(cinBuffer, "CIN : [ID_CIN]");
        }
        cinMatcher.appendTail(cinBuffer);
        result = cinBuffer.toString();

        // 4. Redact Addresses
        result = ADDRESS_PATTERN.matcher(result).replaceAll("[ADDRESS]");

        // 5. Redact Patient name headers in documents
        Matcher patientMatcher = PATIENT_HEADER_PATTERN.matcher(result);
        StringBuffer patientBuffer = new StringBuffer();
        while (patientMatcher.find()) {
            patientMatcher.appendReplacement(patientBuffer, "Patient : [PATIENT_NAME]");
        }
        patientMatcher.appendTail(patientBuffer);
        result = patientBuffer.toString();

        // 6. Redact phone numbers (with length guard so lab values like 120/80 or test dates aren't stripped)
        Matcher phoneMatcher = PHONE_PATTERN.matcher(result);
        StringBuffer phoneBuffer = new StringBuffer();
        while (phoneMatcher.find()) {
            String match = phoneMatcher.group();
            String digitsOnly = match.replaceAll("\\D", "");
            // Only redact if at least 8 digits (standard phone number) and contains formatting or international prefix
            if (digitsOnly.length() >= 8 && digitsOnly.length() <= 15) {
                // Avoid replacing dates like 2026-11-22
                if (!match.contains("-") || digitsOnly.length() > 8) {
                    phoneMatcher.appendReplacement(phoneBuffer, "[PHONE]");
                    continue;
                }
            }
            phoneMatcher.appendReplacement(phoneBuffer, Matcher.quoteReplacement(match));
        }
        phoneMatcher.appendTail(phoneBuffer);
        result = phoneBuffer.toString();

        return result;
    }
}
