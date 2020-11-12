// Inspired by tsgbot

import { RTMClient } from '@slack/rtm-api';
import { WebClient } from '@slack/web-api';

const channelToNotify = process.env.CHANNEL_CHANNEL_NOTIFY as string;

export default ({
  rtmClient: rtm,
  webClient: slack,
}: {
  rtmClient: RTMClient;
  webClient: WebClient;
}): void => {
  rtm.on('channel_created', async (channel_data) => {
    await slack.chat.postMessage({
      text: `<@${channel_data.channel.creator}> さんがチャンネル <#${channel_data.channel.id}> を追加しました。`,
      channel: channelToNotify,
      username: 'channel-notifier',
      icon_emoji: 'new',
    });
  });

  rtm.on('channel_archived', async (channel_data) => {
    await slack.chat.postMessage({
      text: `<@${channel_data.user}> さんがチャンネル <#${channel_data.channel}> をアーカイブしました`,
      channel: channelToNotify,
      username: 'channel-notifier',
      icon_emoji: 'file_folder',
    });
  });

  rtm.on('channel_unarchived', async (channel_data) => {
    await slack.chat.postMessage({
      text: `<@${channel_data.user}> さんがチャンネル <#${channel_data.channel}> をアーカイブから復元しました`,
      channel: channelToNotify,
      username: 'channel-notifier',
      icon_emoji: 'open_file_folder',
    });
  });
};
