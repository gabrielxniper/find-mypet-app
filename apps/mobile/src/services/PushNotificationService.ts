import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ApiService } from './ApiService';

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

export class PushNotificationService {
    static async registerAndSync(): Promise<void> {
        if (isExpoGo) {
            console.log('[Push] Expo Go detectado — notificações ignoradas.');
            return;
        }

        try {
            const token = await this.getFcmToken();

            if (!token) {
                console.warn('[Push] Token FCM não obtido — notificações não serão enviadas.');
                return;
            }

            console.log('[Push] Token FCM obtido:', token);

            await ApiService.patch('/me/fcm-token', { fcm_token: token });
            console.log('[Push] Token FCM sincronizado com o backend com sucesso.');
        } catch (err) {
            console.warn('[Push] Falha ao registrar/sincronizar token:', err);
        }
    }

    private static async getFcmToken(): Promise<string | null> {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            console.log('[Push] Solicitando permissão de notificação...');
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('[Push] Permissão de notificação negada pelo usuário.');
            return null;
        }

        console.log('[Push] Permissão concedida.');

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('safezone_alerts', {
                name: 'Alertas de Zona Segura',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF6B00',
                sound: 'default',
            });
        }

        const tokenData = await Notifications.getDevicePushTokenAsync();
        return tokenData.data;
    }
}
