package com.dearlove.mapper;

import com.dearlove.model.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserMapper {
    void insert(User user);

    User findByUsername(@Param("username") String username);
}
