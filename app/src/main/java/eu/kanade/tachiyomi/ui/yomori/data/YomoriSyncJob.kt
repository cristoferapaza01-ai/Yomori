package eu.kanade.tachiyomi.ui.yomori.data

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkerParameters
import eu.kanade.tachiyomi.util.system.workManager
import logcat.LogPriority
import tachiyomi.core.common.util.system.logcat
import java.util.concurrent.TimeUnit

/**
 * Worker de WorkManager que se ejecuta periódicamente en segundo plano (incluso con la app cerrada)
 * para sincronizar la biblioteca y progreso de lectura en Supabase.
 */
class YomoriSyncJob(context: Context, workerParams: WorkerParameters) :
    CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        val currentUser = UserManager.userState.value
        if (!currentUser.isLoggedIn || currentUser.username.isBlank()) {
            return Result.success()
        }

        return try {
            logcat(LogPriority.INFO) { "YomoriSyncJob: Ejecutando sincronización en segundo plano..." }
            val ok = YomoriSyncManager.pushLibraryToCloud()
            if (ok) Result.success() else Result.retry()
        } catch (e: Exception) {
            logcat(LogPriority.ERROR, e) { "YomoriSyncJob: Error durante la sincronización periódica" }
            Result.retry()
        }
    }

    companion object {
        private const val TAG = "YomoriSyncJob"

        fun setupTask(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = PeriodicWorkRequestBuilder<YomoriSyncJob>(
                15, // Cada 15 minutos (mínimo soportado por Android WorkManager)
                TimeUnit.MINUTES,
            )
                .addTag(TAG)
                .setConstraints(constraints)
                .build()

            context.workManager.enqueueUniquePeriodicWork(
                TAG,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
            logcat(LogPriority.INFO) { "YomoriSyncJob: Programada tarea periódica cada 15 min." }
        }
    }
}
