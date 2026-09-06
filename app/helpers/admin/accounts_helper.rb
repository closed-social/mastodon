# frozen_string_literal: true

module Admin::AccountsHelper
  def admin_account_email(account)
    email = account.user_email
    return email unless account.user_confirmed? && email.present?

    local_part, _, domain = email.rpartition('@')
    "#{local_part[0]}***#{local_part[-1]}@#{domain}"
  end

  def admin_accounts_moderation_options
    [
      [t('admin.accounts.moderation.active'), 'active'],
      [t('admin.accounts.moderation.silenced'), 'silenced'],
      [t('admin.accounts.moderation.disabled'), 'disabled'],
      [t('admin.accounts.moderation.suspended'), 'suspended'],
      [safe_join([t('admin.accounts.moderation.pending'), "(#{pending_user_count_label})"], ' '), 'pending'],
    ]
  end

  private

  def pending_user_count_label
    number_with_delimiter User.pending.count
  end
end
