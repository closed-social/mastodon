import Immutable from 'immutable';
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { createSelector } from 'reselect';
import { fetchStatus } from '../../actions/statuses';
import MissingIndicator from '../../components/missing_indicator';
import DetailedStatus from './components/detailed_status';
import ActionBar from './components/action_bar';
import Column from '../ui/components/column';
import Tree from 'react-tree-graph';
import {
  favourite,
  unfavourite,
  reblog,
  unreblog,
  pin,
  unpin,
} from '../../actions/interactions';
import {
  replyCompose,
  mentionCompose,
  directCompose,
} from '../../actions/compose';
import {
  muteStatus,
  unmuteStatus,
  deleteStatus,
  hideStatus,
  revealStatus,
} from '../../actions/statuses';
import { initMuteModal } from '../../actions/mutes';
import { initBlockModal } from '../../actions/blocks';
import { initReport } from '../../actions/reports';
import { makeGetStatus } from '../../selectors';
import { ScrollContainer } from 'react-router-scroll-4';
import ColumnBackButton from '../../components/column_back_button';
import ColumnHeader from '../../components/column_header';
import StatusContainer from '../../containers/status_container';
import { openModal } from '../../actions/modal';
import { defineMessages, injectIntl } from 'react-intl';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { HotKeys } from 'react-hotkeys';
import { boostModal, deleteModal } from '../../initial_state';
import { attachFullscreenListener, detachFullscreenListener, isFullscreen } from '../ui/util/fullscreen';
import { textForScreenReader, defaultMediaVisibility } from '../../components/status';
import Icon from 'mastodon/components/icon';

const messages = defineMessages({
  deleteConfirm: { id: 'confirmations.delete.confirm', defaultMessage: 'Delete' },
  deleteMessage: { id: 'confirmations.delete.message', defaultMessage: 'Are you sure you want to delete this status?' },
  redraftConfirm: { id: 'confirmations.redraft.confirm', defaultMessage: 'Delete & redraft' },
  redraftMessage: { id: 'confirmations.redraft.message', defaultMessage: 'Are you sure you want to delete this status and re-draft it? Favourites and boosts will be lost, and replies to the original post will be orphaned.' },
  revealAll: { id: 'status.show_more_all', defaultMessage: 'Show more for all' },
  hideAll: { id: 'status.show_less_all', defaultMessage: 'Show less for all' },
  detailedStatus: { id: 'status.detailed_status', defaultMessage: 'Detailed conversation view' },
  replyConfirm: { id: 'confirmations.reply.confirm', defaultMessage: 'Reply' },
  replyMessage: { id: 'confirmations.reply.message', defaultMessage: 'Replying now will overwrite the message you are currently composing. Are you sure you want to proceed?' },
});

