# frozen_string_literal: true

Rails.application.configure do
  # NEWS_BOT and ANON_ACC are account IDs, not usernames.
  config.x.news_bot_id = ENV['NEWS_BOT'].presence
  config.x.anon.tag = ENV.fetch('ANON_TAG', '[mask]')
  config.x.anon.acc = ENV['ANON_ACC'].presence
  config.x.anon.namelist = if ENV['ANON_NAME_LIST'].present?
                             File.readlines(ENV['ANON_NAME_LIST'], chomp: true).map(&:strip).compact_blank
                           else
                             %w(Alice Bob Carol Dave)
                           end
  config.x.anon.salt = Rails.application.key_generator.generate_key('closedsocial/anonymous', 32).unpack1('H*')
end
