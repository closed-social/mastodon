import {
  ArrowsClockwiseIcon,
  BookmarkSimpleIcon,
  HeartIcon,
  QuotesIcon,
} from '@phosphor-icons/react';

import { isRedesignEnabled } from '@/flavours/glitch/utils/environment';
import BookmarkLegacyIcon from '@/material-icons/400-24px/bookmark-fill.svg?react';
import BookmarkBorderLegacyIcon from '@/material-icons/400-24px/bookmark.svg?react';
import ChatBubbleIcon from '@/material-icons/400-24px/chat_bubble.svg?react';
import QuoteLegacyIcon from '@/material-icons/400-24px/format_quote-fill.svg?react';
import ForumIcon from '@/material-icons/400-24px/forum.svg?react';
import BoostLegacyIcon from '@/material-icons/400-24px/repeat.svg?react';
import BoostActiveIcon from '@/svg-icons/boost_active.svg?react';
import BoostActiveLegacyIcon from '@/svg-icons/repeat_active.svg?react';

import { iconWeight } from '../icon';

export const StatusReplyIcon = ChatBubbleIcon;
export const StatusReplyAllIcon = ForumIcon;
export const StatusQuoteIcon = isRedesignEnabled()
  ? QuoteLegacyIcon
  : QuotesIcon;
export const StatusBoostIcon = isRedesignEnabled()
  ? ArrowsClockwiseIcon
  : BoostLegacyIcon;
export const StatusBoostActiveIcon = isRedesignEnabled()
  ? BoostActiveIcon
  : BoostActiveLegacyIcon;
export const StatusLikeIcon = HeartIcon;
export const StatusLikeActiveIcon = iconWeight(HeartIcon, 'fill');
export const StatusBookmarkIcon = isRedesignEnabled()
  ? BookmarkSimpleIcon
  : BookmarkBorderLegacyIcon;
export const StatusBookmarkActiveIcon = isRedesignEnabled()
  ? iconWeight(BookmarkSimpleIcon, 'fill')
  : BookmarkLegacyIcon;
