package mz.co.mbrsmsgateway.domain.usecase

import mz.co.mbrsmsgateway.database.entities.SmsLogEntity
import mz.co.mbrsmsgateway.repository.GatewayRepository
import mz.co.mbrsmsgateway.sms.SmsSender
import mz.co.mbrsmsgateway.sms.SmsTrackingMeta

class SyncPendingSmsUseCase(
  private val repository: GatewayRepository,
  private val smsSender: SmsSender
) {
  suspend operator fun invoke(preferredSubscriptionId: Int): Result<Int> {
    val pending = repository.fetchPendingSms().getOrElse { return Result.failure(it) }
    var sentCount = 0

    pending.forEach { sms ->
      val documentRef = sms.invoiceNumber ?: sms.invoiceId ?: "Sem documento"
      val typeLabel = if (sms.messageType == "payment_receipt") "RECIBO" else "FACTURA"
      repository.saveLog(
        SmsLogEntity(
          messageId = sms.messageId,
          messageType = sms.messageType,
          invoiceId = sms.invoiceId,
          invoiceNumber = documentRef,
          customerName = sms.customerName ?: "-",
          phone = sms.phone,
          message = sms.smsText,
          status = "PENDING",
          error = "$typeLabel pendente de envio"
        )
      )

      val sendResult = smsSender.send(
        sms.phone,
        sms.smsText,
        preferredSubscriptionId,
        SmsTrackingMeta(
          messageId = sms.messageId,
          messageType = sms.messageType,
          invoiceId = sms.invoiceId,
          invoiceNumber = documentRef,
          customerName = sms.customerName ?: "-"
        )
      )
      if (sendResult.isSuccess) {
        repository.markAsSent(sms.messageId)
        repository.saveLog(
          SmsLogEntity(
            messageId = sms.messageId,
            messageType = sms.messageType,
            invoiceId = sms.invoiceId,
            invoiceNumber = documentRef,
            customerName = sms.customerName ?: "-",
            phone = sms.phone,
            message = sms.smsText,
            status = "SENT"
          )
        )
        sentCount += 1
      } else {
        val reason = sendResult.exceptionOrNull()?.message ?: "Falha ao enviar SMS"
        repository.markAsFailed(sms.messageId, reason)
        repository.saveLog(
          SmsLogEntity(
            messageId = sms.messageId,
            messageType = sms.messageType,
            invoiceId = sms.invoiceId,
            invoiceNumber = documentRef,
            customerName = sms.customerName ?: "-",
            phone = sms.phone,
            message = sms.smsText,
            status = "FAILED",
            error = reason,
            retries = 1
          )
        )
      }
    }
    return Result.success(sentCount)
  }
}
