package com.vitacare.vitacare.Security;

import com.vitacare.vitacare.Controller.AuthController;
import com.vitacare.vitacare.Model.User;
import com.vitacare.vitacare.Payload.SignupRequest;
import com.vitacare.vitacare.Repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.BeanPropertyBindingResult;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

class DoctorSignupTest {
    private static final String EMAIL = "doctor@example.test";
    private static final String CODE = "example_test_code_123456789abcdef";
    private final UserRepository users = mock(UserRepository.class);
    private final JwtUtil jwt = mock(JwtUtil.class);
    private final AuthController auth = new AuthController(users, mock(PasswordEncoder.class),
            mock(AuthenticationManager.class), jwt, new DoctorInvitations(EMAIL + "=" + CODE));

    @Test
    void rejectsBothDoctorRolesWithoutAnInvitationForTheRequestedEmail() {
        for (var role : new User.Role[]{User.Role.ROLE_DOCTOR, User.Role.ROLE_CARE_DOCTOR}) {
            assertEquals(HttpStatus.FORBIDDEN, signup(EMAIL, role, null));
            assertEquals(HttpStatus.FORBIDDEN, signup("other@example.test", role, CODE));
        }
        verifyNoInteractions(users);
    }

    @Test
    void registersOnlyTheScopedDoctorRoleWithAValidInvitation() {
        assertEquals(HttpStatus.OK, signup("Doctor@Example.Test", User.Role.ROLE_DOCTOR, CODE));
        verify(users).save(argThat(user -> EMAIL.equals(user.getEmail())
                && EMAIL.equals(user.getDoctorRegistrationEmail())
                && user.getRole() == User.Role.ROLE_CARE_DOCTOR));
    }

    @Test
    void previouslyUsedInvitationIsRejected() {
        when(users.existsByDoctorRegistrationEmail(EMAIL)).thenReturn(true);
        assertEquals(HttpStatus.FORBIDDEN, signup(EMAIL, User.Role.ROLE_CARE_DOCTOR, CODE));
        verify(users, never()).save(any());
    }

    @Test
    void patientSignupDoesNotRequireAnInvitation() {
        assertEquals(HttpStatus.OK, signup("patient@example.test", User.Role.ROLE_PATIENT, null));
        verify(users).save(argThat(user -> user.getRole() == User.Role.ROLE_PATIENT
                && user.getDoctorRegistrationEmail() == null));
    }

    private HttpStatusCode signup(String email, User.Role role, String code) {
        when(jwt.generateToken(anyString())).thenReturn("test-token");
        SignupRequest request = new SignupRequest();
        request.setEmail(email);
        request.setPassword("test-password");
        request.setRole(role);
        request.setDoctorInvitation(code);
        return auth.signup(request, new BeanPropertyBindingResult(request, "signup")).getStatusCode();
    }
}
