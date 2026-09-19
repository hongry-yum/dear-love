package com.dearlove.mapper;

import com.dearlove.model.Session;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SessionMapper {
    void insert(Session session);

    Session findValidByToken(@Param("token") String token);

    void deleteByToken(@Param("token") String token);
}
