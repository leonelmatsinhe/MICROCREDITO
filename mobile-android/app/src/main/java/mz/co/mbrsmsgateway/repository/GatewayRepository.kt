package mz.co.mbrsmsgateway.repository

import androidx.lifecycle.LiveData
import mz.co.mbrsmsgateway.database.entities.AppConfigEntity
import mz.co.mbrsmsgateway.database.entities.SmsLogEntity
import mz.co.mbrsmsgateway.domain.models.SmsInvoice

interface GatewayRepository {
  suspend fun login(email: String, password: String): Result<Unit>
  suspend fun logout()
  fun hasValidSession(): Boolean
  fun getSavedLoginEmail(): String?
  suspend fun fetchPendingSms(): Result<List<SmsInvoice>>
  suspend fun markAsSent(messageId: String): Result<Unit>
  suspend fun markAsFailed(messageId: String, errorMessage: String?): Result<Unit>
  suspend fun syncDeviceInboxNow(limit: Int = 100): Result<Int>
  suspend fun saveLog(log: SmsLogEntity)
  fun observeLogs(): LiveData<List<SmsLogEntity>>
  suspend fun getDashboardCounts(): Triple<Int, Int, Int>
  suspend fun getConfig(): AppConfigEntity
  suspend fun saveConfig(config: AppConfigEntity)
}
