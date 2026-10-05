import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading, showSuccess, recovering } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <Stack>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!!session && showSuccess && !recovering}>
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
      </Stack.Protected>

      <Stack.Protected guard={!!session && !showSuccess && !recovering}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
      </Stack.Protected>

      {/* Last so it never becomes the starting screen; still reachable from the reset link. */}
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
