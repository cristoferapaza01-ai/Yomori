package eu.kanade.domain.extension.interactor

import android.content.pm.PackageInfo
import androidx.core.content.pm.PackageInfoCompat
import eu.kanade.domain.source.service.SourcePreferences
import mihon.domain.extension.repository.ExtensionStoreRepository
import tachiyomi.core.common.preference.getAndSet

class TrustExtension(
    private val repository: ExtensionStoreRepository,
    private val preferences: SourcePreferences,
) {

    private val builtInTrustedSignatures = setOf(
        "ffdd82d14d32b14c510a896f2143132b9d58df8b27a9fd4e65ce77175084ebac",
        "5e1e1fb63a03ecb539da6c7dd2861c8a49c95175402ecdc8b4618e80abf3fd5d",
    )

    suspend fun isTrusted(pkgInfo: PackageInfo, fingerprints: List<String>): Boolean {
        if (fingerprints.any { it.lowercase() in builtInTrustedSignatures }) return true
        val trustedFingerprints = repository.getAll().map { it.signingKey.lowercase() }.toHashSet()
        val key = "${pkgInfo.packageName}:${PackageInfoCompat.getLongVersionCode(pkgInfo)}:${fingerprints.last()}"
        return trustedFingerprints.any { fingerprints.any { f -> f.equals(it, ignoreCase = true) } } || key in preferences.trustedExtensions.get()
    }

    fun trust(pkgName: String, versionCode: Long, signatureHash: String) {
        preferences.trustedExtensions.getAndSet { exts ->
            // Remove previously trusted versions
            val removed = exts.filterNot { it.startsWith("$pkgName:") }.toMutableSet()

            removed.also { it += "$pkgName:$versionCode:$signatureHash" }
        }
    }

    fun revokeAll() {
        preferences.trustedExtensions.delete()
    }
}
