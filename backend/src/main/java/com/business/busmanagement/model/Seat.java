package com.business.busmanagement.model;

/* ============================================================
 * Bảng: seats
 * Ghế vật lý trên xe: (bus_id, seat_number) là duy nhất.
 * positionX, positionY để render sơ đồ ghế trên FE.
 * Auto-generate bởi TicketController.ensureSeatsExist()
 * ============================================================ */

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "seats", uniqueConstraints = @UniqueConstraint(columnNames = {"bus_id", "seat_number"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bus_id", nullable = false)
    @JsonIgnore
    private Bus bus;

    @Column(name = "seat_number", nullable = false)
    private String seatNumber;

    @Column(name = "position_x")
    private Integer positionX;

    @Column(name = "position_y")
    private Integer positionY;

    @OneToMany(mappedBy = "seat", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Ticket> tickets;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Seat)) return false;
        Seat seat = (Seat) o;
        return id != null && id.equals(seat.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}