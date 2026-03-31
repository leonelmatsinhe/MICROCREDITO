package mz.co.mbrsmsgateway.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import mz.co.mbrsmsgateway.repository.GatewayRepository

class AuthViewModel(
  private val repository: GatewayRepository
) : ViewModel() {
  private val _state = MutableStateFlow(AuthUiState())
  val state: StateFlow<AuthUiState> = _state

  fun initialize() {
    val savedEmail = repository.getSavedLoginEmail().orEmpty()
    _state.value = _state.value.copy(
      savedEmail = savedEmail,
      isLoggedIn = repository.hasValidSession()
    )
  }

  fun login(email: String, password: String) {
    viewModelScope.launch {
      if (email.isBlank() || password.isBlank()) {
        _state.value = _state.value.copy(error = "Informe email e senha.")
        return@launch
      }
      _state.value = _state.value.copy(loading = true, error = null)
      val result = repository.login(email, password)
      _state.value = if (result.isSuccess) {
        _state.value.copy(loading = false, isLoggedIn = true, savedEmail = email)
      } else {
        _state.value.copy(loading = false, error = result.exceptionOrNull()?.message ?: "Falha no login")
      }
    }
  }
}

data class AuthUiState(
  val loading: Boolean = false,
  val isLoggedIn: Boolean = false,
  val savedEmail: String = "",
  val error: String? = null
)
