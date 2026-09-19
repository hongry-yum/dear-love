package com.dearlove;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.dearlove.mapper")
public class DearLoveApplication {
    public static void main(String[] args) {
        SpringApplication.run(DearLoveApplication.class, args);
    }
}
