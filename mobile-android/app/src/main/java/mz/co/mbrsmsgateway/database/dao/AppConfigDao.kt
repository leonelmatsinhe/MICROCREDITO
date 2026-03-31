package mz.co.mbrsmsgateway.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import mz.co.mbrsmsgateway.database.entities.AppConfigEntity

@Dao
interface AppConfigDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun save(config: AppConfigEntity)

  @Query("SELECT * FROM app_config WHERE id = 1 LIMIT 1")
  suspend fun getConfig(): AppConfigEntity?

  @Query("SELECT * FROM app_config WHERE id = 1 LIMIT 1")
  fun getConfigSync(): AppConfigEntity?
}
