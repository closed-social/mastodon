# frozen_string_literal: true

Rails.application.configure do
  # NEWS_BOT is an account ID, not a username.
  config.x.news_bot_id = ENV['NEWS_BOT'].presence
end
