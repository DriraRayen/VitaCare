package com.vitacare.vitacare.Service;

import com.vitacare.vitacare.Model.User;
import com.vitacare.vitacare.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final boolean demoDoctorEnabled;

    public CustomUserDetailsService(UserRepository userRepository,
            @Value("${VITACARE_ENABLE_DEMO_DOCTOR:false}") boolean demoDoctorEnabled) {
        this.userRepository = userRepository;
        this.demoDoctorEnabled = demoDoctorEnabled;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
        if (!demoDoctorEnabled && user.getRole() == User.Role.ROLE_DOCTOR
                && User.DEMO_DOCTOR_EMAIL.equalsIgnoreCase(user.getEmail())) {
            throw new UsernameNotFoundException("Demo doctor login is disabled");
        }

        String password = user.getPassword() != null ? user.getPassword() : "N/A"; // dummy password for OAuth users

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),      // must NOT be null
                password,             // real or dummy password
                true,                 // enabled
                true,                 // accountNonExpired
                true,                 // credentialsNonExpired
                true,                 // accountNonLocked
                List.of(new SimpleGrantedAuthority(user.getRole() != null ? user.getRole().name() : "ROLE_PATIENT")) // authorities/roles
        );
    }

}