const makeMapStateToProps = () => {
  const getStatus = makeGetStatus();

  const getAncestorsIds = createSelector([
    (_, { id }) => id,
    state => state.getIn(['contexts', 'inReplyTos']),
  ], (statusId, inReplyTos) => {
    let ancestorsIds = Immutable.List();
    ancestorsIds = ancestorsIds.withMutations(mutable => {
      let id = statusId;

      while (id) {
        mutable.unshift(id);
        id = inReplyTos.get(id);
      }
    });

    return ancestorsIds;
  });

  const getDescendantsIds = createSelector([
    (_, { id }) => id,
    state => state.getIn(['contexts', 'replies']),
    state => state.get('statuses'),
  ], (statusId, contextReplies, statuses) => {
    let descendantsIds = [];
    const ids = [statusId];

    while (ids.length > 0) {
      let id        = ids.shift();
      const replies = contextReplies.get(id);

      if (statusId !== id) {
        descendantsIds.push(id);
      }

      if (replies) {
        replies.reverse().forEach(reply => {
          ids.unshift(reply);
        });
      }
    }

    let insertAt = descendantsIds.findIndex((id) => statuses.get(id).get('in_reply_to_account_id') !== statuses.get(id).get('account'));
    if (insertAt !== -1) {
      descendantsIds.forEach((id, idx) => {
        if (idx > insertAt && statuses.get(id).get('in_reply_to_account_id') === statuses.get(id).get('account')) {
          descendantsIds.splice(idx, 1);
          descendantsIds.splice(insertAt, 0, id);
          insertAt += 1;
        }
      });
    }

    return Immutable.List(descendantsIds);
  });
    
  const getTreeData = createSelector([
    (_, { id }) => id,
    state => state.getIn(['contexts', 'replies']),
    state => state.get('statuses'),
  ], (statusId, contextReplies, statuses) => {

    const getMore = (id) => {
      const replies = contextReplies.get(id);
      const cur_status = statuses.get(id);
      const text = cur_status.get('search_index');
      return {
        statusId: id,
        ori_text: text,
        name: (text.length > 13 ? text.slice(0,10) + "..." : text) + (cur_status.get('media_attachments').size > 0 ? " [图片]" : " "),
        children: replies ? Array.from(replies.map( i => getMore(i) )) : [],
      }
    }

    let treeData = getMore(statusId)

    return treeData;
  });

  const mapStateToProps = (state, props) => {
    const status = getStatus(state, { id: props.params.statusId });
    let ancestorsIds = Immutable.List();
    let descendantsIds = Immutable.List();
    let rootAcct;
    let deep;
    let treeData;

    if (status) {
      ancestorsIds = getAncestorsIds(state, { id: status.get('in_reply_to_id') });
      const root_status = ancestorsIds.size? getStatus(state, {id: ancestorsIds.get(0)}) : status; //error is directly visit url of non-root detailedStatus, feature!
      rootAcct = root_status? root_status.getIn(['account', 'acct']) : -1;
      descendantsIds = rootAcct == '0' ? state.getIn(['contexts', 'replies', status.get('id')]) : getDescendantsIds(state, { id: status.get('id') });
      deep      = rootAcct == '0' ? ancestorsIds.size : null;
      treeData = rootAcct == '0' ? getTreeData(state, {id: status.get('id')}) : null;
    }

    return {
      status,
      deep,
      ancestorsIds,
      descendantsIds,
      treeData,
      askReplyConfirmation: state.getIn(['compose', 'text']).trim().length !== 0,
      domain: state.getIn(['meta', 'domain']),
    };
  };

  return mapStateToProps;
};

