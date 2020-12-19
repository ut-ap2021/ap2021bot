import { RTMClient } from '@slack/rtm-api';
import { WebClient } from '@slack/web-api';
import { stripIndent } from 'common-tags';
import { JSDOM } from 'jsdom';
import assert from 'assert';
import mongodb from 'mongodb';

interface AdventarArticle {
  user: { uid: number; name: string; iconURI: string };
  articleURI: string | null;
}

interface AdventarCalendarSnapshot {
  title: string;
  year: number;
  pageID: number;
  entryList: Array<AdventarArticle | null>;
}

const fetchAdventarSnapshot = async (pageID: number) => {
  const url = `https://adventar.org/calendars/${pageID}`;
  const document = (await JSDOM.fromURL(url)).window.document;
  const title = document.getElementsByClassName('title')[0].innerHTML;
  const year = (() => {
    const matchedYear = title.match(/(\d+)$/);
    assert(matchedYear);
    return parseInt(matchedYear[1]);
  })();
  const entryList = Array<AdventarArticle | null>(26).fill(null);

  Array.from(
    document.getElementsByClassName('EntryList')[0].childNodes
  ).forEach((entry: ChildNode) => {
    const elemEntry = entry as HTMLElement;
    const elemHead = elemEntry.getElementsByClassName('head')[0];
    const elemArticle = elemEntry.getElementsByClassName('article')[0];
    const date = parseInt(
      elemHead.getElementsByClassName('date')[0].innerHTML.substr(3),
      10
    );
    const user = {
      uid: parseInt(
        (elemHead
          .getElementsByTagName('a')[0]
          .getAttribute('href') as string).substr(7)
      ),
      name: elemHead.getElementsByTagName('a')[0].innerHTML,
      iconURI: elemHead
        .getElementsByTagName('img')[0]
        .getAttribute('src') as string,
    };
    const articleURI = elemArticle
      ? elemArticle.getElementsByTagName('a')[0].getAttribute('href')
      : null;

    entryList[date] = { user, articleURI };
  });

  return {
    title,
    year,
    pageID,
    entryList,
  } as AdventarCalendarSnapshot;
};

const MongoClient = mongodb.MongoClient;

/*
const testMongo = async () => {
  require('dotenv').config();
  const client = await MongoClient.connect(process.env.MONGODB_URI as string, {
    useUnifiedTopology: true,
  });
  const db = client.db('adventar');
  console.log('db connected');
  console.log(await db.collection('adventar_snapshots').findOne({ a: 'val' }));
  if (await db.collection('adventar_snapshots').findOne({})) {
    console.log('has data');
  }
  client.close();
};

testMongo();
*/

export default async ({
  rtmClient: rtm,
  webClient: slack,
}: {
  rtmClient: RTMClient;
  webClient: WebClient;
}): Promise<void> => {
  const postMessage = async (text: string) => {
    await slack.chat.postMessage({
      text,
      channel: process.env.CHANNEL_SANDBOX as string,
      username: 'Advent Calendar',
      icon_emoji: 'calendar',
      unfurl_links: true,
    });
  };

  const client = await MongoClient.connect(process.env.MONGODB_URI as string, {
    useUnifiedTopology: true,
  });
  const clSnapshots = client.db('adventar').collection('adventar_snapshots');
  let hasSnapshot = !!clSnapshots.find({});

  const notifyAdventarCalendarsUpdate = async () => {
    if (!hasSnapshot) return;
    await clSnapshots.find().forEach(async (ss: AdventarCalendarSnapshot) => {
      const ssNew = await fetchAdventarSnapshot(ss.pageID);
      assert(ssNew);
      for (let i = 1; i <= 25; i++) {
        if (!ss.entryList[i] && ssNew.entryList[i]) {
          postMessage(
            `『<https://adventar.org/calendars/${ss.pageID}|*${ss.title}*>』の${i}日目に *${ssNew.entryList[i]?.user.name}* さんが登録したよ:demand_2:`
          );
        }
        if (ss.entryList[i] && !ssNew.entryList[i]) {
          postMessage(
            `『<https://adventar.org/calendars/${ss.pageID}|*${ss.title}*>』の${i}日目の登録がキャンセルされたよ:cry:`
          );
        }
        if (
          (!ss.entryList[i] || !ss.entryList[i]?.articleURI) &&
          ssNew.entryList[i] &&
          ssNew.entryList[i]?.articleURI
        ) {
          postMessage(
            stripIndent`
            『<https://adventar.org/calendars/${ss.pageID}|*${ss.title}*>』の${i}日目の *${ssNew.entryList[i]?.user.name}* さんの記事が公開されたよ:tada::iihanashi::valuable_information:
            <${ssNew.entryList[i]?.articleURI}>`
          );
        }
        if (
          ss.entryList[i] &&
          ss.entryList[i]?.articleURI &&
          (!ssNew.entryList[i] || !ssNew.entryList[i]?.articleURI)
        ) {
          postMessage(
            stripIndent`
            『<https://adventar.org/calendars/${ss.pageID}|*${ss.title}*>』の${i}日目の記事の公開が取り下げられたよ:cry:`
          );
        }
      }
      clSnapshots.updateOne(
        { pageID: ss.pageID },
        { $set: { entryList: ssNew.entryList } }
      );
    });
  };

  setInterval(notifyAdventarCalendarsUpdate, 60 * 1000);

  rtm.on('message', async (message) => {
    if (message.channel !== process.env.CHANNEL_SANDBOX) {
      return;
    }
    if (
      message.subtype === 'bot_message' ||
      message.subtype === 'slackbot_response'
    ) {
      return;
    }
    if (!message.text) {
      return;
    }

    // アドカレ登録
    if (
      message.text.match(
        /^@advent\sregister\s<https:\/\/adventar\.org\/calendars\/(\d+)(\|.*)?>$/
      )
    ) {
      const pageID = parseInt(
        message.text.match(
          /^@advent\sregister\s<https:\/\/adventar\.org\/calendars\/(\d+)(\|.*)?>$/
        )[1]
      );
      if (await clSnapshots.findOne({ pageID })) {
        postMessage(
          'そのアドベントカレンダーはすでに登録されているよ:yosasou:'
        );
        return;
      } else {
        try {
          const ss = await fetchAdventarSnapshot(pageID);
          const date = new Date();
          date.setHours(date.getUTCHours() + 9);
          if (ss.year < date.getFullYear()) {
            postMessage('終了したアドベントカレンダーは登録できないよ:cry:');
            return;
          } else {
            clSnapshots.insertOne(ss);
            hasSnapshot = true;
            postMessage(
              `『<https://adventar.org/calendars/${ss.pageID}|*${ss.title}*>』を登録したよ:demand_2:`
            );
          }
        } catch (e) {
          postMessage(
            stripIndent`
              :cry:読み込みエラー
              <https://adventar.org/calendars/${pageID}|https://adventar.org/calendars/${pageID}> は存在しない可能性があります`
          );
          return;
        }
      }
    }

    // アドカレ一覧
    if (message.text.match(/^@advent list$/)) {
      const advents = clSnapshots.find({});
      let adventsStr = '登録されたアドカレ：\n';
      if (advents) {
        await advents.forEach((ss: AdventarCalendarSnapshot) => {
          adventsStr += `- 『<https://adventar.org/calendars/${ss.pageID}|*${ss.title}*>』\n`;
        });
      } else {
        adventsStr += '該当なし\n';
      }
      postMessage(adventsStr);
    }
  });
};
