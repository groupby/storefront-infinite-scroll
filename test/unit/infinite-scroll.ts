import { Events, ProductTransformer, Selectors } from '@storefront/core';
import { Routes } from '@storefront/flux-capacitor';
import InfiniteScroll, { LOADLABEL, PADDING } from '../../src/infinite-scroll';
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
        expect(infiniteScroll.state.items).to.eql([]);
        expect(infiniteScroll.state.lastScroll).to.eq(0);
        expect(infiniteScroll.state.oneTime).to.be.true;
        expect(infiniteScroll.state.loadMore).to.be.false;
        expect(infiniteScroll.state.isFetchingForward).to.be.false;
        expect(infiniteScroll.state.isFetchingBackward).to.be.false;
        expect(infiniteScroll.state.setScroll).to.be.false;
      });

      describe('clickMore', () => {
        it('should call fetchMoreItems', () => {
          const fetchMoreItems = infiniteScroll.fetchMoreItems = spy();

          infiniteScroll.state.clickMore();

          expect(fetchMoreItems).to.be.calledOnce.calledWithExactly();
        });
      });

      describe('clickPrev', () => {
        it('should call fetchMoreItems with false', () => {
          const fetchMoreItems = infiniteScroll.fetchMoreItems = spy();

          infiniteScroll.state.clickPrev();

          expect(fetchMoreItems).to.be.calledOnce.calledWithExactly(false);
        });
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
    describe('PAST_PURCHASES', () => {
      it('should  listen for correct events and set state', () => {
        const on = spy();
        const initialState = infiniteScroll.state;
        infiniteScroll.props = <any>{ storeSection: 'pastPurchases' };
        infiniteScroll.flux = <any>{ on };

        infiniteScroll.init();

        expect(on).to.be.calledWithExactly(Events.PAST_PURCHASE_PRODUCTS_UPDATED, infiniteScroll.updateProducts);
        expect(on).to.be.calledWithExactly(Events.PAST_PURCHASE_MORE_PRODUCTS_ADDED, infiniteScroll.setProducts);
        expect(on).to.be.calledWithExactly(Events.PAST_PURCHASE_PAGE_UPDATED, infiniteScroll.replaceState);
        expect(on).to.be.calledWithExactly(Events.INFINITE_SCROLL_UPDATED, infiniteScroll.setFetchFlags);
        expect(infiniteScroll.state).to.eql({ ...initialState, ...infiniteScroll.pastPurchaseMethods });
      });
    });

    describe('SEARCH', () => {
      it('should  listen for correct events and set state', () => {
        const on = spy();
        const initialState = infiniteScroll.state;
        infiniteScroll.props = <any>{ storeSection: 'search' };
        infiniteScroll.flux = <any>{ on };

        infiniteScroll.init();

        expect(on).to.be.calledWithExactly(Events.PRODUCTS_UPDATED, infiniteScroll.updateProducts);
        expect(on).to.be.calledWithExactly(Events.MORE_PRODUCTS_ADDED, infiniteScroll.setProducts);
        expect(on).to.be.calledWithExactly(Events.PAGE_UPDATED, infiniteScroll.replaceState);
        expect(on).to.be.calledWithExactly(Events.SEARCH_CHANGED, infiniteScroll.setFlag);
        expect(on).to.be.calledWithExactly(Events.INFINITE_SCROLL_UPDATED, infiniteScroll.setFetchFlags);
        expect(infiniteScroll.state).to.eql({ ...initialState, ...infiniteScroll.searchMethods });
      });
    });
  });

  describe('onMount()', () => {
    it('should update state with scroller, wrapper, and oneTime', () => {
      const wrapper = { a: 'b' };
      const scroller = { refs: { wrapper } };
      const state = infiniteScroll.state = <any>{ a: 'b', loadMore: false };
      infiniteScroll.props = <any>{};
      infiniteScroll.tags = {
        'gb-infinite-list': scroller
      };

      infiniteScroll.onMount();

      expect(infiniteScroll.state).to.eql({
        ...state,
        scroller,
        wrapper,
        oneTime: true,
        loadMore: false,
        loaderLabel: LOADLABEL,
      });
    });

    it('should set from props', () => {
      const wrapper = { a: 'b' };
      const scroller = { refs: { wrapper } };
      const state = infiniteScroll.state = <any>{ a: 'b' };
      const loaderLabel = 'heyyoloading';
      infiniteScroll.tags = {
        'gb-infinite-list': scroller
      };
      infiniteScroll.props = <any>{ loadMore: true, loaderLabel };

      infiniteScroll.onMount();

      expect(infiniteScroll.state).to.eql({ ...state, scroller, wrapper, oneTime: true, loadMore: true, loaderLabel });
    });
  });

  describe('onUpdated()', () => {
    let initialState;
    let wrapper;
    let scroller;
    let addEventListener;

    beforeEach(() => {
      addEventListener = spy();
      wrapper = { style: { paddingTop: 0 } };
      scroller = { root: { scrollTop: 0, addEventListener } };
      initialState = {
        items: [{ index: 1 }, { index: 2 }, { index: 3 }, { index: 4 }],
        prevExists: true,
        wrapper,
        oneTime: true,
        scroller,
        setScroll: false,
      };
    });

    it('should not change state if there are no items', () => {
      const state = infiniteScroll.state = <any>{ a: 'b', items: [] };
      set = infiniteScroll.set = spy();

      infiniteScroll.onUpdated();

      expect(infiniteScroll.state).to.eq(state);
    });

    it('should only set padding on state when loadMore is false', () => {
      const state = infiniteScroll.state = <any>{ ...initialState, a: 'b', oneTime: true };
      const padding = 200;
      const calculatePadding = infiniteScroll.calculateOffset = spy(() => padding);
      const setScroll = infiniteScroll.setScroll = spy();

      infiniteScroll.onUpdated();

      expect(infiniteScroll.state).to.eql({ ...state, padding, getPage: false });
      expect(calculatePadding).to.be.calledWithExactly(0);
      expect(wrapper.style.paddingTop).to.eq(`${PADDING}px`);
      expect(scroller.root.scrollTop).to.eq(PADDING);
      expect(scroller.root.addEventListener).to.be.calledWithExactly('scroll', infiniteScroll.scroll);
    });

    it('should still set eventListener if loadMore is true and oneTime is true', () => {
      const state = infiniteScroll.state = <any>{ ...initialState, a: 'b', loadMore: true, oneTime: true };
      const setScroll = infiniteScroll.setScroll = spy();

      infiniteScroll.onUpdated();

      expect(infiniteScroll.state).to.eql({ ...state, getPage: false });
      expect(addEventListener).to.be.calledWithExactly('scroll', infiniteScroll.scroll);
    });
  });

  describe('setScroll()', () => {
    it('should call maintainScrollTop and add eventListener when all imgs are loaded', () => {
      const onload = spy();
      const imgs = [{ onload }, { onload }, { onload }];
      const querySelectorAll = spy(() => imgs);
      const pageSize = spy(() => 3);
      const getState = spy();
      const rememberScroll = 15;
      const maintainScrollTop = infiniteScroll.maintainScrollTop = spy();
      const addEventListener = spy();
      infiniteScroll.state = <any>{
        wrapper: { querySelectorAll },
        pageSize,
        rememberScroll,
        scroller: { root: { addEventListener } },
      };
      infiniteScroll.flux = <any>{ store: { getState } };

      infiniteScroll.setScroll();
      imgs[0].onload();
      imgs[1].onload();
      imgs[2].onload();

      expect(maintainScrollTop).to.be.calledWithExactly(rememberScroll);
      expect(addEventListener).to.be.calledWithExactly('scroll', infiniteScroll.scroll);
      expect(infiniteScroll.state).to.eql({ ...infiniteScroll.state, setScroll: false });
    });

    it('should call maintainScrollTop and add eventListener after 500 ms if imgs dont load', (done) => {
      const onload = spy();
      const imgs = [{ onload }, { onload }, { onload }];
      const querySelectorAll = spy(() => imgs);
      const pageSize = spy(() => 3);
      const getState = spy();
      const rememberScroll = 15;
      const maintainScrollTop = infiniteScroll.maintainScrollTop = spy();
      const addEventListener = spy();
      infiniteScroll.state = <any>{
        wrapper: { querySelectorAll },
        pageSize,
        rememberScroll,
        scroller: { root: { addEventListener } },
      };
      infiniteScroll.flux = <any>{ store: { getState } };

      infiniteScroll.setScroll();

      setTimeout(function() {
        expect(maintainScrollTop).to.be.calledWithExactly(rememberScroll);
        expect(addEventListener).to.be.calledWithExactly('scroll', infiniteScroll.scroll);
        done();
      }, 501);
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
    let getState;
    let recordCount;

    beforeEach(() => {
      getState = () => null;
      recordCount = spy(() => 20);
      productTransformer = infiniteScroll.productTransformer = spy((item) => item);
      infiniteScroll.flux = <any>{ store: { getState } };
      infiniteScroll.state = <any>{ ...infiniteScroll.state, recordCount };
    });

    it('should add more products to the end of items when fetched forward', () => {
      const products = <any>[{ index: 4 }, { index: 5 }, { index: 6 }];
      const items = [{ index: 1 }, { index: 2 }, { index: 3 }];
      infiniteScroll.state = <any>{ ...infiniteScroll.state, items };

      const result = infiniteScroll.setProducts(products);

      expect(productTransformer).to.be.calledThrice;
      expect(set).to.be.calledWithExactly({
        items: result,
        prevExists: false,
        moreExists: true,
      });
      expect(result).to.eql([...items, ...products]);
      expect(recordCount).to.be.called;
    });

    it('should add more products to the beginning of items when fetched backward', () => {
      const products = <any>[{ index: 1 }, { index: 2 }, { index: 3 }];
      const items = [{ index: 4 }, { index: 5 }, { index: 6 }];
      const maintainScrollTop = infiniteScroll.maintainScrollTop = spy();
      const scrollTop = 3400;
      const pageSize = spy(() => 10);
      const removeEventListener = spy();
      const calculateOffset = infiniteScroll.calculateOffset = spy(() => 12);
      const state = infiniteScroll.state = <any>{
        ...infiniteScroll.state,
        items,
        scroller: { root: { scrollTop, removeEventListener } },
        pageSize
      };

      const result = infiniteScroll.setProducts(products);

      expect(productTransformer).to.be.calledThrice;
      expect(pageSize).to.be.calledWithExactly(getState());
      expect(calculateOffset).to.be.calledWithExactly(pageSize());
      expect(set).to.be.calledWith({
        ...state,
        items: result,
        setScroll: true,
        rememberScroll: 3412,
        prevExists: false,
        moreExists: true,
      });
      expect(result).to.eql([...products, ...items]);
      expect(removeEventListener).to.be.calledWithExactly('scroll', infiniteScroll.scroll);
    });

    it('should get and set items if did not receive products from an add more event', () => {
      const products = <any>[{ index: 0 }, { index: 1 }, { index: 2 }];
      const productsWithMetadata = spy(() => products);
      const removeEventListener = spy();
      infiniteScroll.state = <any>{
        ...infiniteScroll.state,
        productsWithMetadata,
        scroller: { root: { removeEventListener } }
      };
      infiniteScroll.flux = <any>{ store: { getState } };

      const result = infiniteScroll.setProducts();

      expect(productsWithMetadata).to.be.calledWithExactly(getState());
      expect(productTransformer).to.be.calledThrice;
      expect(set).to.be.calledWithExactly({
        items: result,
        setScroll: true,
        rememberScroll: PADDING,
        prevExists: true,
        moreExists: true,
      });
      expect(result).to.eql(products);
    });
  });

  describe('maintainScrollTop()', () => {
    it('should set scrollTop of scroller', () => {
      const scrollTop = 3450;
      infiniteScroll.state = <any>{ scroller: { root: { scrollTop: 9 } } };

      infiniteScroll.maintainScrollTop(scrollTop);

      expect(infiniteScroll.state.scroller.root.scrollTop).to.eq(scrollTop);
    });
  });

  describe('setFlag()', () => {
    it('should set oneTime to true', () => {
      infiniteScroll.setFlag();

      expect(set).to.be.calledWithExactly({ oneTime: true });
    });
  });

  describe('setFetchFlags()', () => {
    it('should set oneTime to true', () => {
      const fetchState = { isFetchingForward: true, isFetchingBackward: false };
      infiniteScroll.setFetchFlags(fetchState);

      expect(set).to.be.calledWithExactly(fetchState);
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
      const recordCount = spy(() => 100);
      const fetchMoreItems = infiniteScroll.fetchMoreItems = spy();
      const getState = spy();
      const scrollTop = 100;
      const state = <any>{
        wrapper: { getBoundingClientRect: getWrapperHeight },
        scroller: { root: { getBoundingClientRect: getScrollerHeight, scrollTop } },
        lastScroll: 10,
        items: [{ index: 50 }],
        recordCount,
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
        prevExists: true,
      };
      infiniteScroll.state = state;

      infiniteScroll.scroll();

      expect(fetchMoreItems).to.be.calledWithExactly(false);
      expect(infiniteScroll.state).to.eql({ ...state, lastScroll: scrollTop, getPage: true });
    });
  });

  describe('calculateOffset()', () => {
    it('should calculate offset', () => {
      const scroller = {
        root: { getBoundingClientRect: () => ({ width: 200 }) },
        tags: {
          'gb-list-item': [{ root: { getBoundingClientRect: () => ({ width: 100, height: 3 }) } }]
        }
      };
      infiniteScroll.state = <any>{
        ...infiniteScroll.state,
        scroller,
      };

      const padding = infiniteScroll.calculateOffset(10);

      expect(padding).to.eq(15);
    });
  });

  describe('calculatePageChange()', () => {
    it('should call setPage when first exists and it is below the offset', () => {
      const getItem = infiniteScroll.getItem = spy(() => 30);
      const root = { a: 'b' };
      const getState = spy();
      const recordCount = spy(() => 50);
      const currentPage = spy(() => 5);
      const pageSize = spy(() => 10);
      const topElBelowOffset = infiniteScroll.topElBelowOffset = spy(() => true);
      const getIndex = infiniteScroll.getIndex = spy((val) => {
        return val === 21 ? 0 : 4;
      });
      const setPage = infiniteScroll.setPage = spy();
      const state = <any>{
        ...infiniteScroll.state,
        scroller: { root },
        firstEl: { index: 31 },
        lastEl: { index: 60 },
        items: [1, 2, 3, 4, 5],
        recordCount,
        currentPage,
        pageSize,
      };
      infiniteScroll.state = state;
      infiniteScroll.flux = <any>{ store: { getState } };

      infiniteScroll.calculatePageChange();

      expect(topElBelowOffset).to.be.calledWithExactly(30, root);
      expect(infiniteScroll.state).to.eql({
        ...state,
        firstEl: 1,
        lastEl: 5,
      });
      expect(setPage).to.be.calledWithExactly(recordCount(), currentPage() - 1);
    });

    it('should call setPage when last exists and it is above the offset', () => {
      const getItem = infiniteScroll.getItem = spy(() => 30);
      const root = { a: 'b' };
      const getState = spy();
      const recordCount = spy(() => 50);
      const currentPage = spy(() => 5);
      const pageSize = spy(() => 10);
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
        recordCount,
        currentPage,
        pageSize,
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
      expect(setPage).to.be.calledWithExactly(recordCount(), currentPage() + 1);
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
      const receivePage = spy(() => ({}));
      const dispatch = spy();
      infiniteScroll.state = <any>{
        ...infiniteScroll.state,
        receivePage,
      };
      infiniteScroll.flux = <any>{ store: { dispatch } };

      infiniteScroll.setPage(count, page);

      expect(receivePage).to.be.calledWithExactly(count, page);
      expect(dispatch).to.be.calledWithExactly(receivePage());
    });
  });

  describe('replaceState()', () => {
    it('should call replaceState with route if oneTime is false', () => {
      const replaceState = spy();
      infiniteScroll.state = <any>{
        ...infiniteScroll.state,
        oneTime: false,
        route: 'search',
      };
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
      const page = 12;
      const fetchMore = spy(() => ({}));
      const pageSize = spy(() => page);
      const dispatch = spy();
      infiniteScroll.flux = <any>{ store: { getState: () => null, dispatch } };
      infiniteScroll.state = <any>{
        ...infiniteScroll.state,
        oneTime: true,
        pageSize,
        fetchMore
      };

      infiniteScroll.fetchMoreItems();

      expect(infiniteScroll.state).to.eql({ ...infiniteScroll.state, oneTime: false });
      expect(fetchMore).to.be.calledWithExactly(page, true);
      expect(dispatch).to.be.calledWithExactly(fetchMore());
    });

    it('should set state and fetch backward', () => {
      const page = 12;
      const fetchMore = spy(() => ({}));
      const pageSize = spy(() => page);
      const dispatch = spy();
      infiniteScroll.flux = <any>{ store: { getState: () => null, dispatch } };
      infiniteScroll.state = <any>{
        ...infiniteScroll.state,
        oneTime: true,
        pageSize,
        fetchMore
      };

      infiniteScroll.fetchMoreItems(false);

      expect(infiniteScroll.state).to.eql({ ...infiniteScroll.state, oneTime: false });
      expect(fetchMore).to.be.calledWithExactly(page, false);
      expect(dispatch).to.be.calledWithExactly(fetchMore());
    });
  });
});
