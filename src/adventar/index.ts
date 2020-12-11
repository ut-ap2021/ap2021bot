import { RTMClient } from '@slack/rtm-api';
import { WebClient } from '@slack/web-api';
import { range, shuffle, round } from 'lodash';
import { stripIndent } from 'common-tags';
import assert from 'assert';
