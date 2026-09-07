import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { shallowEqual } from 'react-redux';

import { fetchContext } from 'flavours/glitch/actions/statuses_typed';
import { useVisibility } from 'flavours/glitch/hooks/useVisibility';
import type { Status } from 'flavours/glitch/models/status';
import { makeGetStatus } from 'flavours/glitch/selectors';
import { getDescendantsIds } from 'flavours/glitch/selectors/contexts';
import type { RootState } from 'flavours/glitch/store';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';

import { LoadMore } from './load_more';
import type { StatusContainerProps } from './status/types';
import type { StatusQuoteManagerProps } from './status_quoted';
import { StatusQuoteManager } from './status_quoted';

type StatusSelector = (
  state: RootState,
  props: Pick<StatusContainerProps, 'id' | 'contextType'>,
) => Status | null;

const CommentReplies = ({
  id,
  depth = 1,
  contextType,
  scrollKey,
}: Pick<StatusQuoteManagerProps, 'id' | 'contextType' | 'scrollKey'> & {
  depth?: number;
}) => {
  const getStatus = useMemo(() => makeGetStatus() as StatusSelector, []);
  const replies = useAppSelector(
    (state) =>
      getDescendantsIds(state, id)
        .filter((replyId) => state.contexts.inReplyTos[replyId] === id)
        .map((replyId) => getStatus(state, { id: replyId, contextType }))
        .filter((status) => status !== null),
    shallowEqual,
  );
  const [showAll, setShowAll] = useState(false);
  const showMore = useCallback(() => {
    setShowAll(true);
  }, []);

  if (replies.length === 0) return null;

  return (
    <div className='status__comments'>
      {(showAll ? replies : replies.slice(0, 3)).map((reply) => {
        const replyId = reply.get('id') as string;
        return (
          <div className='status-with-comments' key={replyId}>
            <StatusQuoteManager
              id={replyId}
              contextType={contextType}
              scrollKey={scrollKey}
              avatarSize={30}
            />
            {depth < 2 && !reply.get('matched_filters') && (
              <CommentReplies
                id={replyId}
                depth={depth + 1}
                contextType={contextType}
                scrollKey={scrollKey}
              />
            )}
          </div>
        );
      })}
      {!showAll && replies.length > 3 && <LoadMore onClick={showMore} />}
    </div>
  );
};

export const StatusWithComments = (props: StatusQuoteManagerProps) => {
  const dispatch = useAppDispatch();
  const getStatus = useMemo(() => makeGetStatus() as StatusSelector, []);
  const status = useAppSelector((state) => getStatus(state, props));
  const original = (status?.get('reblog') as Status | null) ?? status;
  const statusId = original?.get('id') as string | undefined;
  const repliesCount = original?.get('replies_count') as number | undefined;
  const showComments =
    !!original && !original.get('matched_filters') && !props.hidden;
  const { isIntersecting, observedRef } = useVisibility();
  const lastRequest = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!isIntersecting || !showComments || !statusId || !repliesCount) return;

    // Scrolling away and back should not reload the same context.
    const requestKey = `${statusId}:${repliesCount}`;
    if (lastRequest.current === requestKey) return;
    lastRequest.current = requestKey;
    void dispatch(fetchContext({ statusId })).then((action) => {
      if (fetchContext.rejected.match(action)) lastRequest.current = undefined;
    });
  }, [dispatch, isIntersecting, showComments, statusId, repliesCount]);

  if (!original) return null;

  return (
    <div className='status-with-comments' ref={observedRef}>
      <StatusQuoteManager {...props} />
      {showComments && statusId && (
        <CommentReplies
          key={statusId}
          id={statusId}
          contextType={props.contextType}
          scrollKey={props.scrollKey}
        />
      )}
    </div>
  );
};
