package mz.co.mbrsmsgateway.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.ViewModel
import mz.co.mbrsmsgateway.database.entities.SmsLogEntity
import mz.co.mbrsmsgateway.repository.GatewayRepository

class LogsViewModel(
  repository: GatewayRepository
) : ViewModel() {
  val logs: LiveData<List<SmsLogEntity>> = repository.observeLogs()
}
