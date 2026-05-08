import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.widget.Toast
import androidx.core.app.NotificationCompat

class MeridianAccessibilityService : AccessibilityService() {

    private val client = OkHttpClient()
    private val serverUrl = "http://10.132.237.182:3000/api/event" 
    private val CHANNEL_ID = "meridian_focus"

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val packageName = event.packageName?.toString() ?: return
            
            // 1. Detect Distraction
            val distractionApps = listOf("com.instagram.android", "com.google.android.youtube")
            if (distractionApps.contains(packageName)) {
                showFrictionNudge()
                sendEventToServer(packageName, "distraction")
            }

            // 2. Detect Work Return
            val workApps = listOf("com.slack", "com.google.android.gm", "com.microsoft.teams")
            if (workApps.contains(packageName)) {
                showWorkResumeNotification()
                sendEventToServer(packageName, "work_return")
            }
        }
    }

    private fun showFrictionNudge() {
        Toast.makeText(this, "TAKE A BREATH. Is this your intention? 👁️", Toast.LENGTH_LONG).show()
    }

    private fun showWorkResumeNotification() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        // Create Channel for Android 8.0+
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "Meridian Focus", NotificationManager.IMPORTANCE_HIGH)
            manager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Meridian: Welcome Back")
            .setContentText("You were working on the Auth.js refactor. Stay in flow! 🔋")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        manager.notify(1, notification)
    }

    private fun sendEventToServer(packageName: String, type: String) {
        val json = """
            {
                "app": "$packageName",
                "type": "$type",
                "timestamp": "${System.currentTimeMillis()}"
            }
        """.trimIndent()

        val body = json.toRequestBody("application/json".toMediaType())
        val request = Request.Builder().url(serverUrl).post(body).build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { Log.e("Meridian", "Error: ${e.message}") }
            override fun onResponse(call: Call, response: Response) { Log.d("Meridian", "Success") }
        })
    }

    override fun onInterrupt() {}
}
