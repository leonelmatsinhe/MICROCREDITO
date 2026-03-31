package mz.co.mbrsmsgateway.database.dao

import androidx.lifecycle.LiveData
import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import mz.co.mbrsmsgateway.database.entities.SmsLogEntity

@Dao
interface SmsLogDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insert(log: SmsLogEntity)

  @Query("SELECT * FROM sms_logs ORDER BY createdAtMillis DESC")
  fun observeLogs(): LiveData<List<SmsLogEntity>>

  @Query("SELECT COUNT(*) FROM sms_logs WHERE status = :status AND createdAtMillis >= :fromMillis")
  suspend fun countByStatusSince(status: String, fromMillis: Long): Int

  @Query("SELECT COUNT(*) FROM sms_logs WHERE status = :status")
  suspend fun countByStatus(status: String): Int
}
