package com.vitacare.vitacare.Controller;

import com.vitacare.vitacare.Model.AiConsent;
import com.vitacare.vitacare.Model.User;
import com.vitacare.vitacare.Payload.ConsentRequest;
import com.vitacare.vitacare.Repository.AiConsentRepository;
import com.vitacare.vitacare.Repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/masar/consent")
@CrossOrigin(origins = "http://localhost:3000", exposedHeaders = {"Authorization", "Content-Disposition"})
public class ConsentController {

    private final AiConsentRepository aiConsentRepository;
    private final UserRepository userRepository;

    public ConsentController(AiConsentRepository aiConsentRepository, UserRepository userRepository) {
        this.aiConsentRepository = aiConsentRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getConsentStatus(Authentication authentication) {
        Optional<AiConsent> consent = aiConsentRepository.findTopByUserEmailAndRevokedFalseOrderByConsentDateDesc(authentication.getName());
        boolean hasConsent = consent.isPresent();
        return ResponseEntity.ok(Map.of(
                "hasConsent", hasConsent,
                "version", hasConsent ? consent.get().getVersion() : "1.0",
                "consentDate", hasConsent ? consent.get().getConsentDate() : ""
        ));
    }

    @PostMapping
    public ResponseEntity<?> recordConsent(Authentication authentication, @RequestBody ConsentRequest request) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (!request.isConsentGranted()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Le consentement doit être accordé"));
        }

        AiConsent consent = AiConsent.builder()
                .user(user)
                .consentDate(LocalDateTime.now())
                .version(request.getVersion() != null ? request.getVersion() : "1.0")
                .revoked(false)
                .build();

        aiConsentRepository.save(consent);
        return ResponseEntity.ok(Map.of(
                "message", "Consentement enregistré avec succès",
                "hasConsent", true
        ));
    }
}
