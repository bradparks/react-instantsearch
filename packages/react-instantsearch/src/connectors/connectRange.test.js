/* eslint-env jest, jasmine */

import { SearchParameters } from 'algoliasearch-helper';

import connect from './connectRange';
jest.mock('../core/createConnector');

let props;
let params;

describe('connectRange', () => {
  describe('single index', () => {
    const context = { context: { ais: { mainTargetedIndex: 'index' } } };
    const getProvidedProps = connect.getProvidedProps.bind(context);
    const refine = connect.refine.bind(context);
    const getSP = connect.getSearchParameters.bind(context);
    const getMetadata = connect.getMetadata.bind(context);
    const cleanUp = connect.cleanUp.bind(context);

    it('provides the correct props to the component', () => {
      props = getProvidedProps(
        { attributeName: 'ok', min: 5, max: 10 },
        {},
        {}
      );
      expect(props).toEqual({
        min: 5,
        max: 10,
        currentRefinement: { min: 5, max: 10 },
        count: [],
        canRefine: false,
      });

      const results = {
        getFacetStats: () => ({ min: 5, max: 10 }),
        getFacetValues: () => [
          { name: '5', count: 10 },
          { name: '2', count: 20 },
        ],
        getFacetByName: () => true,
        hits: [],
        index: 'index',
      };
      props = getProvidedProps({ attributeName: 'ok' }, {}, { results });
      expect(props).toEqual({
        min: 5,
        max: 10,
        currentRefinement: { min: 5, max: 10 },
        count: [{ value: '5', count: 10 }, { value: '2', count: 20 }],
        canRefine: true,
      });

      props = getProvidedProps(
        { attributeName: 'ok' },
        { ok: { min: 6, max: 9 } },
        {}
      );
      expect(props).toEqual({ canRefine: false });

      props = getProvidedProps(
        {
          attributeName: 'ok',
          min: 5,
          max: 10,
        },
        {
          range: { ok: { min: 6, max: 9 } },
        },
        {}
      );
      expect(props).toEqual({
        min: 5,
        max: 10,
        currentRefinement: { min: 6, max: 9 },
        count: [],
        canRefine: false,
      });

      props = getProvidedProps(
        {
          attributeName: 'ok',
          min: 5,
          max: 10,
        },
        {
          range: { ok: { min: '6', max: '9' } },
        },
        {}
      );
      expect(props).toEqual({
        min: 5,
        max: 10,
        currentRefinement: { min: 6, max: 9 },
        count: [],
        canRefine: false,
      });

      props = getProvidedProps(
        {
          attributeName: 'ok',
          min: 5,
          max: 10,
          defaultRefinement: { min: 6, max: 9 },
        },
        {},
        {}
      );
      expect(props).toEqual({
        min: 5,
        max: 10,
        currentRefinement: { min: 6, max: 9 },
        count: [],
        canRefine: false,
      });
    });

    it("calling refine updates the widget's search state", () => {
      const nextState = refine(
        { attributeName: 'ok' },
        { otherKey: 'val', range: { otherKey: { min: 1, max: 2 } } },
        { min: 3, max: 5 }
      );
      expect(nextState).toEqual({
        page: 1,
        otherKey: 'val',
        range: { ok: { min: 3, max: 5 }, otherKey: { min: 1, max: 2 } },
      });
    });

    it('calling refine with non finite values should fail', () => {
      function shouldNotRefine() {
        refine(
          { attributeName: 'ok' },
          { otherKey: 'val', range: { otherKey: { min: 1, max: 2 } } },
          { min: NaN, max: 5 }
        );
      }
      expect(shouldNotRefine).toThrowError(
        "You can't provide non finite values to the range connector"
      );
    });

    it('refines the corresponding numeric facet', () => {
      params = getSP(
        new SearchParameters(),
        { attributeName: 'facet' },
        { range: { facet: { min: 10, max: 30 } } }
      );
      expect(params.getNumericRefinements('facet')).toEqual({
        '>=': [10],
        '<=': [30],
      });
    });

    it('registers its filter in metadata', () => {
      let metadata = getMetadata(
        { attributeName: 'wot' },
        { range: { wot: { min: 5 } } }
      );
      expect(metadata).toEqual({
        id: 'wot',
        index: 'index',
        items: [
          {
            label: '5 <= wot',
            attributeName: 'wot',
            currentRefinement: { min: 5, max: undefined },
            // Ignore clear, we test it later
            value: metadata.items[0].value,
          },
        ],
      });

      const searchState = metadata.items[0].value({
        range: { wot: { min: 5 } },
      });
      expect(searchState).toEqual({ range: {} });

      metadata = getMetadata(
        { attributeName: 'wot' },
        { range: { wot: { max: 10 } } }
      );
      expect(metadata).toEqual({
        id: 'wot',
        index: 'index',
        items: [
          {
            label: 'wot <= 10',
            attributeName: 'wot',
            currentRefinement: { min: undefined, max: 10 },
            value: metadata.items[0].value,
          },
        ],
      });

      metadata = getMetadata(
        { attributeName: 'wot' },
        { range: { wot: { min: 5, max: 10 } } }
      );
      expect(metadata).toEqual({
        id: 'wot',
        index: 'index',
        items: [
          {
            label: '5 <= wot <= 10',
            attributeName: 'wot',
            currentRefinement: { min: 5, max: 10 },
            value: metadata.items[0].value,
          },
        ],
      });
    });

    it('items value function should clear it from the search state', () => {
      const metadata = getMetadata(
        { attributeName: 'one' },
        { range: { one: { min: 5 }, two: { max: 4 } } }
      );

      const searchState = metadata.items[0].value({
        range: { one: { min: 5 }, two: { max: 4 } },
      });

      expect(searchState).toEqual({ range: { two: { max: 4 } } });
    });

    it('should return the right searchState when clean up', () => {
      let searchState = cleanUp(
        { attributeName: 'name' },
        {
          range: { name: 'searchState', name2: 'searchState' },
          another: { searchState: 'searchState' },
        }
      );
      expect(searchState).toEqual({
        range: { name2: 'searchState' },
        another: { searchState: 'searchState' },
      });

      searchState = cleanUp({ attributeName: 'name2' }, searchState);
      expect(searchState).toEqual({
        range: {},
        another: { searchState: 'searchState' },
      });
    });
  });
  describe('multi index', () => {
    let context = {
      context: {
        ais: { mainTargetedIndex: 'first' },
        multiIndexContext: { targetedIndex: 'first' },
      },
    };
    const getProvidedProps = connect.getProvidedProps.bind(context);
    const getSP = connect.getSearchParameters.bind(context);
    const getMetadata = connect.getMetadata.bind(context);
    const cleanUp = connect.cleanUp.bind(context);

    it('provides the correct props to the component', () => {
      const results = {
        first: {
          getFacetStats: () => ({ min: 5, max: 10 }),
          getFacetValues: () => [
            { name: '5', count: 10 },
            { name: '2', count: 20 },
          ],
          getFacetByName: () => true,
          index: 'first',
        },
      };
      props = getProvidedProps({ attributeName: 'ok' }, {}, { results });
      expect(props).toEqual({
        min: 5,
        max: 10,
        currentRefinement: { min: 5, max: 10 },
        count: [{ value: '5', count: 10 }, { value: '2', count: 20 }],
        canRefine: true,
      });

      props = getProvidedProps(
        {
          attributeName: 'ok',
          min: 5,
          max: 10,
        },
        {
          indices: { first: { range: { ok: { min: 6, max: 9 } } } },
        },
        {}
      );
      expect(props).toEqual({
        min: 5,
        max: 10,
        currentRefinement: { min: 6, max: 9 },
        count: [],
        canRefine: false,
      });
    });

    it("calling refine updates the widget's search state", () => {
      let refine = connect.refine.bind(context);

      let nextState = refine(
        { attributeName: 'ok' },
        {
          otherKey: 'val',
          indices: { first: { range: { otherKey: { min: 1, max: 2 } } } },
        },
        { min: 3, max: 5 }
      );
      expect(nextState).toEqual({
        otherKey: 'val',
        indices: {
          first: {
            page: 1,
            range: { ok: { min: 3, max: 5 }, otherKey: { min: 1, max: 2 } },
          },
        },
      });

      context = {
        context: {
          ais: { mainTargetedIndex: 'first' },
          multiIndexContext: { targetedIndex: 'second' },
        },
      };
      refine = connect.refine.bind(context);

      nextState = refine(
        { attributeName: 'ok' },
        {
          otherKey: 'val',
          indices: { first: { range: { otherKey: { min: 1, max: 2 } } } },
        },
        { min: 3, max: 5 }
      );
      expect(nextState).toEqual({
        otherKey: 'val',
        indices: {
          first: { range: { otherKey: { min: 1, max: 2 } } },
          second: { page: 1, range: { ok: { min: 3, max: 5 } } },
        },
      });
    });

    it('refines the corresponding numeric facet', () => {
      params = getSP(
        new SearchParameters(),
        { attributeName: 'facet' },
        { indices: { first: { range: { facet: { min: 10, max: 30 } } } } }
      );
      expect(params.getNumericRefinements('facet')).toEqual({
        '>=': [10],
        '<=': [30],
      });
    });

    it('registers its filter in metadata', () => {
      let metadata = getMetadata(
        { attributeName: 'wot' },
        { indices: { first: { range: { wot: { min: 5 } } } } }
      );
      expect(metadata).toEqual({
        id: 'wot',
        index: 'first',
        items: [
          {
            label: '5 <= wot',
            attributeName: 'wot',
            currentRefinement: { min: 5, max: undefined },
            // Ignore clear, we test it later
            value: metadata.items[0].value,
          },
        ],
      });

      const searchState = metadata.items[0].value({
        indices: { first: { range: { wot: { min: 5 } } } },
      });
      expect(searchState).toEqual({ indices: { first: { range: {} } } });

      metadata = getMetadata(
        { attributeName: 'wot' },
        { indices: { first: { range: { wot: { max: 10 } } } } }
      );
      expect(metadata).toEqual({
        id: 'wot',
        index: 'first',
        items: [
          {
            label: 'wot <= 10',
            attributeName: 'wot',
            currentRefinement: { min: undefined, max: 10 },
            value: metadata.items[0].value,
          },
        ],
      });
    });

    it('items value function should clear it from the search state', () => {
      const metadata = getMetadata(
        { attributeName: 'one' },
        { indices: { first: { range: { one: { min: 5 }, two: { max: 4 } } } } }
      );

      const searchState = metadata.items[0].value({
        indices: { first: { range: { one: { min: 5 }, two: { max: 4 } } } },
      });

      expect(searchState).toEqual({
        indices: { first: { range: { two: { max: 4 } } } },
      });
    });

    it('should return the right searchState when clean up', () => {
      let searchState = cleanUp(
        { attributeName: 'name' },
        {
          indices: {
            first: { range: { name: 'searchState', name2: 'searchState' } },
          },
          another: { searchState: 'searchState' },
        }
      );
      expect(searchState).toEqual({
        indices: { first: { range: { name2: 'searchState' } } },
        another: { searchState: 'searchState' },
      });

      searchState = cleanUp({ attributeName: 'name2' }, searchState);
      expect(searchState).toEqual({
        another: { searchState: 'searchState' },
        indices: { first: { range: {} } },
      });
    });
  });
});
