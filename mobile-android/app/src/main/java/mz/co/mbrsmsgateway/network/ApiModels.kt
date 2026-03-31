package mz.co.mbrsmsgateway.network

data class LoginRequest(
  val email: String,
  val password: String
)

data class UserDto(
  val id: String? = null,
  val full_name: String? = null,
  val email: String? = null,
  val role: String? = null,
  val tenant_id: String? = null
)

data class LoginResponse(
  val token: String? = null,
  val user: UserDto? = null,
  val success: Boolean? = null,
  val message: String? = null,
  val result: List<LegacyLoginUserDto>? = null
)

data class LegacyLoginUserDto(
  val id: Int? = null,
  val companyId: Int? = null,
  val name: String? = null,
  val email: String? = null,
  val userRole: Int? = null,
  val token: String? = null
)

data class SmsPendingResponse(
  val count: Int,
  val data: List<SmsGatewayMessageDto>
)

data class SmsGatewayMessageDto(
  val id: String,
  val tenant_id: String,
  val customer_id: String?,
  val invoice_id: String?,
  val payment_id: String?,
  val message_type: String,
  val status: String,
  val customer_name: String?,
  val phone: String,
  val message_body: String,
  val payload_json: Map<String, @JvmSuppressWildcards Any?>?,
  val gateway_message_id: String?,
  val error_message: String?,
  val sent_at: String?,
  val created_at: String,
  val updated_at: String
)

data class UpdateSmsStatusRequest(
  val status: String,
  val gateway_message_id: String? = null,
  val error_message: String? = null
)

data class DeviceInboxMessageRequest(
  val sender_phone: String?,
  val receiver_phone: String?,
  val message_body: String,
  val received_at: String
)

data class SyncInboxRequest(
  val device_id: String,
  val messages: List<DeviceInboxMessageRequest>
)

data class SyncInboxResponse(
  val received_count: Int,
  val inserted_count: Int,
  val duplicated_count: Int
)
