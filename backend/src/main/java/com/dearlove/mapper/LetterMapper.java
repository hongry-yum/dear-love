package com.dearlove.mapper;

import com.dearlove.model.Letter;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface LetterMapper {
    void insert(Letter letter);

    List<Letter> findRecent(@Param("limit") int limit);

    Letter findById(@Param("id") String id);

    int deleteByIdAndOwnerToken(@Param("id") String id, @Param("ownerToken") String ownerToken);

    int deleteByIdAndUsername(@Param("id") String id, @Param("username") String username);

    int markReadIfUnread(@Param("id") String id, @Param("username") String username);
}
