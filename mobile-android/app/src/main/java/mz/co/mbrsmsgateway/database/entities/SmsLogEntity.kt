package mz.co.mbrsmsgateway.database.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sms_logs")
data class SmsLogEntity(
  @PrimaryKey(autoGenerate = true) val id: Long = 0,
  val messageId: String,
  val messageType: String = "invoice_notice",
  val invoiceId: String? = null,
  val invoiceNumber: String,
  val customerName: String,
  val phone: String,
  val message: String,
  val status: String,
  val error: String? = null,
  val retries: Int = 0,
  val createdAtMillis: Long = System.currentTimeMillis()
)
