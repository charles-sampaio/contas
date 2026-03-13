// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "list.bullet": "list",
  "clock.fill": "history",
  "gearshape.fill": "settings",
  "plus": "add",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  "trash.fill": "delete",
  "pencil": "edit",
  "bell.fill": "notifications",
  "bell.slash.fill": "notifications-off",
  "calendar": "calendar-today",
  "dollarsign.circle.fill": "attach-money",
  "arrow.left": "arrow-back",
  "arrow.right": "arrow-forward",
  "ellipsis": "more-horiz",
  "square.and.pencil": "edit-note",
  "repeat": "repeat",
  "tag.fill": "label",
  "exclamationmark.triangle.fill": "warning",
  "info.circle.fill": "info",
  "checkmark.square.fill": "check-box",
  "square": "check-box-outline-blank",
  "arrow.up.arrow.down": "swap-vert",
  "magnifyingglass": "search",
  "moon.fill": "dark-mode",
  "sun.max.fill": "light-mode",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
