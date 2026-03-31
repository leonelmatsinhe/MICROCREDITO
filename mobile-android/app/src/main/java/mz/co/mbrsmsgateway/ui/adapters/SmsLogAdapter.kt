package mz.co.mbrsmsgateway.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import mz.co.mbrsmsgateway.database.entities.SmsLogEntity
import mz.co.mbrsmsgateway.databinding.ItemSmsLogBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class SmsLogAdapter : RecyclerView.Adapter<SmsLogAdapter.LogViewHolder>() {
  private val items = mutableListOf<SmsLogEntity>()
  private val formatter = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())

  fun submit(list: List<SmsLogEntity>) {
    items.clear()
    items.addAll(list)
    notifyDataSetChanged()
  }

  override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LogViewHolder {
    val binding = ItemSmsLogBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    return LogViewHolder(binding)
  }

  override fun getItemCount(): Int = items.size

  override fun onBindViewHolder(holder: LogViewHolder, position: Int) {
    holder.bind(items[position])
  }

  inner class LogViewHolder(
    private val binding: ItemSmsLogBinding
  ) : RecyclerView.ViewHolder(binding.root) {
    fun bind(item: SmsLogEntity) {
      val typeLabel = if (item.messageType == "payment_receipt") "RECIBO" else "FACTURA"
      binding.tvInvoice.text = "[$typeLabel] ${item.invoiceNumber} - ${item.customerName}"
      binding.tvPhone.text = item.phone
      binding.tvStatus.text = item.status
      binding.tvDate.text = formatter.format(Date(item.createdAtMillis))
      binding.tvError.text = item.error ?: "-"
    }
  }
}
