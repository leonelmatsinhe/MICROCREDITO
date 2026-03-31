package mz.co.mbrsmsgateway.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import mz.co.mbrsmsgateway.repository.GatewayRepository
import mz.co.mbrsmsgateway.sms.SmsSender

class DashboardViewModel(
  private val repository: GatewayRepository,
  private val smsSender: SmsSender
) : ViewModel() {
  private val _state = MutableStateFlow(DashboardUiState())
  val state: StateFlow<DashboardUiState> = _state

  fun load() {
    viewModelScope.launch {
      val config = repository.getConfig()
      val counts = repository.getDashboardCounts()
      _state.value = DashboardUiState(
        sentToday = counts.first,
        pending = counts.second,
        failed = counts.third,
        simState = smsSender.getSimStateSummary(config.preferredSubscriptionId)
      )
    }
  }
}

data class DashboardUiState(
  val sentToday: Int = 0,
  val pending: Int = 0,
  val failed: Int = 0,
  val simState: String = "-"
)
