package com.vitacare.vitacare.DTO;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShareTokenDTO {
    private String token; // Only present when newly created
    private String shareUrl;
    private LocalDateTime expiresAt;
    private boolean revoked;
}
