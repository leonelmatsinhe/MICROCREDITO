package mz.co.mbrsmsgateway.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import mz.co.mbrsmsgateway.databinding.FragmentLogsBinding
import mz.co.mbrsmsgateway.ui.adapters.SmsLogAdapter
import mz.co.mbrsmsgateway.ui.viewmodels.LogsViewModel
import mz.co.mbrsmsgateway.ui.viewmodels.ViewModelFactory

class LogsFragment : Fragment() {
  private var _binding: FragmentLogsBinding? = null
  private val binding get() = _binding!!
  private lateinit var viewModel: LogsViewModel
  private val adapter = SmsLogAdapter()

  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?
  ): View {
    _binding = FragmentLogsBinding.inflate(inflater, container, false)
    return binding.root
  }

  override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    super.onViewCreated(view, savedInstanceState)
    viewModel = ViewModelProvider(this, ViewModelFactory(requireContext()))[LogsViewModel::class.java]

    binding.recyclerLogs.layoutManager = LinearLayoutManager(requireContext())
    binding.recyclerLogs.adapter = adapter

    viewModel.logs.observe(viewLifecycleOwner) { list ->
      adapter.submit(list)
      binding.tvEmpty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
    }
  }

  override fun onDestroyView() {
    _binding = null
    super.onDestroyView()
  }
}
