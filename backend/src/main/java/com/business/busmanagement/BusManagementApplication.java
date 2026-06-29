package com.business.busmanagement;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BusManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(BusManagementApplication.class, args);
    }
}