package mz.co.mbrsmsgateway

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import mz.co.mbrsmsgateway.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
  private lateinit var binding: ActivityMainBinding

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivityMainBinding.inflate(layoutInflater)
    setContentView(binding.root)

    val navHost = supportFragmentManager
      .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
    binding.bottomNavigation.setupWithNavController(navHost.navController)
    navHost.navController.addOnDestinationChangedListener { _, destination, _ ->
      binding.bottomNavigation.visibility = if (destination.id == R.id.loginFragment) {
        View.GONE
      } else {
        View.VISIBLE
      }
    }
    requestRequiredPermissions()
  }

  private fun requestRequiredPermissions() {
    val permissions = mutableListOf(
      Manifest.permission.SEND_SMS,
      Manifest.permission.READ_PHONE_STATE,
      Manifest.permission.RECEIVE_SMS,
      Manifest.permission.READ_SMS
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      permissions.add(Manifest.permission.POST_NOTIFICATIONS)
    }
    val missing = permissions.filter {
      ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
    }
    if (missing.isNotEmpty()) {
      ActivityCompat.requestPermissions(this, missing.toTypedArray(), REQUEST_PERMISSIONS)
    }
  }

  companion object {
    private const val REQUEST_PERMISSIONS = 1001
  }
}
