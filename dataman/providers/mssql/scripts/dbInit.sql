
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[_sys_sp_get_row_id]') AND type in (N'P', N'PC'))
DROP PROCEDURE [dbo].[_sys_sp_get_row_id]
GO
create procedure [dbo].[_sys_sp_get_row_id](
  @TableName sysname, 
  @Step int = 1)
as
begin
    set nocount on;
    declare @OuterTranCount int;
    declare @Result int;
    set @OuterTranCount = @@TRANCOUNT;

	if @OuterTranCount > 0
		save transaction SavePoint;
	else
		begin transaction;

	begin try
		declare @InsertCmd nvarchar(255);
		set @InsertCmd = N'insert ' + @TableName + ' with (TABLOCKX) values(null)' +
		' set @output = SCOPE_IDENTITY()';

		exec sp_executesql @InsertCmd ,N'@output int output', @output = @Result output;
		
		while @Step > 1
		begin
			Exec('insert ' + @TableName + ' values(null)');
			set @Step = @Step - 1;
		end;
		SELECT @Result as insertId
	end try
	begin catch
		if @OuterTranCount = 0
			rollback transaction;
		else
			if XACT_STATE() <> -1
				rollback transaction SavePoint;
	            
		declare @ErrorMessage nvarchar(4000);
		declare @ErrorSeverity int;
		declare @ErrorState int;

		set @ErrorMessage = ERROR_MESSAGE();
		set @ErrorSeverity = ERROR_SEVERITY();
		set @ErrorState = ERROR_STATE();

		raiserror(@ErrorMessage, @ErrorSeverity, @ErrorState);
		return -1;
	end catch

	if @OuterTranCount > 0
		rollback transaction SavePoint;
	else
		rollback transaction;

	return 0
end
GO
grant execute on dbo._sys_sp_get_row_id to PUBLIC
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[_sys_sp_set_row_id]') AND type in (N'P', N'PC'))
DROP PROCEDURE [dbo].[_sys_sp_set_row_id]
GO
create procedure [dbo].[_sys_sp_set_row_id](
  @TableName sysname, 
  @RowIdTableName sysname, 
  @RowIdFieldName sysname, 
  @MaxRowId int = NULL)
as
begin
    set nocount on;
    declare @OuterTranCount int;
    set @OuterTranCount = @@TRANCOUNT;

	if @OuterTranCount > 0
		save transaction SavePoint;
	else
		begin transaction;

	begin try
		declare @InsertCmd nvarchar(4000);
		set @InsertCmd = N'if @max_row_id is null begin select @max_row_id=ISNULL(MAX('+
		  @RowIdFieldName+ N'), 0) from '+ @TableName+ N' end if @max_row_id > 0 begin SET IDENTITY_INSERT '+
		  @RowIdTableName+ N' ON insert '+ @RowIdTableName + ' with (TABLOCKX) (Id) values(@max_row_id) SET IDENTITY_INSERT '+
		  @RowIdTableName+ N' OFF end';

		exec sp_executesql @InsertCmd ,N'@max_row_id int', @max_row_id = @MaxRowId;
		
	end try
	begin catch
		if @OuterTranCount = 0
			rollback transaction;
		else
			if XACT_STATE() <> -1
				rollback transaction SavePoint;
	            
		declare @ErrorMessage nvarchar(4000);
		declare @ErrorSeverity int;
		declare @ErrorState int;

		set @ErrorMessage = ERROR_MESSAGE();
		set @ErrorSeverity = ERROR_SEVERITY();
		set @ErrorState = ERROR_STATE();

		raiserror(@ErrorMessage, @ErrorSeverity, @ErrorState);
		return -1;
	end catch

	if @OuterTranCount > 0
		rollback transaction SavePoint;
	else
		rollback transaction;

	return 0
end
GO
grant execute on dbo._sys_sp_set_row_id to PUBLIC
GO