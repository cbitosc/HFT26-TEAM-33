package com.shoeb.meshaid;

import android.Manifest;
import android.content.Context;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import androidx.annotation.NonNull;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.AdvertisingOptions;
import com.google.android.gms.nearby.connection.ConnectionInfo;
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback;
import com.google.android.gms.nearby.connection.ConnectionResolution;
import com.google.android.gms.nearby.connection.ConnectionsClient;
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes;
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo;
import com.google.android.gms.nearby.connection.DiscoveryOptions;
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback;
import com.google.android.gms.nearby.connection.Payload;
import com.google.android.gms.nearby.connection.PayloadCallback;
import com.google.android.gms.nearby.connection.PayloadTransferUpdate;
import com.google.android.gms.nearby.connection.Strategy;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Top-class offline Bluetooth/BLE mesh using Google Nearby Connections P2P_CLUSTER.
 *
 * Deterministic connection tie-breaking:
 *  - Both nodes discover each other over BLE.
 *  - Node with alphabetically lower myName initiates requestConnection.
 *  - Node with higher myName waits to receive onConnectionInitiated.
 *  - Eliminates dual-initiation collisions and flapping disconnects completely!
 */
@CapacitorPlugin(
    name = "Mesh",
    permissions = {
        @Permission(alias = "mesh10", strings = {
            Manifest.permission.ACCESS_FINE_LOCATION
        }),
        @Permission(alias = "mesh12", strings = {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.BLUETOOTH_SCAN,
            Manifest.permission.BLUETOOTH_ADVERTISE,
            Manifest.permission.BLUETOOTH_CONNECT
        }),
        @Permission(alias = "mesh13", strings = {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.BLUETOOTH_SCAN,
            Manifest.permission.BLUETOOTH_ADVERTISE,
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.NEARBY_WIFI_DEVICES
        })
    }
)
public class MeshPlugin extends Plugin {

    private static final String TAG        = "MeshPlugin";
    private static final String SERVICE_ID = "com.shoeb.meshaid.mesh";
    private static final Strategy STRATEGY = Strategy.P2P_CLUSTER;

    private ConnectionsClient client;
    private String myName   = "node";
    private boolean running = false;

    // Active connection bookkeeping
    private final Set<String> connected  = ConcurrentHashMap.newKeySet();
    private final Set<String> connecting = ConcurrentHashMap.newKeySet();
    private final ConcurrentHashMap<String, String> endpointNames = new ConcurrentHashMap<>();

    // Native hardware emergency buzzer and siren
    private Vibrator vibrator;
    private volatile boolean isSirenRunning = false;
    private Thread sirenThread;

    private String permAlias() {
        if (Build.VERSION.SDK_INT >= 33) return "mesh13";
        if (Build.VERSION.SDK_INT >= 31) return "mesh12";
        return "mesh10";
    }

    @PluginMethod
    public void start(PluginCall call) {
        myName = call.getString("name", "node");
        Log.d(TAG, "start() mesh requested as: " + myName);

        String alias = permAlias();
        if (getPermissionState(alias) != PermissionState.GRANTED) {
            requestPermissionForAlias(alias, call, "permsCallback");
            return;
        }
        begin(call);
    }

    @PermissionCallback
    private void permsCallback(PluginCall call) {
        begin(call);
    }

    private void begin(PluginCall call) {
        if (running) {
            if (call != null) call.resolve();
            return;
        }

        if (call != null) {
            myName = call.getString("name", myName);
        }
        Log.d(TAG, "begin() starting advertising & discovery as: " + myName);

        client = Nearby.getConnectionsClient(getContext());
        running = true;

        AdvertisingOptions adv = new AdvertisingOptions.Builder()
            .setStrategy(STRATEGY)
            .build();

        DiscoveryOptions disc = new DiscoveryOptions.Builder()
            .setStrategy(STRATEGY)
            .build();

        client.startAdvertising(myName, SERVICE_ID, lifecycleCallback, adv)
            .addOnSuccessListener(unused -> Log.d(TAG, "startAdvertising SUCCESS"))
            .addOnFailureListener(e -> {
                Log.e(TAG, "startAdvertising FAILED: " + e.getMessage());
                notifyError("advertising", e);
            });

        client.startDiscovery(SERVICE_ID, discoveryCallback, disc)
            .addOnSuccessListener(unused -> Log.d(TAG, "startDiscovery SUCCESS"))
            .addOnFailureListener(e -> {
                Log.e(TAG, "startDiscovery FAILED: " + e.getMessage());
                notifyError("discovery", e);
            });

        if (call != null) call.resolve();
    }

