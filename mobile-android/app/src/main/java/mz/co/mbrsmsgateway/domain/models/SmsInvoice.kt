package mz.co.mbrsmsgateway.domain.models

data class SmsInvoice(
  val messageId: String,
  val messageType: String,
  val invoiceId: String?,
  val invoiceNumber: String?,
  val customerName: String?,
  val phone: String,
  val smsText: String
)
