package mz.co.mbrsmsgateway.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import kotlinx.coroutines.launch
import mz.co.mbrsmsgateway.R
import mz.co.mbrsmsgateway.databinding.FragmentLoginBinding
import mz.co.mbrsmsgateway.ui.viewmodels.AuthUiState
import mz.co.mbrsmsgateway.ui.viewmodels.AuthViewModel
import mz.co.mbrsmsgateway.ui.viewmodels.ViewModelFactory

class LoginFragment : Fragment() {
  private var _binding: FragmentLoginBinding? = null
  private val binding get() = _binding!!
  private lateinit var viewModel: AuthViewModel
  private var hasAppliedSavedEmail = false

  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?
  ): View {
    _binding = FragmentLoginBinding.inflate(inflater, container, false)
    return binding.root
  }

  override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    super.onViewCreated(view, savedInstanceState)
    viewModel = ViewModelProvider(this, ViewModelFactory(requireContext()))[AuthViewModel::class.java]
    viewModel.initialize()

    binding.btnLogin.setOnClickListener {
      viewModel.login(
        email = binding.etEmail.text.toString().trim(),
        password = binding.etPassword.text.toString()
      )
    }

    viewLifecycleOwner.lifecycleScope.launch {
      viewModel.state.collect { state ->
        renderState(state)
        if (state.isLoggedIn) {
          findNavController().navigate(R.id.action_loginFragment_to_dashboardFragment)
        }
      }
    }
  }

  private fun renderState(state: AuthUiState) {
    binding.progress.visibility = if (state.loading) View.VISIBLE else View.GONE
    binding.tvError.text = state.error ?: ""
    binding.btnLogin.isEnabled = !state.loading
    binding.etEmail.isEnabled = !state.loading
    binding.etPassword.isEnabled = !state.loading
    if (!hasAppliedSavedEmail && state.savedEmail.isNotBlank()) {
      binding.etEmail.setText(state.savedEmail)
      hasAppliedSavedEmail = true
    }
  }

  override fun onDestroyView() {
    _binding = null
    super.onDestroyView()
  }
}
