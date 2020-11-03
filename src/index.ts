import { RTMClient } from "@slack/rtm-api";
import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";
dotenv.config();

// Read a token from the environment variables
const token = process.env.SLACK_BOT_TOKEN as string;

// Initialize
const rtm = new RTMClient(token);
const slack = new WebClient(token);

rtm.start().then(() => {
  console.log("ap2021bot successfully started!");
});

const botNames: string[] = ["hitandblow"];

const bots = Object.fromEntries(
  botNames.map((name) => [
    name,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(`./${name}`) as (rtm: RTMClient, slack: WebClient) => void,
  ])
);

const startBots = async () => {
  await Promise.all(
    Object.entries(bots).map(async ([name, startFunc]) => {
      startFunc(rtm, slack);
      console.log(`bot "${name}" successfully started!`);
    })
  );
};

startBots();
