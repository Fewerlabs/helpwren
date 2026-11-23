import { SupportScreen, type IdentityState } from "@helpwren/react-native";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

// The Helpwren install to talk to. The Android emulator reaches this computer at 10.0.2.2.
const baseUrl =
  process.env.EXPO_PUBLIC_HELPWREN_URL ??
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000");
// Must be one of the install's sources. See README.md.
const source = process.env.EXPO_PUBLIC_HELPWREN_SOURCE ?? "mobile_app";

export default function App() {
  const [supportOpen, setSupportOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [identity, setIdentity] = useState<IdentityState | null>(null);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {supportOpen ? (
        <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
          <SupportScreen
            baseUrl={baseUrl}
            source={source}
            context={{ appVersion: "1.0.0", screen: "Home" }}
            onUnread={setUnread}
            onIdentity={setIdentity}
            onClose={() => {
              setSupportOpen(false);
            }}
          />
        </SafeAreaView>
      ) : (
        <SafeAreaView style={[styles.screen, styles.home]}>
          <Text style={styles.title}>Acme</Text>
          <Text style={styles.muted}>Helpwren at {baseUrl}</Text>
          <Text style={styles.muted}>Source: {source}</Text>
          {identity ? <Text style={styles.muted}>Chat: {identity.state}</Text> : null}

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={() => {
              setSupportOpen(true);
            }}
          >
            <Text style={styles.buttonText}>Contact support</Text>
            {unread > 0 ? (
              <View style={styles.badge} accessibilityLabel={`${unread} unread`}>
                <Text style={styles.badgeText}>{unread}</Text>
              </View>
            ) : null}
          </Pressable>
        </SafeAreaView>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  home: { padding: 24, gap: 6, justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 8 },
  muted: { color: "#6b7280" },
  button: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 14,
  },
  pressed: { opacity: 0.8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
