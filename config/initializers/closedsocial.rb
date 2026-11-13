# frozen_string_literal: true

Rails.application.configure do
  # ANON_ACC is an account ID, not a username.
  config.x.anon.tag = ENV.fetch('ANON_TAG', '[mask]')
  config.x.anon.acc = ENV['ANON_ACC'].presence
  config.x.anon.namelist = if ENV['ANON_NAME_LIST'].present?
                             File.readlines(ENV['ANON_NAME_LIST'], chomp: true).map(&:strip).compact_blank
                           else
                             %w(Alice Bob Carol Dave)
                           end
  config.x.anon.salt = Rails.application.key_generator.generate_key('closedsocial/anonymous', 32).unpack1('H*')
end
