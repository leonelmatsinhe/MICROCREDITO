package mz.co.mbrsmsgateway.data

import android.content.Context
import mz.co.mbrsmsgateway.repository.GatewayRepository
import mz.co.mbrsmsgateway.sms.SmsSender

object ServiceLocator {
  @Volatile
  private var repository: GatewayRepository? = null

  fun gatewayRepository(context: Context): GatewayRepository {
    return repository ?: synchronized(this) {
      repository ?: GatewayRepositoryImpl(context.applicationContext).also { repository = it }
    }
  }

  fun smsSender(context: Context): SmsSender = SmsSender(context.applicationContext)
}
