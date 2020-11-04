import { RTMClient } from '@slack/rtm-api';
import { WebClient } from '@slack/web-api';
import { range, shuffle } from 'lodash';
import { stripIndent } from 'common-tags';

interface HitAndBlowState {
  answer: number[];
  history: { call: number[]; hits: number; blows: number }[];
  thread?: string;
  inGame: boolean;
}

const isValidCall = (call: number[]) => {
  const numDict = Array<number>(10);
  for (let i = 0; i < call.length; i++) {
    if (numDict[call[i]] >= 1) {
      return false;
    }
    numDict[call[i]] = 1;
  }
  return true;
};

const countHit = (call: number[], answer: number[]) => {
  if (call.length !== answer.length) {
    throw new Error('Length of the call does not match the answer.');
  } else {
    let count = 0;
    for (let i = 0; i < call.length; i++) {
      if (call[i] === answer[i]) {
        count++;
      }
    }
    return count;
  }
};

// Hitも合わせて数える
const countBlow = (call: number[], answer: number[]) => {
  if (call.length !== answer.length) {
    throw new Error('Length of the call does not match the answer.');
  } else {
    let count = 0;
    const callArray = Array<number>(10);
    const ansArray = Array<number>(10);
    for (let i = 0; i < 10; i++) {
      callArray[i] = ansArray[i] = 0;
    }
    for (let i = 0; i < call.length; i++) {
      callArray[call[i]]++;
      ansArray[answer[i]]++;
    }
    for (let i = 0; i < 10; i++) {
      count += Math.min(callArray[i], ansArray[i]);
    }
    return count;
  }
};

module.exports = (rtm: RTMClient, slack: WebClient) => {
  const state: HitAndBlowState = {
    answer: [],
    history: [],
    thread: undefined,
    inGame: false,
  };
  const postHistory = async (
    history: { call: number[]; hits: number; blows: number }[]
  ) => {
    await slack.chat.postMessage({
      text: stripIndent`
      call履歴 \`\`\`${history
        .map(
          (hist: { call: number[]; hits: number; blows: number }) =>
            stripIndent`
          ${hist.call.map((dig: number) => String(dig)).join('')}: ${
              hist.hits
            } Hit ${hist.blows} Blow`
        )
        .join('\n')}\`\`\`
      `,
      channel: process.env.CHANNEL_SANDBOX as string,
      thread_ts: state.thread,
    });
  };
  rtm.on('message', async (message) => {
    if (message.channel !== process.env.CHANNEL_SANDBOX) {
      return;
    }
    if (message.subtype === 'bot_message') {
      return;
    }
    if (!message.text) {
      return;
    }

    // game開始処理
    if (message.text.match(/^hitandblow( \d+)?$/)) {
      if (state.inGame) {
        await slack.chat.postMessage({
          text: '進行中のゲームがあるよ:thinking_face:',
          channel: process.env.CHANNEL_SANDBOX as string,
          thread_ts: state.thread,
          reply_broadcast: true,
        });
        return;
      } else {
        const rawAnswerLength = message.text.match(/^hitandblow( \d+)?$/)[1];
        const answerLength =
          typeof rawAnswerLength !== 'undefined'
            ? parseInt(rawAnswerLength)
            : 4;
        if (answerLength <= 0 && 10 < answerLength) {
          await slack.chat.postMessage({
            text: '桁数は1以上10以下で指定してね:thinking_face:',
            channel: process.env.CHANNEL_SANDBOX as string,
          });
        } else {
          state.inGame = true;
          state.answer = shuffle(range(10)).slice(0, answerLength);
          const { ts } = await slack.chat.postMessage({
            text: stripIndent`
            Hit & Blow (${state.answer.length}桁) を開始します。
            スレッドに「call hoge」とコールしてね`,
            channel: process.env.CHANNEL_SANDBOX as string,
          });
          state.thread = ts as string;
          console.log(state.answer);
        }
      }
    }

    // call処理
    if (message.text.match(/^call +\d+$/)) {
      if (message.thread_ts !== state.thread) {
        return;
      } else {
        if (!state.inGame) {
          return;
        }
        const call = [
          ...message.text.match(/^call +(\d+)$/)[1],
        ].map((dig: string) => parseInt(dig));
        if (call.length !== state.answer.length) {
          await slack.chat.postMessage({
            text: `桁数が違うよ:thinking_face: (${state.answer.length}桁)`,
            channel: process.env.CHANNEL_SANDBOX as string,
            thread_ts: state.thread,
          });
        } else {
          if (!isValidCall(call)) {
            await slack.chat.postMessage({
              text:
                'call中に同じ数字を2個以上含めることはできないよ:thinking_face:',
              channel: process.env.CHANNEL_SANDBOX as string,
              thread_ts: state.thread,
            });
          } else {
            // validなcallの場合
            const hits = countHit(call, state.answer);
            const blows = countBlow(call, state.answer) - hits;
            state.history.push({ call, hits, blows });
            await slack.chat.postMessage({
              text: `\`${call
                .map((dig: number) => String(dig))
                .join('')}\`: ${hits} Hit ${blows} Blow`,
              channel: process.env.CHANNEL_SANDBOX as string,
              thread_ts: state.thread,
            });
            if (hits === state.answer.length) {
              await slack.chat.postMessage({
                text: stripIndent`
                <@${message.user}> 正解です:tada:
                答えは \`${state.answer
                  .map((dig: number) => String(dig))
                  .join('')}\` だよ:muscle:`,
                channel: process.env.CHANNEL_SANDBOX as string,
                thread_ts: state.thread,
                reply_broadcast: true,
              });
              postHistory(state.history);
              state.answer = [];
              state.history = [];
              state.thread = undefined;
              state.inGame = false;
            }
          }
        }
      }
    }

    // history処理
    if (message.text.match(/^history$/)) {
      if (message.thread_ts !== state.thread) {
        return;
      } else {
        postHistory(state.history);
      }
    }
  });
};
