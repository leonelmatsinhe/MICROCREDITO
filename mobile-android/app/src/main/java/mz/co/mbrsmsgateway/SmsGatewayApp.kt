package mz.co.mbrsmsgateway

import android.app.Application
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import mz.co.mbrsmsgateway.workers.SmsSyncWorker
import java.util.concurrent.TimeUnit

class SmsGatewayApp : Application() {
  override fun onCreate() {
    super.onCreate()
    scheduleInitialSync()
  }

  private fun scheduleInitialSync() {
    val request = OneTimeWorkRequestBuilder<SmsSyncWorker>()
      .setInitialDelay(10, TimeUnit.SECONDS)
      .build()
    WorkManager.getInstance(this).enqueueUniqueWork(
      SmsSyncWorker.UNIQUE_WORK_NAME,
      ExistingWorkPolicy.KEEP,
      request
    )
  }
}
