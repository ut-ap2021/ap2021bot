// Inspired by tsgbot

import { RTMClient } from '@slack/rtm-api';
import { WebClient } from '@slack/web-api';

export default ({
  rtmClient: rtm,
  webClient: slack,
}: {
  rtmClient: RTMClient;
  webClient: WebClient;
}): void => {
  rtm.on('emoji_changed', async (emoji_data) => {
    if (emoji_data.subtype === 'add') {
      const message = await slack.chat.postMessage({
        text: `絵文字:${emoji_data.name}:が追加されたよ:pro::thanks::100::tada:`,
        channel: process.env.CHANNEL_SANDBOX as string,
        username: 'emoji-notifier',
        icon_emoji: emoji_data.name,
      });
      await slack.reactions.add({
        name: emoji_data.name,
        channel: message.channel as string,
        timestamp: message.ts as string,
      });
    } else if (emoji_data.subtype === 'remove') {
      await slack.chat.postMessage({
        text: `絵文字:${emoji_data.names[0]}:${
          emoji_data.names.length > 1 ? 'とそのエイリアス' : ''
        }が削除されたよ:cry::pien::違憲::残念:`,
        channel: process.env.CHANNEL_SANDBOX as string,
        username: 'emoji-notifier',
        icon_emoji: 'cry',
      });
    }
  });
};
