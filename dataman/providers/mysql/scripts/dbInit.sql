DROP PROCEDURE IF EXISTS _sys_sp_get_row_id;
GO
CREATE PROCEDURE _sys_sp_get_row_id(TableName VARCHAR(60)) NOT DETERMINISTIC
BEGIN
 DECLARE stmt_text VARCHAR(255);
 SET @stmt_text = CONCAT('INSERT INTO `', TableName, '` (fake) VALUES(?)');
 PREPARE stmt FROM @stmt_text;
 SET @a='1';
 EXECUTE stmt USING @a;
 SET @lastId = LAST_INSERT_ID();
 SET @stmt_text=CONCAT('DELETE FROM `', TableName, '` WHERE `Id` = ?');
 PREPARE stmt FROM @stmt_text;
 EXECUTE stmt USING @lastId;
 SELECT @lastId as insertId;
END;
GO
DROP PROCEDURE IF EXISTS _sys_sp_set_row_id;
GO
CREATE PROCEDURE _sys_sp_set_row_id(
  TableName VARCHAR(60),
  RowIdTableName VARCHAR(60), 
  RowIdFieldName VARCHAR(60), 
  MaxRowId INT) NOT DETERMINISTIC
BEGIN
 SET @max_id = MaxRowId;
 IF @max_id IS NULL THEN
 BEGIN
  SET @stmt_text = CONCAT('select coalesce(max(`',RowIdFieldName,'`),0) from `',TableName,'` into @max_id');
  PREPARE stmt FROM @stmt_text;
  EXECUTE stmt;
 END;
 END IF;
 IF @max_id > 0 THEN
 BEGIN
  SET @stmt_text = CONCAT('INSERT INTO `', RowIdTableName, '` (`Id`) VALUES(?)');
  PREPARE stmt FROM @stmt_text;
  EXECUTE stmt USING @max_id;
  SET @stmt_text=CONCAT('DELETE FROM `', RowIdTableName, '` WHERE `Id` = ?');
  PREPARE stmt FROM @stmt_text;
  EXECUTE stmt USING @max_id;
 END;
 END IF;
END;
GO