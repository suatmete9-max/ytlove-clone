package com.socialboost.app;

import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // WebView level permissions block
        this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
            // Disable Geolocation/Location popups
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, false, false);
            }

            // Disable Camera & Microphone requests
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.deny();
            }
        });
    }
}