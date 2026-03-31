package mz.co.mbrsmsgateway.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.provider.Settings
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mz.co.mbrsmsgateway.network.ApiClient
import mz.co.mbrsmsgateway.network.DeviceInboxMessageRequest
import mz.co.mbrsmsgateway.network.SyncInboxRequest
import mz.co.mbrsmsgateway.network.TokenStore
import java.time.Instant

class SmsIncomingReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

    val tokenStore = TokenStore(context.applicationContext)
    if (!tokenStore.hasValidSession()) return

    val pendingResult = goAsync()
    CoroutineScope(Dispatchers.IO).launch {
      try {
        val smsMessages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (smsMessages.isNullOrEmpty()) return@launch

        val deviceId = Settings.Secure.getString(
          context.contentResolver,
          Settings.Secure.ANDROID_ID
        ) ?: "android-device"

        val payloadMessages = smsMessages.mapNotNull { sms ->
          val body = sms.displayMessageBody?.toString()?.trim().orEmpty()
          if (body.isBlank()) return@mapNotNull null
          val timestamp = sms.timestampMillis.takeIf { it > 0 } ?: System.currentTimeMillis()
          val receivedAt = Instant.ofEpochMilli(timestamp).toString()
          DeviceInboxMessageRequest(
            sender_phone = sms.originatingAddress,
            receiver_phone = sms.serviceCenterAddress,
            message_body = body,
            received_at = receivedAt
          )
        }

        if (payloadMessages.isEmpty()) return@launch

        ApiClient.getInstance(context.applicationContext).service().syncInbox(
          SyncInboxRequest(
            device_id = deviceId,
            messages = payloadMessages
          )
        )
      } catch (error: Exception) {
        Log.w("SmsIncomingReceiver", "Falha ao sincronizar inbox SMS", error)
      } finally {
        pendingResult.finish()
      }
    }
  }
}
