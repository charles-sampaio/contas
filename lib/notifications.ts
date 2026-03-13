import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Bill, NotificationAdvance } from "./types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("bills", {
      name: "Contas & Boletos",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1E6FD9",
      description: "Lembretes de vencimento de contas",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleBillNotification(
  bill: Bill,
  advanceDays: NotificationAdvance,
  notificationHour = 9,
  notificationMinute = 0
): Promise<string | undefined> {
  if (!bill.notificationEnabled) return undefined;

  const [year, month, day] = bill.dueDate.split("-").map(Number);
  const triggerDate = new Date(year, month - 1, day - advanceDays, notificationHour, notificationMinute, 0);

  // Don't schedule if date is in the past
  if (triggerDate <= new Date()) return undefined;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: advanceDays === 0 ? "Conta vence hoje!" : `Conta vence em ${advanceDays} dia${advanceDays !== 1 ? "s" : ""}`,
        body: `${bill.name} — R$ ${bill.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        data: { billId: bill.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === "android" ? "bills" : undefined,
      } as Notifications.DateTriggerInput,
    });
    return id;
  } catch {
    return undefined;
  }
}

export async function cancelBillNotification(notificationId?: string): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}

export async function cancelAllBillNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}
