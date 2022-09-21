package com.hwtransportreactnativeble

import com.facebook.react.bridge.*
import com.hwtransportreactnativeble.tasks.Queue
import com.hwtransportreactnativeble.tasks.Runner
import com.hwtransportreactnativeble.tasks.RunnerAction
import com.ledger.live.ble.BleManagerFactory
import com.ledger.live.ble.model.BleError
import kotlinx.coroutines.*
import timber.log.Timber
import java.net.URL
import java.util.*
import kotlin.concurrent.timerTask


class HwTransportReactNativeBleModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    private val tag: String = "BleTransport"
    private var onDisconnect: ((String) -> Unit)? = null
    private var retriesLeft = 1
    private var bleManager = BleManagerFactory.newInstance(reactContext)
    private var eventEmitter = EventEmitter.getInstance(reactContext)
    private var queueTask: Queue? = null
    private var runnerTask: Runner? = null
    private var planted: Boolean = false

    override fun getName(): String {
        return "HwTransportReactNativeBle"
    }

    private fun onDisconnectWrapper(any: String) {
        onDisconnect?.let { it(any) }
    }

    init {
        Timber.plant(Timber.DebugTree())
        Timber.d("init ble native module $this")
    }

    @ReactMethod
    fun observeBluetooth() = Unit

    @ReactMethod
    fun listen(promise: Promise) {
        Timber.d("$tag: \t start scanning")
        bleManager.startScanning {
            val devices = it.fold(Arguments.createArray()) { acc, device ->
                acc.pushMap(Arguments.createMap().apply {
                    putString("id", device.id)
                    putString("name", device.name)
                    putString("rssi", device.rssi.toString())
                    putArray("serviceUUIDs", Arguments.createArray().apply{pushString(device.serviceId)})
                })
                acc
            }

            // We hit this callback whenever a device is seen or goes away, this means we effectively
            // replace the list instead of emitting new events one by one. This solves the
            val event = Arguments.createMap().apply {
                putString("event", "replace")
                putString("type", "replace")
                putMap("data", Arguments.createMap().apply {
                    putArray("devices", devices)
                })
            }
            eventEmitter.dispatch(event)
        }
        promise.resolve(1)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Set up any upstream listeners or background tasks as necessary
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Remove upstream listeners, stop unnecessary background tasks
    }

    @ReactMethod
    fun stop(promise: Promise) {
        Timber.d("$tag: \t stop scanning")
        bleManager.stopScanning()
        promise.resolve(1)
    }

    @ReactMethod
    fun connect(uuid: String, promise: Promise) {
        Timber.d("$tag: \t Attempt to connect to $uuid")
        var consumed = false
        bleManager.connect(
            address = uuid,
            onConnectSuccess = {
                retriesLeft = 1
                Timber.d("$tag: \t connection success")
                if (!consumed) {
                    promise.resolve(it.id)
                    consumed = true
                } else {
                    print("already consumed")
                }
            },
            onConnectError = {
                if (retriesLeft == 0 || consumed) {
                    // If we are here, it's a disconnect that might be expected
                    // to be handled somewhere else, if we have a disconnect callback
                    onDisconnectWrapper(it.message)
                    if (!consumed){
                        promise.reject("connectError", Exception(it.message))
                    }
                } else if (it == BleError.UNKNOWN && retriesLeft > 0) {
                    // We shouldn't have `Device connection lost` here, we should only get a failure
                    // to connect, but the native part is throwing it, so hack away.
                    Timber.d("$tag: \t connection failure ignored, trying again")
                    retriesLeft -= 1
                    connect(uuid, promise)
                } else if (!consumed) {
                    Timber.d("$tag: \t connection failure")
                    promise.reject("connectError", Exception(it.message))
                    consumed = true
                }
            })
    }

    @ReactMethod
    fun onAppStateChange(awake: Boolean) {
        Timber.d("$tag: \t onAppStateChange triggered")
        eventEmitter.onAppStateChange(awake)
    }

    private var pendingEvent: Timer? = null
    @ReactMethod
    fun disconnect(promise: Promise) {
        /// Prevent race condition between organic disconnect (allow open app) and explicit disconnection below.
        
        pendingEvent = Timer()
        pendingEvent!!.schedule(
            timerTask() {
                queueTask?.stop()
                if (!bleManager.isConnected) {
                    promise.resolve(true)
                } else {
                    bleManager.disconnect {
                        Timber.d("$tag: \t disconnected")
                        promise.resolve(true)
                    }
                }
            },
            3000,
        )
    }

    @ReactMethod
    fun exchange(apdu: String, promise: Promise) {
        Timber.d("$tag: APDU -> $apdu")
        if (!bleManager.isConnected) {
            promise.reject("Device disconnected", Exception("Device disconnected"))
            return
        }
        bleManager.send(
            apduHex = apdu,
            onSuccess = {
                Timber.d("$tag: APDU <- $it")
                onDisconnect = null
                promise.resolve(it.replace(", ", ""))
            },
            onError = {
                Timber.d("$tag: APDU ERROR $it")
                onDisconnectWrapper(it)
            }
        )
    }

    @ReactMethod
    fun isConnected(promise: Promise) {
        Timber.d("$tag: \t isConnected ${bleManager.isConnected}")
        promise.resolve(bleManager.isConnected)
    }

    @ReactMethod
    fun queue(rawQueue: String, endpoint: String) {
        val scope = CoroutineScope(Dispatchers.Default + Job() )
        scope.launch { startSuspendedQueue(rawQueue, endpoint) }
    }

    @ReactMethod
    fun runner(endpoint: String){
        val resolvedURL = URL(endpoint.replace("wss://", "https://"))
        val scope = CoroutineScope(Dispatchers.Default + Job() )
        scope.launch { startSuspendedRunner(resolvedURL) }
    }

    private suspend fun startSuspendedQueue(rawQueue: String, endpoint: String){
        withContext(Dispatchers.Default) {
            if (queueTask != null && !queueTask!!.isStopped) {
                Timber.d("$tag: \t replacing rawQueue $rawQueue")
                queueTask!!.setRawQueue(rawQueue)
            } else {
                Timber.d("$tag: \t starting new queue $rawQueue")
                queueTask = Queue(rawQueue, endpoint, eventEmitter, bleManager)
            }
        }
    }

    private suspend fun startSuspendedRunner(resolvedURL: URL) {
        withContext(Dispatchers.Default) {
            runnerTask = Runner(
                resolvedURL,
                "",
                bleManager,
                {
                    eventEmitter.dispatch(Arguments.createMap().apply {
                        putString("event", "task")
                        putString("type", RunnerAction.runComplete.toString())
                        putMap("data", null)
                    })
                },
                { action: RunnerAction, data: WritableMap ->
                    if (action == RunnerAction.runProgress) {
                        eventEmitter.dispatch(
                            com.facebook.react.bridge.Arguments.createMap().apply {
                                putString("event", "task")
                                putString(
                                    "type",
                                    com.hwtransportreactnativeble.tasks.RunnerAction.runBulkProgress.toString()
                                )
                                putMap("data", data)
                            })
                    } else {
                        eventEmitter.dispatch(Arguments.createMap().apply {
                            putString("event", "task")
                            putString("type", action.toString())
                            putMap("data", data)
                        })
                    }
                },
                {
                    eventEmitter.dispatch(Arguments.createMap().apply {
                        putString("event", "task")
                        putString("type", RunnerAction.runComplete.toString())
                        putMap("data", null)
                    })
                }

            );
        }
    }
}

