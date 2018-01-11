import { Events, ProductTransformer, Selectors } from '@storefront/core';
import { Routes } from '@storefront/flux-capacitor';
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
      const state = infiniteScroll.state = <any>{ a: 'b' };
      set = infiniteScroll.set = spy();
      infiniteScroll.tags = {
        'gb-list': scroller
      };

      infiniteScroll.onMount();

      expect(infiniteScroll.state).to.eql({ ...state, scroller, wrapper, oneTime: true });
    });
  });

  describe('onUpdated()', () => {
    it('should not change state if there are no items', () => {
      const state = infiniteScroll.state = <any>{ a: 'b', items: [] };
      set = infiniteScroll.set = spy();

      infiniteScroll.onUpdated();

      expect(infiniteScroll.state).to.eq(state);
    });

    it('should only set padding on state when oneTime is false', () => {
      const oneTime = false;
      const wrapper = { style: { paddingTop: 0 } };
      const scroller = { root: { scrollTop: 0 } };
      const state = infiniteScroll.state = <any>{ a: 'b', items: [1, 2, 3, 4], wrapper, scroller, oneTime };
      const padding = 200;
      const calculatePadding = infiniteScroll.calculateOffset = spy(() => padding);

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
      const calculatePadding = infiniteScroll.calculateOffset = spy(() => padding);

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

    it('should call fetchMoreItems when hit breakpoint to fetch forward', () => {
      const getWrapperHeight = () => ({ height: 0 });
      const getScrollerHeight = () => ({ height: 0 });
      const recordCount = stub(Selectors, 'recordCount').returns(100);
      const fetchMoreItems = infiniteScroll.fetchMoreItems = spy();
      const getState = spy();
      const scrollTop = 100;
      const state = <any>{
        wrapper: { getBoundingClientRect: getWrapperHeight },
        scroller: { root: { getBoundingClientRect: getScrollerHeight, scrollTop } },
        lastScroll: 10,
        items: [{ index: 50 }],
      };
      infiniteScroll.flux = <any>{ store: { getState } };
      infiniteScroll.state = state;

      infiniteScroll.scroll();

      expect(fetchMoreItems).to.be.calledOnce;
      expect(infiniteScroll.state).to.eql({ ...state, lastScroll: scrollTop, getPage: true });
    });

    it('should call fetchMoreItems with false when hit breakpoint to fetch backward', () => {
      const getWrapperHeight = () => ({ height: 0 });
      const getScrollerHeight = () => ({ height: 0 });
      const fetchMoreItems = infiniteScroll.fetchMoreItems = spy();
      const scrollTop = 10;
      const state = <any>{
        wrapper: { getBoundingClientRect: getWrapperHeight },
        scroller: { root: { getBoundingClientRect: getScrollerHeight, scrollTop } },
        lastScroll: 100,
        items: [{ index: 50 }],
        padding: 100,
      };
      infiniteScroll.state = state;

      infiniteScroll.scroll();

      expect(fetchMoreItems).to.be.calledWithExactly(false);
      expect(infiniteScroll.state).to.eql({ ...state, lastScroll: scrollTop, getPage: true });
    });
  });

  describe('calculatePadding()', () => {
    it('should calculate padding', () => {
      const scroller = { root: { getBoundingClientRect: () => ({ width: 100 }) } };
      const firstItemIndex = 2;
      infiniteScroll.props = <any>{
        itemWidth: 50,
        itemHeight: 30,
      };

      const padding = infiniteScroll.calculateOffset(scroller, firstItemIndex);

      expect(padding).to.eq(15);
    });
  });

  describe('calculatePageChange()', () => {
    it('should call setPage when first exists and it is below the offset', () => {
      const getItem = infiniteScroll.getItem = spy(() => 30);
      const root = { a: 'b' };
      const getState = spy();
      const recordCount = 50;
      const page = 5;
      const pageSize = stub(Selectors, 'pageSize').returns(10);
      const topElBelowOffset = infiniteScroll.topElBelowOffset = spy(() => true);
      const getIndex = infiniteScroll.getIndex = spy((val) => {
        return val === 21 ? 0 : 4;
      });
      const setPage = infiniteScroll.setPage = spy();
      const state = <any>{
        scroller: { root },
        firstEl: { index: 31 },
        lastEl: { index: 60 },
        items: [1, 2, 3, 4, 5],
      };
      stub(Selectors, 'page').returns(5);
      stub(Selectors, 'recordCount').returns(recordCount);
      infiniteScroll.state = state;
      infiniteScroll.flux = <any>{ store: { getState } };

      infiniteScroll.calculatePageChange();

      expect(topElBelowOffset).to.be.calledWithExactly(30, root);
      expect(infiniteScroll.state).to.eql({
        ...state,
        firstEl: 1,
        lastEl: 5,
      });
      expect(setPage).to.be.calledWithExactly(recordCount, page - 1);
    });

    it('should call setPage when last exists and it is above the offset', () => {
      const getItem = infiniteScroll.getItem = spy(() => 30);
      const root = { a: 'b' };
      const getState = spy();
      const recordCount = 50;
      const page = 5;
      const pageSize = stub(Selectors, 'pageSize').returns(10);
      const topElBelowOffset = infiniteScroll.topElBelowOffset = spy(() => false);
      const bottomElAboveOffset = infiniteScroll.bottomElAboveOffset = spy(() => true);
      const getIndex = infiniteScroll.getIndex = spy((val) => {
        return val === 41 ? 4 : 0;
      });
      const setPage = infiniteScroll.setPage = spy();
      const state = <any>{
        scroller: { root },
        firstEl: { index: 31 },
        lastEl: { index: 60 },
        items: [1, 2, 3, 4, 5],
      };
      stub(Selectors, 'page').returns(5);
      stub(Selectors, 'recordCount').returns(recordCount);
      infiniteScroll.state = state;
      infiniteScroll.flux = <any>{ store: { getState } };

      infiniteScroll.calculatePageChange();

      expect(topElBelowOffset).to.be.calledWithExactly(30, root);
      expect(infiniteScroll.state).to.eql({
        ...state,
        firstEl: 5,
        lastEl: 1,
      });
      expect(setPage).to.be.calledWithExactly(recordCount, page + 1);
    });

    it('should not call setPage if no first or last exists', () => {
      const getItem = infiniteScroll.getItem = spy();
      const root = { a: 'b' };
      const getState = spy();
      const recordCount = 50;
      const page = 5;
      const pageSize = stub(Selectors, 'pageSize').returns(10);
      const setPage = infiniteScroll.setPage = spy();
      const state = <any>{
        scroller: { root },
        firstEl: { index: 31 },
        lastEl: { index: 60 },
      };
      stub(Selectors, 'page').returns(5);
      stub(Selectors, 'recordCount').returns(recordCount);
      infiniteScroll.state = state;
      infiniteScroll.flux = <any>{ store: { getState } };

      infiniteScroll.calculatePageChange();

      expect(setPage).to.not.be.called;
    });

    it('should not call setPage if topElBelowOffset and bottomElAboveOffset are both false', () => {
      const getItem = infiniteScroll.getItem = spy(() => 30);
      const root = { a: 'b' };
      const getState = spy();
      const recordCount = 50;
      const page = 5;
      const pageSize = stub(Selectors, 'pageSize').returns(10);
      const topElBelowOffset = infiniteScroll.topElBelowOffset = spy(() => false);
      const bottomElAboveOffset = infiniteScroll.bottomElAboveOffset = spy(() => false);
      const setPage = infiniteScroll.setPage = spy();
      const state = <any>{
        scroller: { root },
        firstEl: { index: 31 },
        lastEl: { index: 60 },
      };
      stub(Selectors, 'page').returns(5);
      stub(Selectors, 'recordCount').returns(recordCount);
      infiniteScroll.state = state;
      infiniteScroll.flux = <any>{ store: { getState } };

      infiniteScroll.calculatePageChange();

      expect(setPage).to.not.be.called;
    });
  });

  describe('getItem()', () => {
    it('should return the element based on the recordIndex', () => {
      const recordIndex = 3;
      const getIndex = infiniteScroll.getIndex = spy(() => 4);
      infiniteScroll.state = <any>{ elItems: [2, 3, 4, 5, 6, 7] };

      const item = infiniteScroll.getItem(recordIndex);

      expect(getIndex).to.be.calledWithExactly(recordIndex);
      expect(item).to.eq(6);
    });
  });

  describe('topElBelowOffset()', () => {
    it('should return true if element\'s top is greater than offset', () => {
      const element = <any>{ getBoundingClientRect: () => ({ top: 1000, height: 20 }) };
      const parent = <any>{ getBoundingClientRect: () => ({ top: 200 }) };

      const topElBelowOffset = infiniteScroll.topElBelowOffset(element, parent);

      expect(topElBelowOffset).to.be.true;
    });

    it('should return false if element\'s top is less than offset', () => {
      const element = <any>{ getBoundingClientRect: () => ({ top: 100, height: 20 }) };
      const parent = <any>{ getBoundingClientRect: () => ({ top: 200 }) };

      const topElBelowOffset = infiniteScroll.topElBelowOffset(element, parent);

      expect(topElBelowOffset).to.be.false;
    });
  });

  describe('bottomElAboveOffset()', () => {
    it('should return true if element\'s bottom is less than offset', () => {
      const element = <any>{ getBoundingClientRect: () => ({ bottom: 100, height: 20 }) };
      const parent = <any>{ getBoundingClientRect: () => ({ bottom: 200 }) };

      const bottomElAboveOffset = infiniteScroll.bottomElAboveOffset(element, parent);

      expect(bottomElAboveOffset).to.be.true;
    });

    it('should return false if element\'s bottom is greater than offset', () => {
      const element = <any>{ getBoundingClientRect: () => ({ bottom: 1000, height: 20 }) };
      const parent = <any>{ getBoundingClientRect: () => ({ bottom: 200 }) };

      const bottomElAboveOffset = infiniteScroll.bottomElAboveOffset(element, parent);

      expect(bottomElAboveOffset).to.be.false;
    });
  });

  describe('getIndex()', () => {
    it('should return the index for the item that matches index', () => {
      infiniteScroll.state = <any>{ items: [{ index: 4 }, { index: 1 }] };

      const index = infiniteScroll.getIndex(4);

      expect(index).to.eq(0);
    });
  });

  describe('setPage()', () => {
    it('should call receivePage() with page info', () => {
      const count = 30;
      const page = 3;
      const receivePage = spy();
      infiniteScroll.actions = <any>{ receivePage };

      infiniteScroll.setPage(count, page);

      expect(receivePage).to.be.calledWithExactly(count, page);
    });
  });

  describe('replaceState()', () => {
    it('should call replaceState with search route if oneTime is false', () => {
      const replaceState = spy();
      infiniteScroll.state = <any>{ oneTime: false };
      infiniteScroll.flux = <any>{ replaceState };

      infiniteScroll.replaceState();

      expect(replaceState).to.be.calledWithExactly(Routes.SEARCH);
    });

    it('should not call replaceState if oneTime is true', () => {
      const replaceState = spy();
      infiniteScroll.state = <any>{ oneTime: true };
      infiniteScroll.flux = <any>{ replaceState };

      infiniteScroll.replaceState();

      expect(replaceState).to.not.be.called;
    });
  });

  describe('fetchMoreItems()', () => {
    it('should set state and fetch forward', () => {
      const page = 2;
      const fetchMoreProducts = spy();
      infiniteScroll.actions = <any>{ fetchMoreProducts };
      infiniteScroll.flux = <any>{ store: { getState: () => null } };
      infiniteScroll.state = <any>{ oneTime: true };
      stub(Selectors, 'pageSize').returns(page);

      infiniteScroll.fetchMoreItems();

      expect(infiniteScroll.state).to.eql({ ...infiniteScroll.state, oneTime: false });
      expect(fetchMoreProducts).to.be.calledWithExactly(page, true);
    });

    it('should set state and fetch backward', () => {
      const page = 3;
      const fetchMoreProducts = spy();
      infiniteScroll.actions = <any>{ fetchMoreProducts };
      infiniteScroll.flux = <any>{ store: { getState: () => null } };
      stub(Selectors, 'pageSize').returns(page);

      infiniteScroll.fetchMoreItems(false);

      expect(fetchMoreProducts).to.be.calledWithExactly(page, false);
    });
  });
});
