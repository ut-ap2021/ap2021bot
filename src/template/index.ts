import { RTMClient } from '@slack/rtm-api';
import { WebClient } from '@slack/web-api';

export default ({
  rtmClient: rtm,
  webClient: slack,
}: {
  rtmClient: RTMClient;
  webClient: WebClient;
}): void => {
  rtm;
  slack;
  return;
};
