package com.cts.mfrp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

@Entity
@Table(name = "hospitals")
@Data
public class Hospital {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer hospitalId;
    
    private String hospitalName;
    private String address;
    private String city;
    private String phone;
    private Integer totalBeds;
    private Integer availableBeds;
    
    @JsonIgnore
    @OneToMany(mappedBy = "hospital", cascade = CascadeType.ALL)
    private List<Department> departments;

    @JsonIgnore
    @OneToMany(mappedBy = "hospital", cascade = CascadeType.ALL)
    private List<User> users;

    @JsonIgnore
    @OneToMany(mappedBy = "hospital", cascade = CascadeType.ALL)
    private List<Inventory> inventory;
}