export default @injectIntl
@connect(makeMapStateToProps)
class Status extends ImmutablePureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    params: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired,
    status: ImmutablePropTypes.map,
    ancestorsIds: ImmutablePropTypes.list,
    descendantsIds: ImmutablePropTypes.list,
    intl: PropTypes.object.isRequired,
    askReplyConfirmation: PropTypes.bool,
    multiColumn: PropTypes.bool,
    domain: PropTypes.string.isRequired,
  };

  state = {
    fullscreen: false,
    showMedia: defaultMediaVisibility(this.props.status),
    loadedStatusId: undefined,
    showTree: false,
    svgWidth: 400,
    activeNode: null
  };

  componentWillMount () {
    this.props.dispatch(fetchStatus(this.props.params.statusId));
  }

  componentDidMount () {
    attachFullscreenListener(this.onFullScreenChange);
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.params.statusId !== this.props.params.statusId && nextProps.params.statusId) {
      this._scrolledIntoView = false;
      this.props.dispatch(fetchStatus(nextProps.params.statusId));
    }

    if (nextProps.status && nextProps.status.get('id') !== this.state.loadedStatusId) {
      this.setState({ showMedia: defaultMediaVisibility(nextProps.status), loadedStatusId: nextProps.status.get('id') });
    }
  }

  handleToggleMediaVisibility = () => {
    this.setState({ showMedia: !this.state.showMedia });
  }

  handleFavouriteClick = (status) => {
    if (status.get('favourited')) {
      this.props.dispatch(unfavourite(status));
    } else {
      this.props.dispatch(favourite(status));
    }
  }

  handlePin = (status) => {
    if (status.get('pinned')) {
      this.props.dispatch(unpin(status));
    } else {
      this.props.dispatch(pin(status));
    }
  }

  handleReplyClick = (status) => {
    let { askReplyConfirmation, dispatch, intl } = this.props;
    if (askReplyConfirmation) {
      dispatch(openModal('CONFIRM', {
        message: intl.formatMessage(messages.replyMessage),
        confirm: intl.formatMessage(messages.replyConfirm),
        onConfirm: () => dispatch(replyCompose(status, this.context.router.history)),
      }));
    } else {
      dispatch(replyCompose(status, this.context.router.history));
    }
  }

  handleModalReblog = (status) => {
    this.props.dispatch(reblog(status));
  }

  handleReblogClick = (status, e) => {
    if (status.get('reblogged')) {
      this.props.dispatch(unreblog(status));
    } else {
      if ((e && e.shiftKey) || !boostModal) {
        this.handleModalReblog(status);
      } else {
        this.props.dispatch(openModal('BOOST', { status, onReblog: this.handleModalReblog }));
      }
    }
  }

  handleDeleteClick = (status, history, withRedraft = false) => {
    const { dispatch, intl } = this.props;

    if (!deleteModal) {
      dispatch(deleteStatus(status.get('id'), history, withRedraft));
    } else {
      dispatch(openModal('CONFIRM', {
        message: intl.formatMessage(withRedraft ? messages.redraftMessage : messages.deleteMessage),
        confirm: intl.formatMessage(withRedraft ? messages.redraftConfirm : messages.deleteConfirm),
        onConfirm: () => dispatch(deleteStatus(status.get('id'), history, withRedraft)),
      }));
    }
  }

  handleDirectClick = (account, router) => {
    this.props.dispatch(directCompose(account, router));
  }

  handleMentionClick = (account, router) => {
    this.props.dispatch(mentionCompose(account, router));
  }

  handleOpenMedia = (media, index) => {
    this.props.dispatch(openModal('MEDIA', { media, index }));
  }

  handleOpenVideo = (media, time) => {
    this.props.dispatch(openModal('VIDEO', { media, time }));
  }

  handleMuteClick = (account) => {
    this.props.dispatch(initMuteModal(account));
  }

  handleConversationMuteClick = (status) => {
    if (status.get('muted')) {
      this.props.dispatch(unmuteStatus(status.get('id')));
    } else {
      this.props.dispatch(muteStatus(status.get('id')));
    }
  }

  handleToggleHidden = (status) => {
    if (status.get('hidden')) {
      this.props.dispatch(revealStatus(status.get('id')));
    } else {
      this.props.dispatch(hideStatus(status.get('id')));
    }
  }

  handleToggleAll = () => {
    const { status, ancestorsIds, descendantsIds } = this.props;
    const statusIds = [status.get('id')].concat(ancestorsIds.toJS(), descendantsIds.toJS());

    if (status.get('hidden')) {
      this.props.dispatch(revealStatus(statusIds));
    } else {
      this.props.dispatch(hideStatus(statusIds));
    }
  }

  handleShowTree = () => {
    this.setState({
      activeNode: null,
      showTree: !this.state.showTree 
    });
  }

  handleBlockClick = (status) => {
    const { dispatch } = this.props;
    const account = status.get('account');
    dispatch(initBlockModal(account));
  }

  handleReport = (status) => {
    this.props.dispatch(initReport(status.get('account'), status));
  }

  handleEmbed = (status) => {
    this.props.dispatch(openModal('EMBED', { url: status.get('url') }));
  }

  handleHotkeyMoveUp = () => {
    this.handleMoveUp(this.props.status.get('id'));
  }

  handleHotkeyMoveDown = () => {
    this.handleMoveDown(this.props.status.get('id'));
  }

  handleHotkeyReply = e => {
    e.preventDefault();
    this.handleReplyClick(this.props.status);
  }

  handleHotkeyFavourite = () => {
    this.handleFavouriteClick(this.props.status);
  }

  handleHotkeyBoost = () => {
    this.handleReblogClick(this.props.status);
  }

  handleHotkeyMention = e => {
    e.preventDefault();
    this.handleMentionClick(this.props.status.get('account'));
  }

  handleHotkeyOpenProfile = () => {
    this.context.router.history.push(`/accounts/${this.props.status.getIn(['account', 'id'])}`);
  }

  handleHotkeyToggleHidden = () => {
    this.handleToggleHidden(this.props.status);
  }

  handleHotkeyToggleSensitive = () => {
    this.handleToggleMediaVisibility();
  }

  handleMoveUp = id => {
    const { status, ancestorsIds, descendantsIds } = this.props;

    if (id === status.get('id')) {
      this._selectChild(ancestorsIds.size - 1, true);
    } else {
      let index = ancestorsIds.indexOf(id);

      if (index === -1) {
        index = descendantsIds.indexOf(id);
        this._selectChild(ancestorsIds.size + index, true);
      } else {
        this._selectChild(index - 1, true);
      }
    }
  }

  handleMoveDown = id => {
    const { status, ancestorsIds, descendantsIds } = this.props;

    if (id === status.get('id')) {
      this._selectChild(ancestorsIds.size + 1, false);
    } else {
      let index = ancestorsIds.indexOf(id);

      if (index === -1) {
        index = descendantsIds.indexOf(id);
        this._selectChild(ancestorsIds.size + index + 2, false);
      } else {
        this._selectChild(index + 1, false);
      }
    }
  }

  _selectChild (index, align_top) {
    const container = this.node;
    const element = container.querySelectorAll('.focusable')[index];

    if (element) {
      if (align_top && container.scrollTop > element.offsetTop) {
        element.scrollIntoView(true);
      } else if (!align_top && container.scrollTop + container.clientHeight < element.offsetTop + element.offsetHeight) {
        element.scrollIntoView(false);
      }
      element.focus();
    }
  }

  renderChildren (list, type) {
    const { deep } = this.props;
    return list.map((id,idx) => (
      <StatusContainer
        key={id}
        id={id}
        onMoveUp={this.handleMoveUp}
        onMoveDown={this.handleMoveDown}
        contextType='thread'
        deep={deep==null? null : (type == 'ance'? idx : deep+1)}
        tree_type={deep==null? null : type}
      />
    ));
  }

  setRef = c => {
    this.node = c;
  }

  componentDidUpdate () {
    if (this._scrolledIntoView) {
      return;
    }

    const { status, ancestorsIds } = this.props;

    if (status && ancestorsIds && ancestorsIds.size > 0) {
      const element = this.node.querySelectorAll('.focusable')[ancestorsIds.size - 1];

      window.requestAnimationFrame(() => {
        element.scrollIntoView(true);
      });
      this._scrolledIntoView = true;
    }
  }

  componentWillUnmount () {
    detachFullscreenListener(this.onFullScreenChange);
  }

  onFullScreenChange = () => {
    this.setState({ fullscreen: isFullscreen() });
  }

  handleNodeClick = (ev, node) => {
    console.log(node);
    this.setState({activeNode: node});
  }

  getRoot = (json) => {
		if (json.statusId == this.state.activeNode) {
			return json;
		}
		for (let i = 0; i < json.children.length; i++) {
			let childJson = this.getRoot(json.children[i]);
			if (childJson) {
				return childJson;
			}
		}
    //console.log('fail: ', json.name, ' != ', this.state.activeNode);
		return false;
	}


  render () {
    let ancestors, descendants;
    const { shouldUpdateScroll, status, deep, ancestorsIds, descendantsIds, treeData, intl, domain, multiColumn } = this.props;
    const { fullscreen, showTree, svgWidth, activeNode } = this.state;

    if (status === null) {
      return (
        <Column>
          <ColumnBackButton multiColumn={multiColumn} />
          <MissingIndicator />
        </Column>
      );
    }

    if (ancestorsIds && ancestorsIds.size > 0) {
      ancestors = <div>{this.renderChildren(ancestorsIds, 'ance')}</div>;
    }

    if (descendantsIds && descendantsIds.size > 0) {
      descendants = <div>{this.renderChildren(descendantsIds, 'desc')}</div>;
    }

    const handlers = {
      moveUp: this.handleHotkeyMoveUp,
      moveDown: this.handleHotkeyMoveDown,
      reply: this.handleHotkeyReply,
      favourite: this.handleHotkeyFavourite,
      boost: this.handleHotkeyBoost,
      mention: this.handleHotkeyMention,
      openProfile: this.handleHotkeyOpenProfile,
      toggleHidden: this.handleHotkeyToggleHidden,
      toggleSensitive: this.handleHotkeyToggleSensitive,
    };

    let root;
    if(deep != null && showTree) {
      //console.log("activeNode: ", activeNode);
      root = activeNode ? this.getRoot(treeData) : treeData;
      //console.log('first, root =');
      //console.log(root);
      root = root ? root : treeData;
      //console.log("treeData: ");
      //console.log(treeData);
      //console.log("root: ");
      //console.log(root);
      root.name = root.ori_text;
      //console.log(root);
    }

    return (
      <Column bindToDocument={!multiColumn} label={intl.formatMessage(messages.detailedStatus)}>
        <ColumnHeader
          showBackButton
          multiColumn={multiColumn}
          extraButton={(
            <button className='column-header__button' title={intl.formatMessage(status.get('hidden') ? messages.revealAll : messages.hideAll)} aria-label={intl.formatMessage(status.get('hidden') ? messages.revealAll : messages.hideAll)} onClick={deep ==null ? this.handleToggleAll : this.handleShowTree} aria-pressed={status.get('hidden') ? 'false' : 'true'}><Icon id={status.get('hidden') ? 'eye-slash' : 'eye'} /></button>
          )}
        />

        <ScrollContainer scrollKey='thread' shouldUpdateScroll={shouldUpdateScroll}>
          <div className={classNames('scrollable', { fullscreen }, {'tree':deep!=null})} ref={this.setRef}>
            {ancestors}

            <HotKeys handlers={handlers}>
              <div className={classNames('focusable', 'detailed-status__wrapper')} tabIndex='0' aria-label={textForScreenReader(intl, status, false)} ref={e=>{if(e) this.setState({svgWidth: e.clientWidth})}}>

              {showTree ?
                <Tree
                  data={root}
                  height={800}
	                width={svgWidth}
                  animated
                  keyProp = {"statusId"}
                  textProps={{
                    dx: -4,
                    dy: -6
                  }}
                  gProps={{
					          className: 'node',
					          onClick: this.handleNodeClick
				          }}
                  svgProps={{
			              className: 'tree-svg'
                  }}/>
                :
                <DetailedStatus
                  status={status}
                  deep={deep}
                  onOpenVideo={this.handleOpenVideo}
                  onOpenMedia={this.handleOpenMedia}
                  onToggleHidden={this.handleToggleHidden}
                  domain={domain}
                  showMedia={this.state.showMedia}
                  onToggleMediaVisibility={this.handleToggleMediaVisibility}
                />
              }

                <ActionBar
                  status={status}
                  onReply={this.handleReplyClick}
                  onFavourite={this.handleFavouriteClick}
                  onReblog={this.handleReblogClick}
                  onDelete={this.handleDeleteClick}
                  onDirect={this.handleDirectClick}
                  onMention={this.handleMentionClick}
                  onMute={this.handleMuteClick}
                  onMuteConversation={this.handleConversationMuteClick}
                  onBlock={this.handleBlockClick}
                  onReport={this.handleReport}
                  onPin={this.handlePin}
                  onEmbed={this.handleEmbed}
                />
              </div>
            </HotKeys>

            {descendants}
          </div>
        </ScrollContainer>
      </Column>
    );
  }

}
