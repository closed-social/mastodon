import { fetchContext, showPendingReplies } from '../actions/statuses';

import { contextsReducer } from './contexts';

const loaded = (ids: string[], prefetchOnly = false) => ({
  type: fetchContext.fulfilled.type,
  meta: { arg: { statusId: '1' } },
  payload: {
    prefetchOnly,
    context: {
      ancestors: [],
      descendants: ids.map((id) => ({ id, in_reply_to_id: '1' })),
    },
  },
});

describe('contextsReducer reply order', () => {
  test.each([
    { ids: ['9', '10', '11', '12'] },
    { ids: ['11', '9', '12', '10'] },
  ])('keeps fetched siblings in ascending ID order: $ids', ({ ids }) => {
    const state = contextsReducer(undefined, loaded(ids));

    expect(state.replies['1']).toEqual(['9', '10', '11', '12']);
  });

  test('inserts additional replies without reordering or duplicating existing replies', () => {
    const initial = contextsReducer(undefined, loaded(['10', '12']));
    const state = contextsReducer(
      initial,
      loaded(['9', '10', '11', '12', '13']),
    );

    expect(state.replies['1']).toEqual(['9', '10', '11', '12', '13']);
  });

  test('keeps prefetched replies ordered when they are revealed', () => {
    const initial = contextsReducer(undefined, loaded(['9', '10']));
    const prefetched = contextsReducer(
      initial,
      loaded(['9', '10', '11', '12'], true),
    );

    expect(prefetched.replies['1']).toEqual(['9', '10']);

    const state = contextsReducer(
      prefetched,
      showPendingReplies({ statusId: '1' }),
    );

    expect(state.replies['1']).toEqual(['9', '10', '11', '12']);
  });
});
