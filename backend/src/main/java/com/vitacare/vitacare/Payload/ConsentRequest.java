package com.vitacare.vitacare.Payload;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ConsentRequest {
    private boolean consentGranted;
    private String version;
}
