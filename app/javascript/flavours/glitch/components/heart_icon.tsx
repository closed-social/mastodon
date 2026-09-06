import { HeartIcon } from '@phosphor-icons/react';

import type { IconProp } from './icon';

export { HeartIcon };

export const HeartFillIcon: IconProp = (props) => (
  <HeartIcon {...props} weight='fill' />
);
