import { RTMClient } from '@slack/rtm-api';
import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';
dotenv.config();

// Read a token from the environment variables
const token = process.env.SLACK_BOT_TOKEN as string;

// Initialize
const rtm = new RTMClient(token);
const slack = new WebClient(token);

const startupMessage = 'わいわい (起動音)';

rtm.start().then(() => {
  console.log('ap2021bot successfully started!');
});

const botNames: string[] = ['hitandblow'];

const bots = Object.fromEntries(
  botNames.map((name: string) => [
    name,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(`./${name}`) as ({
      rtmClient: rtm,
      webClient: slack,
    }: {
      rtmClient: RTMClient;
      webClient: WebClient;
    }) => void,
  ])
);

const startBots = async () => {
  await Promise.all(
    Object.entries(bots).map(async ([name, startFunc]) => {
      startFunc({ rtmClient: rtm, webClient: slack });
      console.log(`bot "${name}" successfully started!`);
    })
  );
};

startBots();

slack.chat.postMessage({
  channel: process.env.CHANNEL_SANDBOX as string,
  text: startupMessage,
});
