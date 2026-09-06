# frozen_string_literal: true

class PostAnonymousStatusService < BaseService
  def call(account, options = {})
    config = Rails.configuration.x.anon
    return PostStatusService.new.call(account, options) if config.acc.blank?

    raise Mastodon::ValidationError, 'Anonymous posting marker is not configured' if config.tag.blank?

    text = options[:text].to_s
    return PostStatusService.new.call(account, options) unless text.strip.end_with?(config.tag)

    raise Mastodon::ValidationError, 'Anonymous posts cannot be scheduled' if options[:scheduled_at].present?
    raise Mastodon::ValidationError, 'Anonymous posting name list is empty' if config.namelist.empty?

    anonymous_account = Account.local.find_by(id: config.acc)
    raise Mastodon::ValidationError, 'Anonymous posting account is unavailable' unless anonymous_account&.user&.functional?

    input = account.username + config.salt + 5.hours.ago.strftime('%D')
    name = config.namelist[Digest::SHA256.hexdigest(input).to_i(16) % config.namelist.size]

    # A name listed in the shared account's profile explicitly falls back to the real account.
    return PostStatusService.new.call(account, options) if anonymous_account.note.include?(name)

    raise Mastodon::NotPermittedError if options[:thread].present? && !StatusPolicy.new(anonymous_account, options[:thread]).show?
    raise Mastodon::NotPermittedError if options[:quoted_status].present? && !StatusPolicy.new(anonymous_account, options[:quoted_status]).quote?

    anonymous_options = options.merge(
      text: "[#{name}]:\n#{text}",
      content_type: 'text/plain',
      media_owner: account
    )

    anonymous_options[:idempotency] = OpenSSL::HMAC.hexdigest('SHA256', config.salt, "#{account.id}:#{options[:idempotency]}") if options[:idempotency].present?

    PostStatusService.new.call(anonymous_account, anonymous_options)
  end
end
