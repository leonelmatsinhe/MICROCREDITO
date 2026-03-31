package mz.co.mbrsmsgateway.sms

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mz.co.mbrsmsgateway.database.AppDatabase
import mz.co.mbrsmsgateway.database.entities.SmsLogEntity

class SmsDeliveryReportReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val messageId = intent.getStringExtra(SmsSender.EXTRA_MESSAGE_ID) ?: return
    val messageType = intent.getStringExtra(SmsSender.EXTRA_MESSAGE_TYPE) ?: "invoice_notice"
    val invoiceId = intent.getStringExtra(SmsSender.EXTRA_INVOICE_ID)
    val invoiceNumber = intent.getStringExtra(SmsSender.EXTRA_INVOICE_NUMBER) ?: "Sem documento"
    val customerName = intent.getStringExtra(SmsSender.EXTRA_CUSTOMER_NAME) ?: "-"
    val phone = intent.getStringExtra(SmsSender.EXTRA_PHONE) ?: "-"
    val message = intent.getStringExtra(SmsSender.EXTRA_MESSAGE_TEXT) ?: ""
    val partIndex = intent.getIntExtra(SmsSender.EXTRA_PART_INDEX, 0)

    val isSentAction = intent.action == SmsSender.ACTION_SMS_SENT
    val status = when {
      isSentAction && resultCode == Activity.RESULT_OK -> "SENT_MODEM"
      isSentAction -> "SENT_FAILED"
      !isSentAction && resultCode == Activity.RESULT_OK -> "DELIVERED"
      else -> "DELIVERY_FAILED"
    }

    val error = when {
      resultCode == Activity.RESULT_OK -> null
      isSentAction -> "Falha no envio para operadora (parte ${partIndex + 1})"
      else -> "Entrega não confirmada (parte ${partIndex + 1})"
    }

    CoroutineScope(Dispatchers.IO).launch {
      AppDatabase.getInstance(context.applicationContext).smsLogDao().insert(
        SmsLogEntity(
          messageId = messageId,
          messageType = messageType,
          invoiceId = invoiceId,
          invoiceNumber = invoiceNumber,
          customerName = customerName,
          phone = phone,
          message = message,
          status = status,
          error = error
        )
      )
    }
  }
}
