import { RTMClient } from '@slack/rtm-api';
import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';
dotenv.config();

// Read a token from the environment variables
const token = process.env.SLACK_BOT_TOKEN as string;

// Initialize
const rtm = new RTMClient(token);
const slack = new WebClient(token);

const botNames: string[] = [
  'hitandblow',
  'emoji-notifier',
  'channel-notifier',
  'adventar',
];

const startupMessage = 'わいわい (起動音)';

(async () => {
  const bots = await (async () => {
    const botsArray: [string, typeof import('./template')][] = [];
    /*const botsArray: [
      string,
      ({
        rtmClient: rtm,
        webClient: slack,
      }: {
        rtmClient: RTMClient;
        webClient: WebClient;
      }) => void
    ][] = [];*/
    for (let i = 0; i < botNames.length; i++) {
      const botFunc = await import(`./${botNames[i]}`);
      /*const botFunc = (await import(`./${botNames[i]}`)) as ({
        rtmClient: rtm,
        webClient: slack,
      }: {
        rtmClient: RTMClient;
        webClient: WebClient;
      }) => void;*/
      botsArray.push([botNames[i], botFunc]);
    }
    return Object.fromEntries(botsArray);
  })();

  const startBots = async () => {
    await Promise.all(
      Object.entries(bots).map(async ([name, bot]) => {
        bot.default({ rtmClient: rtm, webClient: slack });
        console.log(`bot "${name}" successfully started!`);
      })
    );
  };

  startBots();

  rtm.start().then(() => {
    console.log('ap2021bot successfully started!');
  });

  slack.chat.postMessage({
    channel: process.env.CHANNEL_SANDBOX as string,
    text: startupMessage,
  });
})();
