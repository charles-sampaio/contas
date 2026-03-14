import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  Image,
  Alert,
  Vibration,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-context";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const PIN_LENGTH = 4;

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function hapticError() {
  if (Platform.OS !== "web") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } else {
    Vibration.vibrate(300);
  }
}

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login, setPin, hasPin, skipPin } = useAuth();

  const [pin, setCurrentPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [mode, setMode] = useState<"enter" | "create" | "confirm">(hasPin ? "enter" : "create");
  const [error, setError] = useState("");

  // Shake animation for wrong PIN
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    hapticError();
    setCurrentPin("");
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (pin.length < PIN_LENGTH) return;

    if (mode === "enter") {
      login(pin).then((ok) => {
        if (ok) {
          router.replace("/(tabs)");
        } else {
          setError("PIN incorreto. Tente novamente.");
          shake();
        }
      });
    } else if (mode === "create") {
      setConfirmPin("");
      setMode("confirm");
      setCurrentPin("");
      setError("");
    } else if (mode === "confirm") {
      if (pin === confirmPin) {
        setPin(pin).then(() => router.replace("/(tabs)"));
      } else {
        setError("PINs não coincidem. Tente novamente.");
        shake();
        setMode("create");
        setConfirmPin("");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  // Save the first PIN entry when transitioning to confirm
  useEffect(() => {
    if (mode === "confirm" && confirmPin === "") {
      // confirmPin is being set externally when mode changes
    }
  }, [mode, confirmPin]);

  const handleDigit = (d: string) => {
    if (pin.length >= PIN_LENGTH) return;
    haptic();
    setError("");
    setCurrentPin((p) => p + d);
  };

  const handleDelete = () => {
    haptic();
    setCurrentPin((p) => p.slice(0, -1));
    setError("");
  };

  const handleSkip = () => {
    Alert.alert(
      "Entrar sem PIN",
      "Você não vai precisar de senha para abrir o app. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => skipPin().then(() => router.replace("/(tabs)")),
        },
      ]
    );
  };

  // Capture confirmPin at the moment create is complete
  const handleDigitCreate = (d: string) => {
    if (pin.length >= PIN_LENGTH) return;
    haptic();
    setError("");
    const next = pin + d;
    if (mode === "create" && next.length === PIN_LENGTH) {
      setConfirmPin(next);
    }
    setCurrentPin(next);
  };

  const onPressDigit = mode === "create" ? handleDigitCreate : handleDigit;

  const subtitle =
    mode === "enter"
      ? "Digite seu PIN para acessar"
      : mode === "create"
      ? "Crie um PIN de 4 dígitos"
      : "Confirme seu PIN";

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => i < pin.length);

  const s = styles(colors);

  return (
    <View style={s.container}>
      {/* Header / Logo */}
      <View style={s.topSection}>
        <View style={[s.logoCircle, { backgroundColor: colors.primary }]}>
          <Text style={s.logoText}>CB</Text>
        </View>
        <Text style={s.appName}>Contas & Boletos</Text>
        <Text style={s.version}>v{APP_VERSION}</Text>
      </View>

      {/* PIN area */}
      <View style={s.pinSection}>
        <Text style={[s.subtitle, { color: colors.muted }]}>{subtitle}</Text>

        {/* Dots */}
        <Animated.View style={[s.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {dots.map((filled, i) => (
            <View
              key={i}
              style={[
                s.dot,
                {
                  backgroundColor: filled ? colors.primary : "transparent",
                  borderColor: filled ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </Animated.View>

        {!!error && <Text style={[s.errorText, { color: colors.error }]}>{error}</Text>}

        {/* Numpad */}
        <View style={s.numpad}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) => {
            if (key === "") {
              return <View key="empty" style={s.numKey} />;
            }
            if (key === "⌫") {
              return (
                <Pressable
                  key="del"
                  style={({ pressed }) => [s.numKey, s.numKeyBtn, { opacity: pressed ? 0.5 : 1 }]}
                  onPress={handleDelete}
                >
                  <Text style={[s.numKeyText, { color: colors.foreground }]}>⌫</Text>
                </Pressable>
              );
            }
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  s.numKey,
                  s.numKeyBtn,
                  { backgroundColor: pressed ? colors.border : colors.surface },
                ]}
                onPress={() => onPressDigit(key)}
              >
                <Text style={[s.numKeyText, { color: colors.foreground }]}>{key}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Skip option (only when creating) */}
        {mode === "create" && (
          <Pressable style={s.skipBtn} onPress={handleSkip}>
            <Text style={[s.skipText, { color: colors.muted }]}>Entrar sem PIN</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    topSection: {
      alignItems: "center",
      gap: 8,
    },
    logoCircle: {
      width: 80,
      height: 80,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    logoText: {
      color: "#fff",
      fontSize: 30,
      fontWeight: "700",
      letterSpacing: 1,
    },
    appName: {
      fontSize: 22,
      fontWeight: "600",
      color: colors.foreground,
      letterSpacing: 0.3,
    },
    version: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: "400",
    },
    pinSection: {
      width: "100%",
      alignItems: "center",
      gap: 24,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: "500",
      textAlign: "center",
    },
    dotsRow: {
      flexDirection: "row",
      gap: 16,
    },
    dot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
    },
    errorText: {
      fontSize: 13,
      fontWeight: "500",
      textAlign: "center",
    },
    numpad: {
      flexDirection: "row",
      flexWrap: "wrap",
      width: 264,
      gap: 12,
      justifyContent: "center",
    },
    numKey: {
      width: 80,
      height: 80,
    },
    numKeyBtn: {
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    numKeyText: {
      fontSize: 26,
      fontWeight: "400",
    },
    skipBtn: {
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    skipText: {
      fontSize: 14,
      fontWeight: "500",
      textDecorationLine: "underline",
    },
  });
}
