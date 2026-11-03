package com.elitec.abaco_launcher.infrastructure.lifecycle

import java.io.File
import java.io.RandomAccessFile
import java.nio.channels.FileChannel
import java.nio.channels.FileLock

/**
 * Evita dos orquestadores compitiendo por el mismo backend local.
 * Lock en java.io.tmpdir/abacophy-orchestrator.lock
 */
object SingleInstanceLock {
    private var raf: RandomAccessFile? = null
    private var channel: FileChannel? = null
    private var lock: FileLock? = null

    fun tryAcquire(): Boolean {
        release()
        return try {
            val file = File(System.getProperty("java.io.tmpdir"), "abacophy-orchestrator.lock")
            val randomAccess = RandomAccessFile(file, "rw")
            val ch = randomAccess.channel
            val fl = ch.tryLock()
            if (fl == null) {
                ch.close()
                randomAccess.close()
                false
            } else {
                raf = randomAccess
                channel = ch
                lock = fl
                true
            }
        } catch (_: Exception) {
            release()
            false
        }
    }

    fun release() {
        try {
            lock?.release()
        } catch (_: Exception) {
        }
        try {
            channel?.close()
        } catch (_: Exception) {
        }
        try {
            raf?.close()
        } catch (_: Exception) {
        }
        lock = null
        channel = null
        raf = null
    }
}
