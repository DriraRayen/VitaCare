package com.vitacare.vitacare.Payload;

import com.vitacare.vitacare.Model.User;
import jakarta.validation.constraints.Size;

public class SignupRequest extends LoginRequest {
    private User.Role role;

    @Size(max = 128)
    private String doctorInvitation;

    public User.Role getRole() { return role; }
    public void setRole(User.Role role) { this.role = role; }
    public String getDoctorInvitation() { return doctorInvitation; }
    public void setDoctorInvitation(String doctorInvitation) { this.doctorInvitation = doctorInvitation; }
}
