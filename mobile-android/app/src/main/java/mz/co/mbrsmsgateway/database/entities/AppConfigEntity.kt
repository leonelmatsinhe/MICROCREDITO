package mz.co.mbrsmsgateway.database.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "app_config")
data class AppConfigEntity(
  @PrimaryKey val id: Int = 1,
  val apiBaseUrl: String = "http://192.168.215.135:5000/api/",
  val syncIntervalMinutes: Long = 1L,
  val preferredSubscriptionId: Int = -1
)
