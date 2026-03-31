package mz.co.mbrsmsgateway.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import kotlinx.coroutines.launch
import mz.co.mbrsmsgateway.databinding.FragmentDashboardBinding
import mz.co.mbrsmsgateway.ui.viewmodels.DashboardViewModel
import mz.co.mbrsmsgateway.ui.viewmodels.ViewModelFactory
import mz.co.mbrsmsgateway.workers.SmsSyncWorker

class DashboardFragment : Fragment() {
  private var _binding: FragmentDashboardBinding? = null
  private val binding get() = _binding!!
  private lateinit var viewModel: DashboardViewModel

  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?
  ): View {
    _binding = FragmentDashboardBinding.inflate(inflater, container, false)
    return binding.root
  }

  override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    super.onViewCreated(view, savedInstanceState)
    viewModel = ViewModelProvider(this, ViewModelFactory(requireContext()))[DashboardViewModel::class.java]
    observeState()
    viewModel.load()

    binding.btnManualSync.setOnClickListener {
      val request = OneTimeWorkRequestBuilder<SmsSyncWorker>().build()
      WorkManager.getInstance(requireContext()).enqueueUniqueWork(
        "manual_sync",
        ExistingWorkPolicy.REPLACE,
        request
      )
      viewModel.load()
    }
  }

  private fun observeState() {
    viewLifecycleOwner.lifecycleScope.launch {
      viewModel.state.collect { state ->
        binding.tvSentToday.text = state.sentToday.toString()
        binding.tvPending.text = state.pending.toString()
        binding.tvFailed.text = state.failed.toString()
        binding.tvSimState.text = state.simState
      }
    }
  }

  override fun onResume() {
    super.onResume()
    viewModel.load()
  }

  override fun onDestroyView() {
    _binding = null
    super.onDestroyView()
  }
}
