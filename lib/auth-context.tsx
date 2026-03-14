import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PIN_KEY = "@contas_app_pin";
const AUTHENTICATED_KEY = "@contas_app_authenticated";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 horas

interface AuthContextValue {
  isAuthenticated: boolean;
  hasPin: boolean;
  isLoaded: boolean;
  login: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  skipPin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [pin, sessionJson] = await Promise.all([
          AsyncStorage.getItem(PIN_KEY),
          AsyncStorage.getItem(AUTHENTICATED_KEY),
        ]);

        setHasPin(!!pin);

        if (!pin) {
          // Sem PIN configurado → entrada livre
          setIsAuthenticated(true);
        } else if (sessionJson) {
          const session = JSON.parse(sessionJson) as { at: number };
          const elapsed = Date.now() - session.at;
          if (elapsed < SESSION_TTL_MS) {
            setIsAuthenticated(true);
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoaded(true);
      }
    }
    load();
  }, []);

  const login = useCallback(async (pin: string): Promise<boolean> => {
    const stored = await AsyncStorage.getItem(PIN_KEY);
    if (stored === pin) {
      await AsyncStorage.setItem(AUTHENTICATED_KEY, JSON.stringify({ at: Date.now() }));
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const setPin = useCallback(async (pin: string) => {
    await AsyncStorage.setItem(PIN_KEY, pin);
    await AsyncStorage.setItem(AUTHENTICATED_KEY, JSON.stringify({ at: Date.now() }));
    setHasPin(true);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(AUTHENTICATED_KEY);
    setIsAuthenticated(false);
  }, []);

  // Entrar sem configurar PIN (pular)
  const skipPin = useCallback(async () => {
    await AsyncStorage.removeItem(PIN_KEY);
    await AsyncStorage.setItem(AUTHENTICATED_KEY, JSON.stringify({ at: Date.now() }));
    setHasPin(false);
    setIsAuthenticated(true);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, hasPin, isLoaded, login, setPin, logout, skipPin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
