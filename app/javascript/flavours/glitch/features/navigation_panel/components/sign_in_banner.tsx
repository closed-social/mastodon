import { useCallback } from 'react';

import { FormattedMessage } from 'react-intl';

import { openModal } from 'flavours/glitch/actions/modal';
import { registrationsOpen, sso_redirect } from 'flavours/glitch/initial_state';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';

export const SignInBanner: React.FC = () => {
  const dispatch = useAppDispatch();

  const openClosedRegistrationsModal = useCallback(
    () =>
      dispatch(
        openModal({ modalType: 'CLOSED_REGISTRATIONS', modalProps: {} }),
      ),
    [dispatch],
  );

  let signupButton: React.ReactNode;

  const signupUrl = useAppSelector(
    (state) => state.server.server.item?.registrations.url ?? '/auth/sign_up',
  );

  if (sso_redirect) {
    return (
      <div className='sign-in-banner'>
        <a
          href={sso_redirect}
          data-method='post'
          className='button button--block button-secondary'
        >
          <FormattedMessage
            id='sign_in_banner.sso_redirect'
            defaultMessage='Login or Register'
          />
        </a>
      </div>
    );
  }

  if (registrationsOpen) {
    signupButton = (
      <a href={signupUrl} className='button button--block'>
        <FormattedMessage
          id='sign_in_banner.create_account'
          defaultMessage='Create account'
        />
      </a>
    );
  } else {
    signupButton = (
      <button
        className='button button--block'
        onClick={openClosedRegistrationsModal}
        type='button'
      >
        <FormattedMessage
          id='sign_in_banner.create_account'
          defaultMessage='Create account'
        />
      </button>
    );
  }

  return (
    <div className='sign-in-banner'>
      {signupButton}
      <a href='/auth/sign_in' className='button button--block button-secondary'>
        <FormattedMessage id='sign_in_banner.sign_in' defaultMessage='Login' />
      </a>
    </div>
  );
};
