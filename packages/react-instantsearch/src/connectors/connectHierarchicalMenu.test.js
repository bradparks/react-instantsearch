/* eslint-env jest, jasmine */

import { SearchParameters } from 'algoliasearch-helper';

import connect from './connectHierarchicalMenu';
jest.mock('../core/createConnector');

let props;
let params;

describe('connectHierarchicalMenu', () => {
  describe('single index', () => {
    const context = { context: { ais: { mainTargetedIndex: 'index' } } };
    const getProvidedProps = connect.getProvidedProps.bind(context);
    const refine = connect.refine.bind(context);
    const getSP = connect.getSearchParameters.bind(context);
    const getMetadata = connect.getMetadata.bind(context);
    const cleanUp = connect.cleanUp.bind(context);

    it('provides the correct props to the component', () => {
      const results = {
        getFacetValues: jest.fn(),
        getFacetByName: () => true,
        hits: [],
        index: 'index',
      };

      results.getFacetValues.mockImplementationOnce(() => ({}));
      props = getProvidedProps(
        { attributes: ['ok'] },
        { hierarchicalMenu: { ok: 'wat' } },
        { results }
      );
      expect(props).toEqual({
        canRefine: false,
        currentRefinement: 'wat',
        items: [],
      });

      props = getProvidedProps({ attributes: ['ok'] }, {}, {});
      expect(props).toEqual({
        canRefine: false,
        currentRefinement: null,
        items: [],
      });

      results.getFacetValues.mockClear();
      results.getFacetValues.mockImplementation(() => ({
        data: [
          {
            name: 'wat',
            path: 'wat',
            count: 20,
            data: [
              {
                name: 'wot',
                path: 'wat > wot',
                count: 15,
              },
              {
                name: 'wut',
                path: 'wat > wut',
                count: 5,
              },
            ],
          },
          {
            name: 'oy',
            path: 'oy',
            count: 10,
          },
        ],
      }));
      props = getProvidedProps({ attributes: ['ok'] }, {}, { results });
      expect(props.items).toEqual([
        {
          label: 'wat',
          value: 'wat',
          count: 20,
          items: [
            {
              label: 'wot',
              value: 'wat > wot',
              count: 15,
            },
            {
              label: 'wut',
              value: 'wat > wut',
              count: 5,
            },
          ],
        },
        {
          label: 'oy',
          value: 'oy',
          count: 10,
        },
      ]);

      props = getProvidedProps(
        { attributes: ['ok'], limitMin: 1 },
        {},
        { results }
      );
      expect(props.items).toEqual([
        {
          label: 'wat',
          value: 'wat',
          count: 20,
          items: [
            {
              label: 'wot',
              value: 'wat > wot',
              count: 15,
            },
          ],
        },
      ]);

      props = getProvidedProps(
        { attributes: ['ok'], showMore: true, limitMin: 0, limitMax: 1 },
        {},
        { results }
      );
      expect(props.items).toEqual([
        {
          label: 'wat',
          value: 'wat',
          count: 20,
          items: [
            {
              label: 'wot',
              value: 'wat > wot',
              count: 15,
            },
          ],
        },
      ]);

      const transformItems = jest.fn(() => ['items']);
      props = getProvidedProps(
        { attributes: ['ok'], transformItems },
        {},
        { results }
      );
      expect(transformItems.mock.calls[0][0]).toEqual([
        {
          label: 'wat',
          value: 'wat',
          count: 20,
          items: [
            {
              label: 'wot',
              value: 'wat > wot',
              count: 15,
            },
            {
              label: 'wut',
              value: 'wat > wut',
              count: 5,
            },
          ],
        },
        {
          label: 'oy',
          value: 'oy',
          count: 10,
        },
      ]);
      expect(props.items).toEqual(['items']);
    });

    it("calling refine updates the widget's search state", () => {
      const nextState = refine(
        { attributes: ['ok'] },
        { otherKey: 'val', hierarchicalMenu: { otherKey: 'val' } },
        'yep'
      );
      expect(nextState).toEqual({
        otherKey: 'val',
        page: 1,
        hierarchicalMenu: { ok: 'yep', otherKey: 'val' },
      });
    });

    it("increases maxValuesPerFacet when it isn't big enough", () => {
      const initSP = new SearchParameters({ maxValuesPerFacet: 100 });

      params = getSP(
        initSP,
        {
          attributes: ['attribute'],
          limitMin: 101,
        },
        {}
      );
      expect(params.maxValuesPerFacet).toBe(101);

      params = getSP(
        initSP,
        {
          attributes: ['attribute'],
          showMore: true,
          limitMax: 101,
        },
        {}
      );
      expect(params.maxValuesPerFacet).toBe(101);

      params = getSP(
        initSP,
        {
          attributes: ['attribute'],
          limitMin: 99,
        },
        {}
      );
      expect(params.maxValuesPerFacet).toBe(100);

      params = getSP(
        initSP,
        {
          attributes: ['attribute'],
          showMore: true,
          limitMax: 99,
        },
        {}
      );
      expect(params.maxValuesPerFacet).toBe(100);
    });

    it('correctly applies its state to search parameters', () => {
      const initSP = new SearchParameters();

      params = getSP(
        initSP,
        {
          attributes: ['ATTRIBUTE'],
          separator: 'SEPARATOR',
          rootPath: 'ROOT_PATH',
          showParentLevel: true,
          limitMin: 1,
        },
        { hierarchicalMenu: { ATTRIBUTE: 'ok' } }
      );
      expect(params).toEqual(
        initSP
          .addHierarchicalFacet({
            name: 'ATTRIBUTE',
            attributes: ['ATTRIBUTE'],
            separator: 'SEPARATOR',
            rootPath: 'ROOT_PATH',
            showParentLevel: true,
          })
          .toggleHierarchicalFacetRefinement('ATTRIBUTE', 'ok')
          .setQueryParameter('maxValuesPerFacet', 1)
      );
    });

    it('registers its id in metadata', () => {
      const metadata = getMetadata({ attributes: ['ok'] }, {});
      expect(metadata).toEqual({ items: [], index: 'index', id: 'ok' });
    });

    it('registers its filter in metadata', () => {
      const metadata = getMetadata(
        { attributes: ['ok'] },
        { hierarchicalMenu: { ok: 'wat' } }
      );
      expect(metadata).toEqual({
        id: 'ok',
        index: 'index',
        items: [
          {
            label: 'ok: wat',
            attributeName: 'ok',
            currentRefinement: 'wat',
            // Ignore clear, we test it later
            value: metadata.items[0].value,
          },
        ],
      });
    });

    it('items value function should clear it from the search state', () => {
      const metadata = getMetadata(
        { attributes: ['one'] },
        { hierarchicalMenu: { one: 'one', two: 'two' } }
      );

      const searchState = metadata.items[0].value({
        hierarchicalMenu: { one: 'one', two: 'two' },
      });

      expect(searchState).toEqual({
        page: 1,
        hierarchicalMenu: { one: '', two: 'two' },
      });
    });

    it('should return the right searchState when clean up', () => {
      let searchState = cleanUp(
        { attributes: ['name'] },
        {
          hierarchicalMenu: { name: 'searchState', name2: 'searchState' },
          another: { searchState: 'searchState' },
        }
      );
      expect(searchState).toEqual({
        hierarchicalMenu: { name2: 'searchState' },
        another: { searchState: 'searchState' },
      });

      searchState = cleanUp({ attributes: ['name2'] }, searchState);
      expect(searchState).toEqual({
        another: { searchState: 'searchState' },
        hierarchicalMenu: {},
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
          getFacetValues: jest.fn(),
          getFacetByName: () => true,
          index: 'first',
        },
      };

      results.first.getFacetValues.mockImplementationOnce(() => ({}));
      props = getProvidedProps(
        { attributes: ['ok'] },
        { indices: { first: { hierarchicalMenu: { ok: 'wat' } } } },
        { results }
      );
      expect(props).toEqual({
        canRefine: false,
        currentRefinement: 'wat',
        items: [],
      });

      props = getProvidedProps({ attributes: ['ok'] }, {}, {});
      expect(props).toEqual({
        canRefine: false,
        currentRefinement: null,
        items: [],
      });

      results.first.getFacetValues.mockClear();
      results.first.getFacetValues.mockImplementation(() => ({
        data: [
          {
            name: 'wat',
            path: 'wat',
            count: 20,
            data: [
              {
                name: 'wot',
                path: 'wat > wot',
                count: 15,
              },
              {
                name: 'wut',
                path: 'wat > wut',
                count: 5,
              },
            ],
          },
          {
            name: 'oy',
            path: 'oy',
            count: 10,
          },
        ],
      }));
      props = getProvidedProps({ attributes: ['ok'] }, {}, { results });
      expect(props.items).toEqual([
        {
          label: 'wat',
          value: 'wat',
          count: 20,
          items: [
            {
              label: 'wot',
              value: 'wat > wot',
              count: 15,
            },
            {
              label: 'wut',
              value: 'wat > wut',
              count: 5,
            },
          ],
        },
        {
          label: 'oy',
          value: 'oy',
          count: 10,
        },
      ]);

      props = getProvidedProps(
        { attributes: ['ok'], limitMin: 1 },
        {},
        { results }
      );
      expect(props.items).toEqual([
        {
          label: 'wat',
          value: 'wat',
          count: 20,
          items: [
            {
              label: 'wot',
              value: 'wat > wot',
              count: 15,
            },
          ],
        },
      ]);

      props = getProvidedProps(
        { attributes: ['ok'], showMore: true, limitMin: 0, limitMax: 1 },
        {},
        { results }
      );
      expect(props.items).toEqual([
        {
          label: 'wat',
          value: 'wat',
          count: 20,
          items: [
            {
              label: 'wot',
              value: 'wat > wot',
              count: 15,
            },
          ],
        },
      ]);

      const transformItems = jest.fn(() => ['items']);
      props = getProvidedProps(
        { attributes: ['ok'], transformItems },
        {},
        { results }
      );
      expect(transformItems.mock.calls[0][0]).toEqual([
        {
          label: 'wat',
          value: 'wat',
          count: 20,
          items: [
            {
              label: 'wot',
              value: 'wat > wot',
              count: 15,
            },
            {
              label: 'wut',
              value: 'wat > wut',
              count: 5,
            },
          ],
        },
        {
          label: 'oy',
          value: 'oy',
          count: 10,
        },
      ]);
      expect(props.items).toEqual(['items']);
    });

    it("calling refine updates the widget's search state", () => {
      let refine = connect.refine.bind(context);

      let nextState = refine(
        { attributes: ['ok'] },
        {
          indices: {
            first: { otherKey: 'val', hierarchicalMenu: { otherKey: 'val' } },
          },
        },
        'yep'
      );
      expect(nextState).toEqual({
        indices: {
          first: {
            otherKey: 'val',
            page: 1,
            hierarchicalMenu: { ok: 'yep', otherKey: 'val' },
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
        { attributes: ['ok'] },
        {
          indices: {
            first: {
              otherKey: 'val',
              hierarchicalMenu: { ok: 'yep', otherKey: 'val' },
            },
          },
        },
        'yep'
      );

      expect(nextState).toEqual({
        indices: {
          first: {
            otherKey: 'val',
            hierarchicalMenu: { ok: 'yep', otherKey: 'val' },
          },
          second: { page: 1, hierarchicalMenu: { ok: 'yep' } },
        },
      });
    });

    it('correctly applies its state to search parameters', () => {
      const initSP = new SearchParameters();

      params = getSP(
        initSP,
        {
          attributes: ['ATTRIBUTE'],
          separator: 'SEPARATOR',
          rootPath: 'ROOT_PATH',
          showParentLevel: true,
          limitMin: 1,
        },
        {
          indices: {
            first: { otherKey: 'val', hierarchicalMenu: { ATTRIBUTE: 'ok' } },
          },
        }
      );
      expect(params).toEqual(
        initSP
          .addHierarchicalFacet({
            name: 'ATTRIBUTE',
            attributes: ['ATTRIBUTE'],
            separator: 'SEPARATOR',
            rootPath: 'ROOT_PATH',
            showParentLevel: true,
          })
          .toggleHierarchicalFacetRefinement('ATTRIBUTE', 'ok')
          .setQueryParameter('maxValuesPerFacet', 1)
      );
    });

    it('registers its filter in metadata', () => {
      const metadata = getMetadata(
        { attributes: ['ok'] },
        { indices: { first: { hierarchicalMenu: { ok: 'wat' } } } }
      );
      expect(metadata).toEqual({
        id: 'ok',
        index: 'first',
        items: [
          {
            label: 'ok: wat',
            attributeName: 'ok',
            currentRefinement: 'wat',
            // Ignore clear, we test it later
            value: metadata.items[0].value,
          },
        ],
      });
    });

    it('items value function should clear it from the search state', () => {
      const metadata = getMetadata(
        { attributes: ['one'] },
        { indices: { first: { hierarchicalMenu: { one: 'one', two: 'two' } } } }
      );

      const searchState = metadata.items[0].value({
        indices: { first: { hierarchicalMenu: { one: 'one', two: 'two' } } },
      });

      expect(searchState).toEqual({
        indices: {
          first: { page: 1, hierarchicalMenu: { one: '', two: 'two' } },
        },
      });
    });

    it('should return the right searchState when clean up', () => {
      let searchState = cleanUp(
        { attributes: ['one'] },
        {
          indices: {
            first: {
              hierarchicalMenu: { one: 'one', two: 'two' },
              another: { searchState: 'searchState' },
            },
          },
        }
      );
      expect(searchState).toEqual({
        indices: {
          first: {
            hierarchicalMenu: { two: 'two' },
            another: { searchState: 'searchState' },
          },
        },
      });

      searchState = cleanUp({ attributes: ['two'] }, searchState);
      expect(searchState).toEqual({
        indices: {
          first: {
            another: { searchState: 'searchState' },
            hierarchicalMenu: {},
          },
        },
      });
    });
  });
});
