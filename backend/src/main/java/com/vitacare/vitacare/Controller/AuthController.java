package com.vitacare.vitacare.Controller;

import com.vitacare.vitacare.Model.User;
import com.vitacare.vitacare.Payload.LoginRequest;
import com.vitacare.vitacare.Payload.SignupRequest;
import com.vitacare.vitacare.Payload.LoginResponse;
import com.vitacare.vitacare.Repository.UserRepository;
import com.vitacare.vitacare.Security.DoctorInvitations;
import com.vitacare.vitacare.Security.JwtUtil;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;



@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "http://localhost:3000", exposedHeaders = {"Authorization", "Content-Disposition"})
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final DoctorInvitations doctorInvitations;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder,
                          AuthenticationManager authenticationManager, JwtUtil jwtUtil,
                          DoctorInvitations doctorInvitations) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.doctorInvitations = doctorInvitations;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            bindingResult.getFieldErrors().forEach(error ->
                    errors.put(error.getField(), error.getDefaultMessage())
            );
            return ResponseEntity.badRequest().body(errors);
        }

        boolean doctor = request.getRole() == User.Role.ROLE_DOCTOR || request.getRole() == User.Role.ROLE_CARE_DOCTOR;
        String email = doctor ? DoctorInvitations.normalizeEmail(request.getEmail()) : request.getEmail();
        try {
            if (doctor && (!doctorInvitations.matches(email, request.getDoctorInvitation())
                    || userRepository.existsByDoctorRegistrationEmail(email))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("code", "DOCTOR_INVITATION_REQUIRED"));
            }
            if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "User already exists!"));
            }

            User user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setProvider(User.AuthProvider.LOCAL);
            if (doctor) {
                user.setRole(User.Role.ROLE_CARE_DOCTOR);
                user.setDoctorRegistrationEmail(email);
            }
            userRepository.save(user);

            String token = jwtUtil.generateToken(user.getEmail());
            return ResponseEntity.ok(Map.of(
                    "message", "User registered successfully!",
                    "token", token
            ));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Registration conflicts with an existing account"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Registration failed"));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            bindingResult.getFieldErrors().forEach(error ->
                    errors.put(error.getField(), error.getDefaultMessage())
            );
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
            String token = jwtUtil.generateToken(request.getEmail());
            return ResponseEntity.ok(new LoginResponse(token));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid credentials"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Login failed: " + e.getMessage()));
        }
    }

    @GetMapping("/oauth2/redirect")
    public ResponseEntity<?> oauth2Redirect(@RequestParam(required = false) String token,
                                            @RequestParam(required = false) String error) {
        if (error != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "OAuth2 authentication failed: " + error));
        }

        if (token != null) {
            return ResponseEntity.ok(new LoginResponse(token));
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "No token or error provided"));
    }
}
