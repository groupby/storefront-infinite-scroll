import { Events, ProductTransformer, Selectors } from '@storefront/core';
import InfiniteScroll from '../../src/infinite-scroll';
import suite from './_suite';

const STRUCTURE = { a: 'b' };

suite('InfiniteScroll', ({ expect, spy, stub, itShouldBeConfigurable, itShouldHaveAlias }) => {
  let infiniteScroll: InfiniteScroll;
  let set;

  beforeEach(() => {
    infiniteScroll = new InfiniteScroll();
    set = infiniteScroll.set = spy();
  });

  itShouldBeConfigurable(InfiniteScroll);
  itShouldHaveAlias(InfiniteScroll, 'infinite');

  describe('constructor()', () => {
    describe('state', () => {
      it('should have initial value', () => {
        expect(infiniteScroll.state).to.eql({ items: [], lastScroll: 0, oneTime: true });
      });
    });

    describe('productTransformer()', () => {
      it('should wrap ProductTransformer', () => {
        const data: any = { a: 'b' };
        const meta: any = { c: 'd' };
        const index: any = 124;
        const transformed = { y: 'z' };
        const structure = <any>{ e: 'f' };
        const transformer = spy(() => ({ data: transformed }));
        const transformerFactory = stub(ProductTransformer, 'transformer').returns(transformer);
        infiniteScroll.config = <any>{
          structure
        };

        expect(infiniteScroll.productTransformer({ data, meta, index })).to.eql({ data: transformed, meta, index });
        expect(transformerFactory).to.be.calledWithExactly(structure);
        expect(transformer).to.be.calledWithExactly(data);
      });
    });
  });

  describe('init()', () => {
    it('should listen for PRODUCTS_UPDATED', () => {
      const on = spy();
      infiniteScroll.flux = <any>{ on };

      infiniteScroll.init();

      expect(on).to.be.calledWithExactly(Events.PRODUCTS_UPDATED, infiniteScroll.updateProducts);
    });

    it('should listen for MORE_PRODUCTS_ADDED', () => {
      const on = spy();
      infiniteScroll.flux = <any>{ on };

      infiniteScroll.init();

      expect(on).to.be.calledWithExactly(Events.MORE_PRODUCTS_ADDED, infiniteScroll.setProducts);
    });

    it('should listen for PAGE_UPDATED', () => {
      const on = spy();
      infiniteScroll.flux = <any>{ on };

      infiniteScroll.init();

      expect(on).to.be.calledWithExactly(Events.PAGE_UPDATED, infiniteScroll.replaceState);
    });

    it('should listen for SEARCH_CHANGED', () => {
      const on = spy();
      infiniteScroll.flux = <any>{ on };

      infiniteScroll.init();

      expect(on).to.be.calledWithExactly(Events.SEARCH_CHANGED, infiniteScroll.setFlag);
    });
  });

  describe('onMount()', () => {
    it('should update state with scroller, wrapper, and oneTime', () => {
      const wrapper = { a: 'b' };
      const scroller = { refs: { wrapper } };
      const set = infiniteScroll.set = spy();
      const state = infiniteScroll.state = <any>{ a: 'b' };
      infiniteScroll.tags = {
        'gb-list': scroller
      };

      infiniteScroll.onMount();

      expect(infiniteScroll.state).to.eql({ ...state, scroller, wrapper, oneTime: true });
    });
  });

  describe('onUpdated()', () => {
    it('should not change state if there are no items', () => {
      const set = infiniteScroll.set = spy();
      const state = infiniteScroll.state = <any>{ a: 'b', items: [] };

      infiniteScroll.onUpdated();

      expect(infiniteScroll.state).to.eq(state);
    });

    it('should only set padding on state when oneTime is false', () => {
      const oneTime = false;
      const wrapper = { style: { paddingTop: 0 } };
      const scroller = { root: { scrollTop: 0 } };
      const state = infiniteScroll.state = <any>{ a: 'b', items: [1, 2, 3, 4], wrapper, scroller, oneTime };
      const padding = 200;
      const calculatePadding = infiniteScroll.calculatePadding = spy(() => padding);

      infiniteScroll.onUpdated();

      expect(infiniteScroll.state).to.eql({ ...state, padding });
      expect(scroller.root.scrollTop).to.eq(0);
      expect(wrapper.style.paddingTop).to.eq(`${padding}px`);
    });

    it('should set padding, lastScroll, and getPage when oneTime is true', () => {
      const oneTime = true;
      const wrapper = { style: { paddingTop: 0 } };
      const addEventListener = spy();
      const scroller = { root: { scrollTop: 0, addEventListener } };
      const state = infiniteScroll.state = <any>{ a: 'b', items: [1, 2, 3, 4], wrapper, scroller, oneTime };
      const padding = 200;
      const calculatePadding = infiniteScroll.calculatePadding = spy(() => padding);

      infiniteScroll.onUpdated();

      expect(infiniteScroll.state).to.eql({ ...state, padding, lastScroll: padding, getPage: false });
      expect(scroller.root.scrollTop).to.eq(padding);
      expect(wrapper.style.paddingTop).to.eq(`${padding}px`);
      expect(addEventListener).to.be.calledWithExactly('scroll', infiniteScroll.scroll);
    });
  });

  describe('updateProducts()', () => {
    it('should update state', () => {
      const items = ['a', 'b', 'c'];
      const children = ['e', 'f', 'g'];
      const wrapper = { children };
      const setProducts = infiniteScroll.setProducts = spy(() => items);
      infiniteScroll.state = <any>{ wrapper };

      infiniteScroll.updateProducts();

      expect(setProducts).to.be.calledOnce;
      expect(infiniteScroll.state).to.eql({
        wrapper,
        elItems: children,
        firstEl: items[0],
        lastEl: items[items.length - 1],
        getPage: false,
        oneTime: true,
      });
    });
  });

  describe('setProducts()', () => {
    let productTransformer;

    beforeEach(() => {
      productTransformer = infiniteScroll.productTransformer = spy((item) => item);
    });

    it('should add more products to the end of items when fetched forward', () => {
      const products = <any>[{ index: 3 }, { index: 4 }, { index: 5 }];
      const items = [{ index: 0 }, { index: 1 }, { index: 2 }];
      infiniteScroll.state = <any>{ items };

      const result = infiniteScroll.setProducts(products);

      expect(productTransformer).to.be.calledThrice;
      expect(set).to.be.calledWithExactly({ items: result });
      expect(result).to.eql([...items, ...products]);
    });

    it('should add more products to the beginning of items when fetched backward', () => {
      const products = <any>[{ index: 0 }, { index: 1 }, { index: 2 }];
      const items = [{ index: 3 }, { index: 4 }, { index: 5 }];
      const maintainScrollTop = infiniteScroll.maintainScrollTop = spy();
      const scrollTop = 3400;
      infiniteScroll.state = <any>{ items, scroller: { root: { scrollTop } } };

      const result = infiniteScroll.setProducts(products);

      expect(productTransformer).to.be.calledThrice;
      expect(maintainScrollTop).to.be.calledWithExactly(result, scrollTop);
      expect(result).to.eql([...products, ...items]);
    });

    it('should get and set items if did not receive products from an add more event', () => {
      const products = <any>[{ index: 0 }, { index: 1 }, { index: 2 }];
      const state = { a: 'b' };
      const getState = spy(() => state);
      const productsWithMetadata = stub(Selectors, 'productsWithMetadata').returns(products);
      infiniteScroll.flux = <any>{ store: { getState } };

      const result = infiniteScroll.setProducts();

      expect(productsWithMetadata).to.be.calledWithExactly(state);
      expect(getState).to.be.calledOnce;
      expect(productTransformer).to.be.calledThrice;
      expect(set).to.be.calledWithExactly({ items: result });
      expect(result).to.eql(products);
    });
  });

  describe('maintainScrollTop()', () => {
    it('should set items and scrollTop of scroller', () => {
      const items = <any>[{ index: 0 }, { index: 1 }, { index: 2 }];
      const scrollTop = 3450;
      infiniteScroll.state = <any>{ scroller: { root: { scrollTop: 9 } } };

      infiniteScroll.maintainScrollTop(items, scrollTop);

      expect(set).to.be.calledWithExactly({ items });
      expect(infiniteScroll.state.scroller.root.scrollTop).to.eq(scrollTop);
    });
  });

  describe('setFlag()', () => {
    it('should set oneTime to true', () => {
      infiniteScroll.setFlag();

      expect(set).to.be.calledWithExactly({ oneTime: true });
    });
  });

  describe('scroll()', () => {
    it('should call calculatePageChange', () => {
      const getWrapperHeight = () => ({ height: 200 });
      const getScrollerHeight = () => ({ height: 500 });
      const calculatePageChange = infiniteScroll.calculatePageChange = spy();
      infiniteScroll.state = <any>{
        wrapper: { getBoundingClientRect: getWrapperHeight },
        scroller: { root: { getBoundingClientRect: getScrollerHeight } },
        getPage: true,
      };

      infiniteScroll.scroll();

      expect(calculatePageChange).to.be.calledOnce;
    });

    it.only('should call fetchMoreItems when hit breakpoint to fetch forward', () => {
      const getWrapperHeight = () => ({ height: 0 });
      const getScrollerHeight = () => ({ height: 0 });
      const calculatePageChange = infiniteScroll.calculatePageChange = spy();
      const recordCount = stub(Selectors, 'recordCount').returns(100);
      const fetchMoreItems = infiniteScroll.fetchMoreItems = spy();
      const getState = spy();
      infiniteScroll.flux = <any>{ store: { getState } };
      infiniteScroll.state = <any>{
        wrapper: { getBoundingClientRect: getWrapperHeight },
        scroller: { root: { getBoundingClientRect: getScrollerHeight, scrollTop: 100 } },
        lastScroll: 10,
        items: [{ index: 50 }],
      };

      infiniteScroll.scroll();

      expect(fetchMoreItems).to.be.calledOnce;
    });
  });
});
