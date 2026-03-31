package mz.co.mbrsmsgateway.network

import android.content.Context
import com.google.gson.GsonBuilder
import mz.co.mbrsmsgateway.database.AppDatabase
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class ApiClient private constructor(context: Context) {
  private val database = AppDatabase.getInstance(context)
  private val tokenStore = TokenStore(context)

  fun service(): ApiService {
    val settings = database.appConfigDao().getConfigSync()
    val baseUrl = (settings?.apiBaseUrl ?: DEFAULT_BASE_URL).ensureTrailingSlash()
    val logging = HttpLoggingInterceptor().apply {
      level = HttpLoggingInterceptor.Level.BODY
    }
    val client = OkHttpClient.Builder()
      .addInterceptor(AuthInterceptor(tokenStore))
      .addInterceptor(logging)
      .connectTimeout(30, TimeUnit.SECONDS)
      .readTimeout(30, TimeUnit.SECONDS)
      .build()

    val retrofit = Retrofit.Builder()
      .baseUrl(baseUrl)
      .client(client)
      .addConverterFactory(GsonConverterFactory.create(GsonBuilder().create()))
      .build()
    return retrofit.create(ApiService::class.java)
  }

  companion object {
    private const val DEFAULT_BASE_URL = "http://192.168.10.83:3000/api/"

    @Volatile
    private var instance: ApiClient? = null

    fun getInstance(context: Context): ApiClient =
      instance ?: synchronized(this) {
        instance ?: ApiClient(context.applicationContext).also { instance = it }
      }

    private fun String.ensureTrailingSlash(): String =
      if (endsWith("/")) this else "$this/"
  }
}
