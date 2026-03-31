package mz.co.mbrsmsgateway.sms

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.pm.PackageManager
import android.content.Intent
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import androidx.core.content.ContextCompat

class SmsSender(private val context: Context) {
  fun send(phone: String, message: String, subscriptionId: Int, meta: SmsTrackingMeta): Result<Unit> {
    return runCatching {
      val allowed = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.SEND_SMS
      ) == PackageManager.PERMISSION_GRANTED
      if (!allowed) error("Permissão SEND_SMS não concedida")

      val normalizedPhone = normalizePhoneNumber(phone)
      val smsManager = if (subscriptionId > 0) {
        SmsManager.getSmsManagerForSubscriptionId(subscriptionId)
      } else {
        SmsManager.getDefault()
      }
      val parts = smsManager.divideMessage(message)
      val sentIntents = ArrayList<PendingIntent>(parts.size)
      val deliveryIntents = ArrayList<PendingIntent>(parts.size)

      parts.indices.forEach { index ->
        val sentIntent = Intent(ACTION_SMS_SENT).apply {
          setPackage(context.packageName)
          putExtra(EXTRA_MESSAGE_ID, meta.messageId)
          putExtra(EXTRA_MESSAGE_TYPE, meta.messageType)
          putExtra(EXTRA_INVOICE_ID, meta.invoiceId)
          putExtra(EXTRA_INVOICE_NUMBER, meta.invoiceNumber)
          putExtra(EXTRA_CUSTOMER_NAME, meta.customerName)
          putExtra(EXTRA_PHONE, normalizedPhone)
          putExtra(EXTRA_MESSAGE_TEXT, message)
          putExtra(EXTRA_PART_INDEX, index)
        }
        val deliveredIntent = Intent(ACTION_SMS_DELIVERED).apply {
          setPackage(context.packageName)
          putExtra(EXTRA_MESSAGE_ID, meta.messageId)
          putExtra(EXTRA_MESSAGE_TYPE, meta.messageType)
          putExtra(EXTRA_INVOICE_ID, meta.invoiceId)
          putExtra(EXTRA_INVOICE_NUMBER, meta.invoiceNumber)
          putExtra(EXTRA_CUSTOMER_NAME, meta.customerName)
          putExtra(EXTRA_PHONE, normalizedPhone)
          putExtra(EXTRA_MESSAGE_TEXT, message)
          putExtra(EXTRA_PART_INDEX, index)
        }

        sentIntents.add(
          PendingIntent.getBroadcast(
            context,
            "${meta.messageId}:S:$index".hashCode(),
            sentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
          )
        )
        deliveryIntents.add(
          PendingIntent.getBroadcast(
            context,
            "${meta.messageId}:D:$index".hashCode(),
            deliveredIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
          )
        )
      }

      smsManager.sendMultipartTextMessage(normalizedPhone, null, parts, sentIntents, deliveryIntents)
    }
  }

  fun getSimStateSummary(preferredSubscriptionId: Int): String {
    val subscriptionManager = context.getSystemService(SubscriptionManager::class.java)
    val activeList = subscriptionManager?.activeSubscriptionInfoList ?: emptyList()
    if (activeList.isEmpty()) return "Sem SIM ativo"

    return if (preferredSubscriptionId > 0) {
      val exists = activeList.any { it.subscriptionId == preferredSubscriptionId }
      if (exists) "SIM selecionado ativo" else "SIM selecionado não encontrado"
    } else {
      "SIM padrão ativo (${activeList.size} disponível)"
    }
  }

  fun normalizePhoneNumber(rawPhone: String): String {
    val digits = rawPhone.filter { it.isDigit() }
    if (digits.length == 9) return digits
    if (digits.length == 12) return digits.substring(3)
    error("Número inválido. Use 9 dígitos ou 12 dígitos com prefixo do país.")
  }

  companion object {
    const val ACTION_SMS_SENT = "mz.co.mbrsmsgateway.ACTION_SMS_SENT"
    const val ACTION_SMS_DELIVERED = "mz.co.mbrsmsgateway.ACTION_SMS_DELIVERED"
    const val EXTRA_MESSAGE_ID = "extra_message_id"
    const val EXTRA_MESSAGE_TYPE = "extra_message_type"
    const val EXTRA_INVOICE_ID = "extra_invoice_id"
    const val EXTRA_INVOICE_NUMBER = "extra_invoice_number"
    const val EXTRA_CUSTOMER_NAME = "extra_customer_name"
    const val EXTRA_PHONE = "extra_phone"
    const val EXTRA_MESSAGE_TEXT = "extra_message_text"
    const val EXTRA_PART_INDEX = "extra_part_index"
  }
}

data class SmsTrackingMeta(
  val messageId: String,
  val messageType: String,
  val invoiceId: String?,
  val invoiceNumber: String,
  val customerName: String
)
