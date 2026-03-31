package mz.co.mbrsmsgateway.data

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.Settings
import android.provider.Telephony
import androidx.core.content.ContextCompat
import androidx.lifecycle.LiveData
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mz.co.mbrsmsgateway.database.AppDatabase
import mz.co.mbrsmsgateway.database.entities.AppConfigEntity
import mz.co.mbrsmsgateway.database.entities.SmsLogEntity
import mz.co.mbrsmsgateway.domain.models.SmsInvoice
import mz.co.mbrsmsgateway.network.ApiClient
import mz.co.mbrsmsgateway.network.LoginRequest
import mz.co.mbrsmsgateway.network.DeviceInboxMessageRequest
import mz.co.mbrsmsgateway.network.SyncInboxRequest
import mz.co.mbrsmsgateway.network.TokenStore
import mz.co.mbrsmsgateway.network.UpdateSmsStatusRequest
import mz.co.mbrsmsgateway.repository.GatewayRepository
import java.time.Instant

class GatewayRepositoryImpl(
  context: Context
) : GatewayRepository {
  private val appContext = context.applicationContext
  private val db = AppDatabase.getInstance(appContext)
  private val tokenStore = TokenStore(appContext)

  override suspend fun login(email: String, password: String): Result<Unit> = withContext(Dispatchers.IO) {
    runCatching {
      val response = ApiClient.getInstance(appContext).service().login(LoginRequest(email, password))
      val legacyUser = response.result?.firstOrNull()

      val token = response.token ?: legacyUser?.token
      if (token.isNullOrBlank()) {
        val message = response.message ?: "Resposta de login inválida: token ausente."
        error(message)
      }

      val tenantId = response.user?.tenant_id
        ?: legacyUser?.companyId?.toString()
        ?: "legacy-tenant"
      val fullName = response.user?.full_name
        ?: legacyUser?.name
        ?: ""
      val userEmail = response.user?.email
        ?: legacyUser?.email
        ?: email
      val role = response.user?.role
        ?: legacyUser?.userRole?.toString()
        ?: ""

      tokenStore.saveSession(
        token = token,
        tenantId = tenantId,
        fullName = fullName,
        email = userEmail,
        role = role
      )
    }
  }

  override suspend fun logout() {
    withContext(Dispatchers.IO) {
      tokenStore.clearSession()
    }
  }

  override fun hasValidSession(): Boolean = tokenStore.hasValidSession()
  override fun getSavedLoginEmail(): String? = tokenStore.getSavedEmail()

  override suspend fun fetchPendingSms(): Result<List<SmsInvoice>> = withContext(Dispatchers.IO) {
    runCatching {
      if (!tokenStore.hasValidSession()) {
        error("Sessão inválida. Faça login novamente.")
      }
      val response = ApiClient.getInstance(appContext).service().getPendingSms(limit = 100)
      response.data.map {
        SmsInvoice(
          messageId = it.id,
          messageType = it.message_type,
          invoiceId = it.invoice_id,
          invoiceNumber = it.payload_json?.get("invoice_number")?.toString() ?: it.invoice_id,
          customerName = it.customer_name,
          phone = it.phone,
          smsText = it.message_body
        )
      }
    }
  }

  override suspend fun markAsSent(messageId: String): Result<Unit> = withContext(Dispatchers.IO) {
    runCatching {
      ApiClient.getInstance(appContext).service()
        .updateSmsStatus(messageId, UpdateSmsStatusRequest(status = "sent"))
    }
  }

  override suspend fun markAsFailed(messageId: String, errorMessage: String?): Result<Unit> =
    withContext(Dispatchers.IO) {
      runCatching {
        ApiClient.getInstance(appContext).service()
          .updateSmsStatus(
            messageId,
            UpdateSmsStatusRequest(
              status = "failed",
              error_message = errorMessage?.take(255)
            )
          )
      }
    }

  override suspend fun syncDeviceInboxNow(limit: Int): Result<Int> = withContext(Dispatchers.IO) {
    runCatching {
      if (!tokenStore.hasValidSession()) {
        error("Sessão inválida. Faça login novamente.")
      }
      val allowed = ContextCompat.checkSelfPermission(
        appContext,
        Manifest.permission.READ_SMS
      ) == PackageManager.PERMISSION_GRANTED
      if (!allowed) {
        error("Permissão READ_SMS não concedida.")
      }

      val resolver = appContext.contentResolver
      val projection = arrayOf(
        Telephony.Sms.Inbox.ADDRESS,
        Telephony.Sms.Inbox.BODY,
        Telephony.Sms.Inbox.DATE,
        Telephony.Sms.Inbox.SERVICE_CENTER
      )
      val messages = mutableListOf<DeviceInboxMessageRequest>()
      resolver.query(
        Telephony.Sms.Inbox.CONTENT_URI,
        projection,
        null,
        null,
        "${Telephony.Sms.Inbox.DATE} DESC"
      )?.use { cursor ->
        val addressIdx = cursor.getColumnIndex(Telephony.Sms.Inbox.ADDRESS)
        val bodyIdx = cursor.getColumnIndex(Telephony.Sms.Inbox.BODY)
        val dateIdx = cursor.getColumnIndex(Telephony.Sms.Inbox.DATE)
        val scIdx = cursor.getColumnIndex(Telephony.Sms.Inbox.SERVICE_CENTER)

        while (cursor.moveToNext() && messages.size < limit.coerceAtLeast(1)) {
          val body = if (bodyIdx >= 0) cursor.getString(bodyIdx) ?: "" else ""
          if (body.trim().isEmpty()) continue
          val dateMillis = if (dateIdx >= 0) cursor.getLong(dateIdx) else System.currentTimeMillis()
          val receivedAt = Instant.ofEpochMilli(dateMillis).toString()
          messages.add(
            DeviceInboxMessageRequest(
              sender_phone = if (addressIdx >= 0) cursor.getString(addressIdx) else null,
              receiver_phone = if (scIdx >= 0) cursor.getString(scIdx) else null,
              message_body = body,
              received_at = receivedAt
            )
          )
        }
      }

      if (messages.isEmpty()) {
        0
      } else {
        val deviceId = Settings.Secure.getString(
          appContext.contentResolver,
          Settings.Secure.ANDROID_ID
        ) ?: "android-device"
        val response = ApiClient.getInstance(appContext).service().syncInbox(
          SyncInboxRequest(
            device_id = deviceId,
            messages = messages
          )
        )
        response.inserted_count
      }
    }
  }

  override suspend fun saveLog(log: SmsLogEntity) {
    db.smsLogDao().insert(log)
  }

  override fun observeLogs(): LiveData<List<SmsLogEntity>> = db.smsLogDao().observeLogs()

  override suspend fun getDashboardCounts(): Triple<Int, Int, Int> = withContext(Dispatchers.IO) {
    val todayStart = System.currentTimeMillis() - 24L * 60L * 60L * 1000L
    val sentToday = db.smsLogDao().countByStatusSince("SENT", todayStart)
    val failed = db.smsLogDao().countByStatus("FAILED")
    val pending = db.smsLogDao().countByStatus("PENDING")
    Triple(sentToday, pending, failed)
  }

  override suspend fun getConfig(): AppConfigEntity = withContext(Dispatchers.IO) {
    db.appConfigDao().getConfig() ?: AppConfigEntity()
  }

  override suspend fun saveConfig(config: AppConfigEntity) {
    withContext(Dispatchers.IO) {
      db.appConfigDao().save(config)
    }
  }
}
