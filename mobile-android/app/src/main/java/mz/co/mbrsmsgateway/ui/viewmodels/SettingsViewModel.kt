package mz.co.mbrsmsgateway.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import mz.co.mbrsmsgateway.database.entities.AppConfigEntity
import mz.co.mbrsmsgateway.repository.GatewayRepository

class SettingsViewModel(
  private val repository: GatewayRepository
) : ViewModel() {
  private val _state = MutableStateFlow(AppConfigEntity())
  val state: StateFlow<AppConfigEntity> = _state

  fun load() {
    viewModelScope.launch {
      _state.value = repository.getConfig()
    }
  }

  fun save(apiBaseUrl: String, syncMinutes: Long, subscriptionId: Int) {
    viewModelScope.launch {
      val config = AppConfigEntity(
        apiBaseUrl = apiBaseUrl,
        syncIntervalMinutes = syncMinutes.coerceAtLeast(1),
        preferredSubscriptionId = subscriptionId
      )
      repository.saveConfig(config)
      _state.value = config
    }
  }

  suspend fun logout() {
    repository.logout()
  }

  suspend fun syncInboxNow(limit: Int = 100): Result<Int> {
    return repository.syncDeviceInboxNow(limit)
  }
}
