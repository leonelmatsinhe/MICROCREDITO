package mz.co.mbrsmsgateway.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import mz.co.mbrsmsgateway.database.dao.AppConfigDao
import mz.co.mbrsmsgateway.database.dao.SmsLogDao
import mz.co.mbrsmsgateway.database.entities.AppConfigEntity
import mz.co.mbrsmsgateway.database.entities.SmsLogEntity

@Database(
  entities = [SmsLogEntity::class, AppConfigEntity::class],
  version = 2,
  exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
  abstract fun smsLogDao(): SmsLogDao
  abstract fun appConfigDao(): AppConfigDao

  companion object {
    @Volatile
    private var instance: AppDatabase? = null

    fun getInstance(context: Context): AppDatabase =
      instance ?: synchronized(this) {
        instance ?: Room.databaseBuilder(
          context.applicationContext,
          AppDatabase::class.java,
          "sms_gateway_db"
        )
          .fallbackToDestructiveMigration()
          .allowMainThreadQueries()
          .build()
          .also { instance = it }
      }
  }
}
