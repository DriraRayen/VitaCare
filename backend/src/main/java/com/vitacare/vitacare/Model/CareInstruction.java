package com.vitacare.vitacare.Model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class CareInstruction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private CareConnection connection;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(length = 2000)
    private String details;

    private LocalDate dueDate;
    private boolean done;
}