    @PluginMethod
    public void send(PluginCall call) {
        String data   = call.getString("data");
        String target = call.getString("target");
        JSObject ret  = new JSObject();

        if (data == null) {
            call.reject("No data provided");
            return;
        }
        if (client == null || connected.isEmpty()) {
            ret.put("sent", 0);
            call.resolve(ret);
            return;
        }

        Payload payload = Payload.fromBytes(data.getBytes(StandardCharsets.UTF_8));

        try {
            if (target != null && !target.isEmpty() && connected.contains(target)) {
                // Direct targeted transmission to specific endpoint
                ArrayList<String> singleTarget = new ArrayList<>();
                singleTarget.add(target);
                client.sendPayload(singleTarget, payload);
                ret.put("sent", 1);
            } else {
                // Broadcast transmission to all active mesh endpoints
                client.sendPayload(new ArrayList<>(connected), payload);
                ret.put("sent", connected.size());
            }
        } catch (Exception e) {
            Log.e(TAG, "send() failed: " + e.getMessage());
            ret.put("sent", 0);
        }

        call.resolve(ret);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("running", running);
        ret.put("connected", connected.size());
        ret.put("myName", myName);
        JSArray arr = new JSArray();
        for (String id : connected) {
            JSObject p = new JSObject();
            p.put("endpointId", id);
            String name = endpointNames.get(id);
            p.put("name", name != null ? name : id);
            arr.put(p);
        }
        ret.put("peers", arr);
        call.resolve(ret);
    }

    @PluginMethod
    public void startSiren(PluginCall call) {
        startNativeSiren();
        call.resolve();
    }

