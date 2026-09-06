import { useCallback, useEffect } from 'react';

import { defineMessages, useIntl, FormattedMessage } from 'react-intl';

import classNames from 'classnames';
import { NavLink, Switch, Route } from 'react-router-dom';

import { List as ImmutableList } from 'immutable';

import { Helmet } from '@unhead/react/helmet';

import {
  expandTimelineByKey,
  timelineKey,
} from '@/flavours/glitch/actions/timelines_typed';
import { Column } from '@/flavours/glitch/components/column';
import { ColumnHeader as LegacyColumnHeader } from '@/flavours/glitch/components/column/header';
import { ColumnHeader } from '@/flavours/glitch/components/column_header';
import StatusList from '@/flavours/glitch/components/status_list';
import { selectTimelineByKey } from '@/flavours/glitch/selectors/timelines';
import { useAppDispatch, useAppSelector } from '@/flavours/glitch/store';
import { isRedesignEnabled } from '@/flavours/glitch/utils/environment';
import TrendingUpIcon from '@/material-icons/400-24px/trending_up.svg?react';
import { SymbolLogo } from 'flavours/glitch/components/logo';
import { Search } from 'flavours/glitch/features/compose/components/search';
import { useBreakpoint } from 'flavours/glitch/features/ui/hooks/useBreakpoint';
import { useIdentity } from 'flavours/glitch/identity_context';
import { newsBotId } from 'flavours/glitch/initial_state';

import redesignClasses from './redesign.module.scss';
import Statuses from './statuses';
import Suggestions from './suggestions';
import Tags from './tags';

const messages = defineMessages({
  title: { id: 'explore.title', defaultMessage: 'Trending' },
  titleRedesign: { id: 'tabs_bar.explore', defaultMessage: 'Explore' },
});

const emptyList = ImmutableList<string>();

const News: React.FC<{ accountId: string; multiColumn: boolean }> = ({
  accountId,
  multiColumn,
}) => {
  const key = timelineKey({ type: 'account', userId: accountId, boosts: true });
  const timeline = useAppSelector((state) => selectTimelineByKey(state, key));
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(expandTimelineByKey({ key }));
  }, [dispatch, key]);

  const handleLoadMore = useCallback(
    (maxId: number) => {
      dispatch(expandTimelineByKey({ key, maxId }));
    },
    [dispatch, key],
  );

  return (
    <StatusList
      scrollKey='news_bot_timeline'
      statusIds={timeline?.items ?? emptyList}
      isLoading={timeline?.isLoading ?? true}
      hasMore={!!timeline?.hasMore}
      onLoadMore={handleLoadMore}
      emptyMessage={
        <FormattedMessage
          id='empty_column.account_timeline'
          defaultMessage='No posts found'
        />
      }
      bindToDocument={!multiColumn}
      timelineId='account'
      withCounters
    />
  );
};

const Explore: React.FC<{ multiColumn: boolean }> = ({ multiColumn }) => {
  const { signedIn } = useIdentity();
  const intl = useIntl();
  const logoRequired = useBreakpoint('full');

  return (
    <Column
      bindToDocument={!multiColumn}
      label={intl.formatMessage(messages.title)}
    >
      {isRedesignEnabled() ? (
        <ColumnHeader
          withBackButton={multiColumn && 'auto'}
          title={intl.formatMessage(messages.titleRedesign)}
        />
      ) : (
        <LegacyColumnHeader
          icon={'explore'}
          iconComponent={logoRequired ? SymbolLogo : TrendingUpIcon}
          title={intl.formatMessage(messages.title)}
          multiColumn={multiColumn}
          scrollTopOnClick
        />
      )}

      <div
        className={classNames(
          'explore__search-header',
          isRedesignEnabled() && redesignClasses.searchHeader,
        )}
      >
        <Search singleColumn />
      </div>

      <div className='account__section-headline'>
        <NavLink exact to='/explore'>
          <FormattedMessage
            tagName='div'
            id='explore.trending_statuses'
            defaultMessage='Posts'
          />
        </NavLink>

        <NavLink exact to='/explore/tags'>
          <FormattedMessage
            tagName='div'
            id='explore.trending_tags'
            defaultMessage='Hashtags'
          />
        </NavLink>

        {signedIn && (
          <NavLink exact to='/explore/suggestions'>
            <FormattedMessage
              tagName='div'
              id='explore.suggested_follows'
              defaultMessage='People'
            />
          </NavLink>
        )}

        {newsBotId && (
          <NavLink exact to='/explore/links'>
            <FormattedMessage
              tagName='div'
              id='explore.trending_links'
              defaultMessage='News'
            />
          </NavLink>
        )}
      </div>

      <Switch>
        <Route path='/explore/tags' component={Tags} />
        {newsBotId && (
          <Route path='/explore/links'>
            <News accountId={newsBotId} multiColumn={multiColumn} />
          </Route>
        )}
        <Route path='/explore/suggestions' component={Suggestions} />
        <Route exact path={['/explore', '/explore/posts']}>
          <Statuses multiColumn={multiColumn} />
        </Route>
      </Switch>

      <Helmet>
        <title>
          {intl.formatMessage(
            isRedesignEnabled() ? messages.titleRedesign : messages.title,
          )}
        </title>
        <meta name='robots' content='all' />
      </Helmet>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default Explore;
