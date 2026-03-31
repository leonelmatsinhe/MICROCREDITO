package mz.co.mbrsmsgateway.ui.viewmodels

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import mz.co.mbrsmsgateway.data.ServiceLocator

class ViewModelFactory(context: Context) : ViewModelProvider.Factory {
  private val repo = ServiceLocator.gatewayRepository(context)
  private val smsSender = ServiceLocator.smsSender(context)

  @Suppress("UNCHECKED_CAST")
  override fun <T : ViewModel> create(modelClass: Class<T>): T {
    return when {
      modelClass.isAssignableFrom(AuthViewModel::class.java) -> AuthViewModel(repo) as T
      modelClass.isAssignableFrom(DashboardViewModel::class.java) -> DashboardViewModel(repo, smsSender) as T
      modelClass.isAssignableFrom(LogsViewModel::class.java) -> LogsViewModel(repo) as T
      modelClass.isAssignableFrom(SettingsViewModel::class.java) -> SettingsViewModel(repo) as T
      else -> throw IllegalArgumentException("Unknown ViewModel: ${modelClass.name}")
    }
  }
}