    @PluginMethod
    public void stopSiren(PluginCall call) {
        stopNativeSiren();
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        shutdown();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        stopNativeSiren();
        shutdown();
        super.handleOnDestroy();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Discovery Callback with Deterministic Tie-Breaking
    // ─────────────────────────────────────────────────────────────────────────

    private final EndpointDiscoveryCallback discoveryCallback = new EndpointDiscoveryCallback() {
        @Override
        public void onEndpointFound(@NonNull String endpointId, @NonNull DiscoveredEndpointInfo info) {
            String peerName = info.getEndpointName();
            if (peerName == null || peerName.trim().isEmpty()) {
                peerName = "Node-" + endpointId.substring(0, Math.min(4, endpointId.length()));
            }
            endpointNames.put(endpointId, peerName);
            Log.d(TAG, "onEndpointFound: " + endpointId + " (" + peerName + ")");

            if (connected.contains(endpointId) || connecting.contains(endpointId)) {
                return;
            }

            // DETERMINISTIC TIE-BREAKING:
            // Compare device IDs (e.g. "NODE-A1B2" vs "NODE-C3D4").
            // Only the device whose ID is alphabetically smaller initiates the connection.
            // The other device simply waits to receive onConnectionInitiated.
            // This prevents simultaneous handshake collisions and constant reconnection flapping!
            if (myName.compareTo(peerName) < 0) {
                Log.d(TAG, "We have smaller name (" + myName + " < " + peerName + "). Initiating connection to " + endpointId);
                connecting.add(endpointId);
                client.requestConnection(myName, endpointId, lifecycleCallback)
                    .addOnFailureListener(e -> {
                        connecting.remove(endpointId);
                        Log.w(TAG, "requestConnection failed to " + endpointId + ": " + e.getMessage());
                    });
            } else {
                Log.d(TAG, "We have greater/equal name (" + myName + " >= " + peerName + "). Waiting for remote side to initiate.");
            }
        }

        @Override
        public void onEndpointLost(@NonNull String endpointId) {
            Log.d(TAG, "onEndpointLost: " + endpointId);
            connecting.remove(endpointId);
            if (connected.remove(endpointId)) {
                endpointNames.remove(endpointId);
                emitPeers();
            }
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle Callback
    // ─────────────────────────────────────────────────────────────────────────

    private final ConnectionLifecycleCallback lifecycleCallback = new ConnectionLifecycleCallback() {
        @Override
        public void onConnectionInitiated(@NonNull String endpointId, @NonNull ConnectionInfo info) {
            String name = info.getEndpointName();
            Log.d(TAG, "onConnectionInitiated from: " + endpointId + " (" + name + ")");
            if (name != null && !name.trim().isEmpty()) {
                endpointNames.put(endpointId, name);
            }
            connecting.remove(endpointId);
            // Auto-accept connection on both sides
            client.acceptConnection(endpointId, payloadCallback)
                .addOnSuccessListener(unused -> Log.d(TAG, "acceptConnection OK: " + endpointId))
                .addOnFailureListener(e -> Log.e(TAG, "acceptConnection failed: " + e.getMessage()));
        }

        @Override
        public void onConnectionResult(@NonNull String endpointId, @NonNull ConnectionResolution result) {
            connecting.remove(endpointId);
            int code = result.getStatus().getStatusCode();
            Log.d(TAG, "onConnectionResult: " + endpointId + " status=" + code);

            if (code == ConnectionsStatusCodes.STATUS_OK) {
                connected.add(endpointId);
                Log.i(TAG, "Connected successfully to " + endpointId + " (" + endpointNames.get(endpointId) + ")");
                emitPeers();
            } else {
                connected.remove(endpointId);
                endpointNames.remove(endpointId);
                emitPeers();
            }
        }

        @Override
        public void onDisconnected(@NonNull String endpointId) {
            Log.d(TAG, "onDisconnected: " + endpointId);
            connected.remove(endpointId);
            connecting.remove(endpointId);
            endpointNames.remove(endpointId);
            emitPeers();
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Payload Callback
    // ─────────────────────────────────────────────────────────────────────────

    private final PayloadCallback payloadCallback = new PayloadCallback() {
        @Override
        public void onPayloadReceived(@NonNull String endpointId, @NonNull Payload payload) {
            byte[] bytes = payload.asBytes();
            if (payload.getType() == Payload.Type.BYTES && bytes != null) {
                String raw = new String(bytes, StandardCharsets.UTF_8);
                Log.d(TAG, "onPayloadReceived from " + endpointId + " (" + bytes.length + " bytes)");
                JSObject o = new JSObject();
                o.put("from", endpointId);
                String fromName = endpointNames.get(endpointId);
                o.put("fromName", fromName != null ? fromName : endpointId);
                o.put("data", raw);
                notifyListeners("message", o);
            }
        }

        @Override
        public void onPayloadTransferUpdate(@NonNull String endpointId, @NonNull PayloadTransferUpdate update) {}
    };

    private void emitPeers() {
        JSObject o = new JSObject();
        int count = connected.size();
        o.put("count", count);
        JSArray arr = new JSArray();
        for (String id : connected) {
            JSObject p = new JSObject();
            p.put("endpointId", id);
            String name = endpointNames.get(id);
            p.put("name", name != null ? name : id);
            arr.put(p);
        }
        o.put("peers", arr);
        notifyListeners("peers", o);
    }

    private void notifyError(String where, Exception e) {
        JSObject o = new JSObject();
        o.put("where", where);
        o.put("error", e.getMessage() != null ? e.getMessage() : "unknown error");
        notifyListeners("error", o);
    }

    private void shutdown() {
        if (client != null) {
            try { client.stopAdvertising(); } catch (Exception ignored) {}
            try { client.stopDiscovery(); } catch (Exception ignored) {}
            try { client.stopAllEndpoints(); } catch (Exception ignored) {}
        }
        connected.clear();
        connecting.clear();
        endpointNames.clear();
        running = false;
        emitPeers();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Native Hardware SOS Siren
    // ─────────────────────────────────────────────────────────────────────────

    private synchronized void startNativeSiren() {
        if (isSirenRunning) return;
        isSirenRunning = true;

        if (vibrator == null) {
            Object svc = getContext().getSystemService(Context.VIBRATOR_SERVICE);
            if (svc instanceof Vibrator) vibrator = (Vibrator) svc;
        }

        sirenThread = new Thread(() -> {
            ToneGenerator tg = null;
            try {
                tg = new ToneGenerator(AudioManager.STREAM_ALARM, 100);
            } catch (Exception e) {
                try { tg = new ToneGenerator(AudioManager.STREAM_MUSIC, 100); }
                catch (Exception ignored) {}
            }

            while (isSirenRunning) {
                try {
                    if (vibrator != null) {
                        if (Build.VERSION.SDK_INT >= 26) {
                            vibrator.vibrate(VibrationEffect.createOneShot(350, VibrationEffect.DEFAULT_AMPLITUDE));
                        } else {
                            //noinspection deprecation
                            vibrator.vibrate(350);
                        }
                    }
                    if (tg != null) tg.startTone(ToneGenerator.TONE_CDMA_EMERGENCY_RINGBACK, 350);
                    Thread.sleep(380);
                    if (!isSirenRunning) break;
                    if (tg != null) tg.startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 350);
                    Thread.sleep(380);
                } catch (InterruptedException e) {
                    break;
                } catch (Exception ignored) {}
            }
            if (tg != null) { try { tg.release(); } catch (Exception ignored) {} }
        });
        sirenThread.setDaemon(true);
        sirenThread.start();
    }

    private synchronized void stopNativeSiren() {
        isSirenRunning = false;
        if (sirenThread != null) {
            sirenThread.interrupt();
            sirenThread = null;
        }
        if (vibrator != null) {
            try { vibrator.cancel(); } catch (Exception ignored) {}
        }
    }
}
