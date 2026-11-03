package com.example.cinema.common.persistence;

import org.hibernate.type.descriptor.jdbc.IntegerJdbcType;
import java.sql.Types;

/**
 * MySQL SMALLINT UNSIGNED needs getInt/setInt: getShort/setShort cannot represent 32768–65535.
 * Keep the SMALLINT SQL type code for schema validation; inherit the integer binder/extractor.
 */
public class UnsignedSmallIntJdbcType extends IntegerJdbcType {
    @Override
    public int getJdbcTypeCode() {
        return Types.SMALLINT;
    }
}
