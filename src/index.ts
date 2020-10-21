import { RTMClient } from "@slack/rtm-api";
import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";
dotenv.config();

// Read a token from the environment variables
const token = process.env.SLACK_BOT_TOKEN as string;

// Initialize
const rtm = new RTMClient(token);
const slack = new WebClient(token);

rtm.start();

console.log("ap2021bot successfully started!");

rtm.on("message", async (message) => {
  console.log(message);
  if (message.text === "hello") {
    await slack.chat.postMessage({
      text: "Hello world",
      channel: process.env.CHANNEL_CONST as string,
    });
  }
});
