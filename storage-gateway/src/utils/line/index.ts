import axios from 'axios';
import { env } from '../constant';
import logger from '../logger';
import * as crypto from 'crypto';

interface Notify {
  message: string;
  imageThumbnail?: string;
  imageFullsize?: string;
  imageFile?: any;
  stickerPackageId?: number;
  stickerId?: number;
  notificationDisabled?: boolean;
}

// LINE Bot Message Types
interface TextMessage {
  type: 'text';
  text: string;
}

interface StickerMessage {
  type: 'sticker';
  packageId: string;
  stickerId: string;
}

interface ImageMessage {
  type: 'image';
  originalContentUrl: string;
  previewImageUrl: string;
}

interface FlexMessage {
  type: 'flex';
  altText: string;
  contents: any;
}

interface QuickReply {
  items: QuickReplyItem[];
}

interface QuickReplyItem {
  type: 'action';
  action: {
    type: 'message' | 'postback' | 'uri';
    label: string;
    text?: string;
    data?: string;
    uri?: string;
  };
}

type BotMessage = TextMessage | StickerMessage | ImageMessage | FlexMessage;

interface WebhookEvent {
  type: string;
  replyToken?: string;
  source: {
    type: 'user' | 'group' | 'room';
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    type: string;
    id: string;
    text?: string;
    packageId?: string;
    stickerId?: string;
  };
  postback?: {
    data: string;
  };
}

const LINE_API_BASE = 'https://api.line.me/v2/bot';

// Original notification function
const notify = async (payload: Notify) => {
  const formData = new FormData();

  formData.append('message', payload.message);
  if (payload.imageThumbnail)
    formData.append('imageThumbnail', payload.imageThumbnail);
  if (payload.imageFullsize)
    formData.append('imageFullsize', payload.imageFullsize);
  if (payload.imageFile) formData.append('imageFile', payload.imageFile);
  if (payload.stickerPackageId)
    formData.append('stickerPackageId', payload.stickerPackageId.toString());
  if (payload.stickerId)
    formData.append('stickerId', payload.stickerId.toString());
  if (payload.notificationDisabled !== undefined)
    formData.append(
      'notificationDisabled',
      payload.notificationDisabled.toString(),
    );

  try {
    const noti = await axios({
      method: 'POST',
      url: 'https://notify-api.line.me/api/notify',
      headers: {
        Authorization: `Bearer ${env.line.lineNotiAccessToken}`,
        'content-type': 'multipart/form-data',
      },
      data: formData,
    });

    return noti.data;
  } catch (error) {
    logger.error('Error sending LINE notification', { error, message: payload.message });
    return null;
  }
};

// LINE Bot Functions

// Verify webhook signature
const verifySignature = (body: string, signature: string): boolean => {
  try {
    const hash = crypto
      .createHmac('SHA256', env.line.lineBotChannelSecret || '')
      .update(body)
      .digest('base64');
    
    return hash === signature;
  } catch (error) {
    logger.error('Error verifying LINE webhook signature', { error });
    return false;
  }
};

