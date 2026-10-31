package com.shoeb.meshaid;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom MeshPlugin before super.onCreate
        registerPlugin(MeshPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
