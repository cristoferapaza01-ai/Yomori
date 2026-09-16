package eu.kanade.tachiyomi.network

import okhttp3.Dns
import java.net.Inet4Address
import java.net.InetAddress

class PreferIpv4Dns(private val delegate: Dns = Dns.SYSTEM) : Dns {
    override fun lookup(hostname: String): List<InetAddress> {
        val addresses = try {
            delegate.lookup(hostname)
        } catch (e: Exception) {
            if (delegate !== Dns.SYSTEM) {
                try {
                    Dns.SYSTEM.lookup(hostname)
                } catch (_: Exception) {
                    throw e
                }
            } else {
                throw e
            }
        }
        if (addresses.size <= 1) return addresses
        return addresses.sortedWith(
            compareBy { address -> if (address is Inet4Address) 0 else 1 },
        )
    }
}