// Reply to messages
const replyMessage = async (replyToken: string, messages: BotMessage[]): Promise<any> => {
  try {
    const response = await axios({
      method: 'POST',
      url: `${LINE_API_BASE}/message/reply`,
      headers: {
        'Authorization': `Bearer ${env.line.lineBotChannelAccessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        replyToken,
        messages,
      },
    });

    logger.info('LINE Bot reply sent successfully', { replyToken, messageCount: messages.length });
    return response.data;
  } catch (error) {
    logger.error('Error sending LINE Bot reply', { error, replyToken });
    return null;
  }
};

// Push message to user
const pushMessage = async (to: string, messages: BotMessage[]): Promise<any> => {
  try {
    const response = await axios({
      method: 'POST',
      url: `${LINE_API_BASE}/message/push`,
      headers: {
        'Authorization': `Bearer ${env.line.lineBotChannelAccessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        to,
        messages,
      },
    });

    logger.info('LINE Bot push message sent successfully', { to, messageCount: messages.length });
    return response.data;
  } catch (error) {
    logger.error('Error sending LINE Bot push message', { error, to });
    return null;
  }
};

// Multicast message to multiple users
const multicastMessage = async (to: string[], messages: BotMessage[]): Promise<any> => {
  try {
    const response = await axios({
      method: 'POST',
      url: `${LINE_API_BASE}/message/multicast`,
      headers: {
        'Authorization': `Bearer ${env.line.lineBotChannelAccessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        to,
        messages,
      },
    });

    logger.info('LINE Bot multicast message sent successfully', { userCount: to.length, messageCount: messages.length });
    return response.data;
  } catch (error) {
    logger.error('Error sending LINE Bot multicast message', { error, userCount: to.length });
    return null;
  }
};

// Get user profile
const getUserProfile = async (userId: string): Promise<any> => {
  try {
    const response = await axios({
      method: 'GET',
      url: `${LINE_API_BASE}/profile/${userId}`,
      headers: {
        'Authorization': `Bearer ${env.line.lineBotChannelAccessToken}`,
      },
    });

    logger.info('LINE Bot user profile retrieved', { userId });
    return response.data;
  } catch (error) {
    logger.error('Error getting LINE Bot user profile', { error, userId });
    return null;
  }
};

// Set rich menu
const setRichMenu = async (userId: string, richMenuId: string): Promise<any> => {
  try {
    const response = await axios({
      method: 'POST',
      url: `${LINE_API_BASE}/user/${userId}/richmenu/${richMenuId}`,
      headers: {
        'Authorization': `Bearer ${env.line.lineBotChannelAccessToken}`,
      },
    });

    logger.info('LINE Bot rich menu set successfully', { userId, richMenuId });
    return response.data;
  } catch (error) {
    logger.error('Error setting LINE Bot rich menu', { error, userId, richMenuId });
    return null;
  }
};

// Create rich menu
const createRichMenu = async (richMenu: any): Promise<any> => {
  try {
    const response = await axios({
      method: 'POST',
      url: `${LINE_API_BASE}/richmenu`,
      headers: {
        'Authorization': `Bearer ${env.line.lineBotChannelAccessToken}`,
        'Content-Type': 'application/json',
      },
      data: richMenu,
    });

    logger.info('LINE Bot rich menu created successfully', { richMenuId: response.data.richMenuId });
    return response.data;
  } catch (error) {
    logger.error('Error creating LINE Bot rich menu', { error });
    return null;
  }
};

// Helper function to create text message
const createTextMessage = (text: string): TextMessage => ({
  type: 'text',
  text,
});

// Helper function to create sticker message
const createStickerMessage = (packageId: string, stickerId: string): StickerMessage => ({
  type: 'sticker',
  packageId,
  stickerId,
});

// Helper function to create image message
const createImageMessage = (originalContentUrl: string, previewImageUrl?: string): ImageMessage => ({
  type: 'image',
  originalContentUrl,
  previewImageUrl: previewImageUrl || originalContentUrl,
});

// Helper function to create flex message
const createFlexMessage = (altText: string, contents: any): FlexMessage => ({
  type: 'flex',
  altText,
  contents,
});

// Helper function to create quick reply
const createQuickReply = (items: QuickReplyItem[]): QuickReply => ({
  items,
});

// Process webhook events
const processWebhookEvents = async (events: WebhookEvent[]): Promise<void> => {
  for (const event of events) {
    try {
      logger.info('Processing LINE Bot webhook event', { eventType: event.type, userId: event.source.userId });
      
      if (event.type === 'message' && event.replyToken) {
        await handleMessageEvent(event);
      } else if (event.type === 'postback' && event.replyToken) {
        await handlePostbackEvent(event);
      } else if (event.type === 'follow') {
        await handleFollowEvent(event);
      } else if (event.type === 'unfollow') {
        await handleUnfollowEvent(event);
      }
    } catch (error) {
      logger.error('Error processing LINE Bot webhook event', { error, event });
    }
  }
};

// Handle message events
const handleMessageEvent = async (event: WebhookEvent): Promise<void> => {
  if (!event.replyToken || !event.message) return;

  const { message } = event;
  
  if (message.type === 'text' && message.text) {
    // Echo the message back
    const replyMessages = [createTextMessage(`You said: ${message.text}`)];
    await replyMessage(event.replyToken, replyMessages);
  } else if (message.type === 'sticker') {
    // Reply with a sticker
    const replyMessages = [createStickerMessage('446', '1988')]; // Happy sticker
    await replyMessage(event.replyToken, replyMessages);
  }
};

// Handle postback events
const handlePostbackEvent = async (event: WebhookEvent): Promise<void> => {
  if (!event.replyToken || !event.postback) return;

  const { postback } = event;
  const replyMessages = [createTextMessage(`Postback received: ${postback.data}`)];
  await replyMessage(event.replyToken, replyMessages);
};

// Handle follow events
const handleFollowEvent = async (event: WebhookEvent): Promise<void> => {
  if (!event.replyToken) return;

  const welcomeMessage = createTextMessage('Thank you for following! 🎉');
  await replyMessage(event.replyToken, [welcomeMessage]);
};

// Handle unfollow events
const handleUnfollowEvent = async (event: WebhookEvent): Promise<void> => {
  logger.info('User unfollowed the bot', { userId: event.source.userId });
};

export const LINE = {
  // Original notification function
  notify,
  
  // Bot functions
  bot: {
    verifySignature,
    replyMessage,
    pushMessage,
    multicastMessage,
    getUserProfile,
    setRichMenu,
    createRichMenu,
    processWebhookEvents,
    
    // Message helpers
    createTextMessage,
    createStickerMessage,
    createImageMessage,
    createFlexMessage,
    createQuickReply,
    
    // Event handlers
    handleMessageEvent,
    handlePostbackEvent,
    handleFollowEvent,
    handleUnfollowEvent,
  },
};
