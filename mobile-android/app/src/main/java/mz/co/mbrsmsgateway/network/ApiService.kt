package mz.co.mbrsmsgateway.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
  @POST("login")
  suspend fun login(@Body request: LoginRequest): LoginResponse

  @GET("sms-gateway/pending")
  suspend fun getPendingSms(
    @Query("limit") limit: Int = 50
  ): SmsPendingResponse

  @PATCH("sms-gateway/{id}/status")
  suspend fun updateSmsStatus(
    @Path("id") messageId: String,
    @Body request: UpdateSmsStatusRequest
  )

  @POST("sms-gateway/inbox/sync")
  suspend fun syncInbox(
    @Body request: SyncInboxRequest
  ): SyncInboxResponse

}
