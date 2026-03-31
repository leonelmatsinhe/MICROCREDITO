package mz.co.mbrsmsgateway.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.navigation.navOptions
import kotlinx.coroutines.launch
import mz.co.mbrsmsgateway.R
import mz.co.mbrsmsgateway.databinding.FragmentSettingsBinding
import mz.co.mbrsmsgateway.ui.viewmodels.SettingsViewModel
import mz.co.mbrsmsgateway.ui.viewmodels.ViewModelFactory

class SettingsFragment : Fragment() {
  private var _binding: FragmentSettingsBinding? = null
  private val binding get() = _binding!!
  private lateinit var viewModel: SettingsViewModel

  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?
  ): View {
    _binding = FragmentSettingsBinding.inflate(inflater, container, false)
    return binding.root
  }

  override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    super.onViewCreated(view, savedInstanceState)
    viewModel = ViewModelProvider(this, ViewModelFactory(requireContext()))[SettingsViewModel::class.java]

    viewLifecycleOwner.lifecycleScope.launch {
      viewModel.state.collect { config ->
        binding.etApiBaseUrl.setText(config.apiBaseUrl)
        binding.etSyncInterval.setText(config.syncIntervalMinutes.toString())
        binding.etSubscriptionId.setText(config.preferredSubscriptionId.toString())
      }
    }

    binding.btnSaveSettings.setOnClickListener {
      val api = binding.etApiBaseUrl.text.toString().trim()
      val interval = binding.etSyncInterval.text.toString().toLongOrNull() ?: 1L
      val subscriptionId = binding.etSubscriptionId.text.toString().toIntOrNull() ?: -1
      viewModel.save(api, interval, subscriptionId)
      Toast.makeText(requireContext(), "Configurações guardadas", Toast.LENGTH_SHORT).show()
    }

    binding.btnSyncInbox.setOnClickListener {
      viewLifecycleOwner.lifecycleScope.launch {
        val result = viewModel.syncInboxNow(limit = 150)
        if (result.isSuccess) {
          Toast.makeText(
            requireContext(),
            "Inbox sincronizada. Novas SMS: ${result.getOrNull() ?: 0}",
            Toast.LENGTH_SHORT
          ).show()
        } else {
          Toast.makeText(
            requireContext(),
            result.exceptionOrNull()?.message ?: "Falha ao sincronizar inbox SMS.",
            Toast.LENGTH_LONG
          ).show()
        }
      }
    }

    binding.btnLogout.setOnClickListener {
      viewLifecycleOwner.lifecycleScope.launch {
        viewModel.logout()
        findNavController().navigate(
          R.id.loginFragment,
          null,
          navOptions {
            popUpTo(R.id.nav_graph) { inclusive = true }
            launchSingleTop = true
          }
        )
      }
    }

    viewModel.load()
  }

  override fun onDestroyView() {
    _binding = null
    super.onDestroyView()
  }
}
