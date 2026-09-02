export enum NsWebhookEvent {
    MINIAPP_ADDED = 'miniapp_added',
    NOTIFICATIONS_ENABLED = 'notifications_enabled',
    NOTIFICATIONS_DISABLED = 'notifications_disabled',
    MINIAPP_REMOVED = 'miniapp_removed',
}

export interface NotificationDetails {
    url: string;
    token: string;
}

interface BaseNsWebhookPayload {
    senderId: string;
    userAddress?: string;
}

export interface MiniappAddedPayload extends BaseNsWebhookPayload {
    event: NsWebhookEvent.MINIAPP_ADDED;
    notificationDetails: NotificationDetails;
}

export interface NotificationsEnabledPayload extends BaseNsWebhookPayload {
    event: NsWebhookEvent.NOTIFICATIONS_ENABLED;
    notificationDetails: NotificationDetails;
}

export interface NotificationsDisabledPayload extends BaseNsWebhookPayload {
    event: NsWebhookEvent.NOTIFICATIONS_DISABLED;
}

export interface MiniappRemovedPayload extends BaseNsWebhookPayload {
    event: NsWebhookEvent.MINIAPP_REMOVED;
}

export type NsWebhookPayload =
    | MiniappAddedPayload
    | NotificationsEnabledPayload
    | NotificationsDisabledPayload
    | MiniappRemovedPayload;

export interface SvixHeaders {
    svixId?: string;
    svixTimestamp?: string;
    svixSignature?: string;
}
