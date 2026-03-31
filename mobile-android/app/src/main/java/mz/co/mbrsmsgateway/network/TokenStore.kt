package mz.co.mbrsmsgateway.network

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

class TokenStore(context: Context) {
  private val shared: SharedPreferences = runCatching {
    EncryptedSharedPreferences.create(
      "sms_gateway_secure",
      MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
      context,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
  }.getOrElse {
    context.getSharedPreferences("sms_gateway_secure_fallback", Context.MODE_PRIVATE)
  }

  fun saveSession(token: String, tenantId: String?, fullName: String?, email: String?, role: String?) {
    shared.edit()
      .putString(KEY_TOKEN, token)
      .putString(KEY_TENANT_ID, tenantId)
      .putString(KEY_FULL_NAME, fullName)
      .putString(KEY_EMAIL, email)
      .putString(KEY_ROLE, role)
      .putLong(KEY_LAST_LOGIN_AT, System.currentTimeMillis())
      .apply()
  }

  fun getToken(): String? = shared.getString(KEY_TOKEN, null)
  fun getTenantId(): String? = shared.getString(KEY_TENANT_ID, null)
  fun getSavedEmail(): String? = shared.getString(KEY_EMAIL, null)
  fun getSavedFullName(): String? = shared.getString(KEY_FULL_NAME, null)
  fun getSavedRole(): String? = shared.getString(KEY_ROLE, null)
  fun getLastLoginAtMillis(): Long = shared.getLong(KEY_LAST_LOGIN_AT, 0L)

  fun clearSession() {
    shared.edit()
      .remove(KEY_TOKEN)
      .remove(KEY_TENANT_ID)
      .remove(KEY_FULL_NAME)
      .remove(KEY_ROLE)
      .apply()
  }

  fun hasValidSession(): Boolean = !getToken().isNullOrBlank() && !getTenantId().isNullOrBlank()

  companion object {
    private const val KEY_TOKEN = "auth_token"
    private const val KEY_TENANT_ID = "tenant_id"
    private const val KEY_FULL_NAME = "full_name"
    private const val KEY_EMAIL = "email"
    private const val KEY_ROLE = "role"
    private const val KEY_LAST_LOGIN_AT = "last_login_at"
  }
}
