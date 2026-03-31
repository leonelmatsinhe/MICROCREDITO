package mz.co.mbrsmsgateway.workers

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import mz.co.mbrsmsgateway.data.GatewayRepositoryImpl
import mz.co.mbrsmsgateway.domain.usecase.SyncPendingSmsUseCase
import mz.co.mbrsmsgateway.sms.SmsSender
import java.util.concurrent.TimeUnit

class SmsSyncWorker(
  context: Context,
  params: WorkerParameters
) : CoroutineWorker(context, params) {

  override suspend fun doWork(): Result {
    val repository = GatewayRepositoryImpl(applicationContext)
    if (!repository.hasValidSession()) {
      return Result.success()
    }
    val config = repository.getConfig()
    val useCase = SyncPendingSmsUseCase(repository, SmsSender(applicationContext))

    val result = useCase(config.preferredSubscriptionId)
    repository.syncDeviceInboxNow(limit = 80)
    scheduleNext(config.syncIntervalMinutes)
    return if (result.isSuccess) Result.success() else Result.retry()
  }

  private fun scheduleNext(intervalMinutes: Long) {
    val safeMinutes = intervalMinutes.coerceAtLeast(1)
    val next = OneTimeWorkRequestBuilder<SmsSyncWorker>()
      .setInitialDelay(safeMinutes, TimeUnit.MINUTES)
      .build()
    WorkManager.getInstance(applicationContext).enqueueUniqueWork(
      UNIQUE_WORK_NAME,
      ExistingWorkPolicy.REPLACE,
      next
    )
  }

  companion object {
    const val UNIQUE_WORK_NAME = "sms_sync_worker"
  }
}
