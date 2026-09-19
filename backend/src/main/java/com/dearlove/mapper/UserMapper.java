package com.dearlove.mapper;

import com.dearlove.model.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;

@Mapper
public interface UserMapper {
    void insert(User user);

    User findByUsername(@Param("username") String username);

    void updatePartner(@Param("username") String username,
                        @Param("partnerUsername") String partnerUsername,
                        @Param("relationshipStartDate") LocalDate relationshipStartDate);

    void clearPartner(@Param("username") String username);
}
