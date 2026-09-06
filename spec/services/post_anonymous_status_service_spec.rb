# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PostAnonymousStatusService, type: :service do
  let(:account) { Fabricate(:account, username: 'alice') }
  let(:anonymous_account) { Fabricate(:account) }
  let(:media) { Fabricate(:media_attachment, account: account) }
  let(:config) do
    ActiveSupport::OrderedOptions.new.update(
      tag: '[mask]', acc: anonymous_account.id.to_s, namelist: ['Alice'], salt: 'spec salt'
    )
  end

  before { allow(Rails.configuration.x).to receive(:anon).and_return(config) }

  it 'recognizes the trailing marker and publishes plain text with media owned by the shared account' do
    status = publish(text: "Hello [mask] \n", content_type: 'text/markdown', media_ids: [media.id.to_s])

    expect(status).to have_attributes(account: anonymous_account, text: "[Alice]:\nHello [mask]", content_type: 'text/plain')
    expect(media.reload).to have_attributes(account: anonymous_account, status: status)
  end

  it 'keeps unmarked posts under the real account with their original format' do
    expect(publish(text: 'Hello', content_type: 'text/markdown')).to have_attributes(account: account, text: 'Hello', content_type: 'text/markdown')
  end

  it 'allows normal media-only posts' do
    expect(publish(text: nil, media_ids: [media.id.to_s])).to have_attributes(account: account)
  end

  it 'posts normally when anonymous posting is not configured' do
    config.acc = nil

    expect(publish).to have_attributes(account: account, text: 'Hello [mask]')
  end

  it 'falls back to the real account for a banned name' do
    anonymous_account.update!(note: 'Alice')

    expect(publish(content_type: 'text/markdown')).to have_attributes(account: account, text: 'Hello [mask]', content_type: 'text/markdown')
  end

  [{ tag: '' }, { namelist: [] }, { acc: -1 }].each do |invalid_config|
    it "rejects invalid configuration #{invalid_config} without publishing as the real account" do
      config.merge!(invalid_config)

      expect { publish }.to raise_error(Mastodon::ValidationError)
      expect(account.statuses).to be_empty
    end
  end

  it 'retains media ownership when publication fails' do
    expect { publish(media_ids: [media.id.to_s], visibility: 'invalid') }.to raise_error(ActiveRecord::RecordInvalid)
    expect(media.reload).to have_attributes(account: account, status: nil)
  end

  it 'rejects media that the requesting user does not own' do
    media.update!(account: anonymous_account)

    expect { publish(media_ids: [media.id.to_s]) }.to raise_error(Mastodon::ValidationError)
    expect(media.reload.status).to be_nil
  end

  %i(thread quoted_status).each do |option|
    it "rejects #{option} when the shared account cannot access the target" do
      private_status = Fabricate(:status, account: account, visibility: :private)

      expect { publish(**{ option => private_status }) }.to raise_error(Mastodon::NotPermittedError)
    end
  end

  it 'rejects anonymous scheduling before even the banned-name fallback' do
    anonymous_account.update!(note: 'Alice')

    expect { publish(scheduled_at: 1.hour.from_now) }.to raise_error(Mastodon::ValidationError, 'Anonymous posts cannot be scheduled')
    expect(account.scheduled_statuses).to be_empty
  end

  it 'keeps normal scheduling available' do
    status = publish(text: 'Hello', scheduled_at: 1.hour.from_now)

    expect(status).to be_a(ScheduledStatus)
    expect(status.account).to eq(account)
  end

  it 'isolates different users with the same idempotency key without exposing their IDs in the cache keys' do
    first = publish(idempotency: 'shared-key')
    second = described_class.new.call(Fabricate(:account), text: 'Hello [mask]', idempotency: 'shared-key')

    expect(second.id).to_not eq(first.id)
    expect(redis.keys('idempotency:status:*')).to all(match(/\Aidempotency:status:#{anonymous_account.id}:[0-9a-f]{64}\z/))
  end

  it 'uses the previous date until five in the morning' do
    config.namelist = Array.new(256) { |i| "Name#{i}" }
    evening = travel_to(Time.zone.local(2026, 9, 6, 23)) { publish.text.lines.first }
    early_morning = travel_to(Time.zone.local(2026, 9, 7, 4, 59)) { publish.text.lines.first }
    next_day = travel_to(Time.zone.local(2026, 9, 7, 5)) { publish.text.lines.first }

    expect(early_morning).to eq(evening)
    expect(next_day).to_not eq(evening)
  end

  def publish(**options)
    described_class.new.call(account, { text: 'Hello [mask]' }.merge(options))
  end
end
