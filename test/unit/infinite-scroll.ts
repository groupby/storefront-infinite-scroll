import { Events, ProductTransformer, Selectors, StoreSections } from '@storefront/core';
import { Routes } from '@storefront/flux-capacitor';
import InfiniteScroll, { LOADLABEL, PADDING } from '../../src/infinite-scroll';
import suite from './_suite';

const STRUCTURE = { a: 'b' };

suite('InfiniteScroll', ({ expect, spy, stub, itShouldBeConfigurable, itShouldProvideAlias }) => {
  let infiniteScroll: InfiniteScroll;
  let set;

  beforeEach(() => {
    infiniteScroll = new InfiniteScroll();
    set = infiniteScroll.set = spy();
  });

  itShouldBeConfigurable(InfiniteScroll);
//  itShouldProvideAlias(InfiniteScroll, 'infinite');

  describe('constructor()', () => {
    describe('state', () => {
      it('should have initial value', () => {
        expect(infiniteScroll.state.items).to.eql([]);
        expect(infiniteScroll.state.lastScroll).to.eq(0);
        expect(infiniteScroll.state.firstLoad).to.be.true;
        expect(infiniteScroll.state.loadMore).to.be.false;
        expect(infiniteScroll.state.isFetchingForward).to.be.false;
        expect(infiniteScroll.state.isFetchingBackward).to.be.false;
        expect(infiniteScroll.state.setScroll).to.be.false;
      });

      describe('clickMore', () => {
        it('should call fetchMoreItems', () => {
          const fetchMoreItems = (infiniteScroll.fetchMoreItems = spy());

          infiniteScroll.state.clickMore();

          expect(fetchMoreItems).to.be.calledOnce.calledWithExactly();
        });
      });

      describe('clickPrev', () => {
        it('should call fetchMoreItems with false', () => {
          const fetchMoreItems = (infiniteScroll.fetchMoreItems = spy());

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
          structure,
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
        const subscribe = (infiniteScroll.subscribe = spy());
        const initialState = infiniteScroll.state;
        const products = ['1.', '2.', '3.'];
        const productsWithMetadata = (infiniteScroll.pastPurchaseMethods.productsWithMetadata = spy(() => [
          '1',
          '2',
          '3',
        ]));
        const storeState = { a: 'b' };
        infiniteScroll.flux = <any>{ store: { getState: () => storeState } };
        infiniteScroll.productTransformer = <any>((input) => input + '.');
        infiniteScroll.props = <any>{ storeSection: StoreSections.PAST_PURCHASES };

        infiniteScroll.init();

        expect(subscribe).to.be.calledWithExactly(Events.PAST_PURCHASE_PRODUCTS_UPDATED, infiniteScroll.updateProducts);
        expect(subscribe).to.be.calledWithExactly(Events.PAST_PURCHASE_MORE_PRODUCTS_ADDED, infiniteScroll.setProducts);
        expect(subscribe).to.be.calledWithExactly(Events.INFINITE_SCROLL_UPDATED, infiniteScroll.setFetchFlags);
        expect(productsWithMetadata).to.be.calledWithExactly(storeState);
        expect(infiniteScroll.state).to.eql({
          ...initialState,
          ...infiniteScroll.pastPurchaseMethods,
          items: products,
        });
      });
    });

    describe('SEARCH', () => {
      it('should  listen for correct events and set state', () => {
        const subscribe = (infiniteScroll.subscribe = spy());
        const initialState = infiniteScroll.state;
        const products = ['1.', '2.', '3.'];
        const productsWithMetadata = (infiniteScroll.searchMethods.productsWithMetadata = spy(() => ['1', '2', '3']));
        const storeState = { a: 'b' };
        infiniteScroll.flux = <any>{ store: { getState: () => storeState } };
        infiniteScroll.productTransformer = <any>((input) => input + '.');
        infiniteScroll.props = <any>{ storeSection: StoreSections.SEARCH };

        infiniteScroll.init();

        expect(subscribe).to.be.calledWithExactly(Events.PRODUCTS_UPDATED, infiniteScroll.updateProducts);
        expect(subscribe).to.be.calledWithExactly(Events.MORE_PRODUCTS_ADDED, infiniteScroll.setProducts);
        expect(subscribe).to.be.calledWithExactly(Events.SEARCH_CHANGED, infiniteScroll.setFirstLoadFlag);
        expect(subscribe).to.be.calledWithExactly(Events.INFINITE_SCROLL_UPDATED, infiniteScroll.setFetchFlags);
        expect(productsWithMetadata).to.be.calledWithExactly(storeState);
        expect(infiniteScroll.state).to.eql({
          ...initialState,
          ...infiniteScroll.searchMethods,
          items: products,
        });
      });
    });
  });

  describe('onMount()', () => {
    it('should update state with scroller, wrapper, and firstLoad, and update products', () => {
      const wrapper = { a: 'b' };
      const scroller = { refs: { wrapper } };
      const state = (infiniteScroll.state = <any>{ a: 'b', loadMore: false, windowScroll: false });
      const updateProducts = (infiniteScroll.updateProducts = spy());
      infiniteScroll.props = <any>{};
      infiniteScroll.tags = {
        'gb-infinite-list': scroller,
      };

      infiniteScroll.onMount();

      expect(infiniteScroll.state).to.eql({
        ...state,
        scroller,
        wrapper,
        loadMore: false,
        loaderLabel: LOADLABEL,
        windowScroll: false,
      });
      expect(updateProducts).to.be.called;
    });

    it('should set from props', () => {
      const wrapper = { a: 'b' };
      const scroller = { refs: { wrapper } };
      const state = (infiniteScroll.state = <any>{ a: 'b' });
      const loaderLabel = 'heyyoloading';
      infiniteScroll.updateProducts = () => null;
      infiniteScroll.tags = {
        'gb-infinite-list': scroller,
      };
      infiniteScroll.props = <any>{ loadMore: true, loaderLabel, windowScroll: true };

      infiniteScroll.onMount();

      expect(infiniteScroll.state).to.eql({
        ...state,
        scroller,
        wrapper,
        loadMore: true,
        loaderLabel,
        windowScroll: true,
      });
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
        firstLoad: true,
        scroller,
        setScroll: false,
      };
    });

    it('should not change state if there are no items', () => {
      const state = (infiniteScroll.state = <any>{ a: 'b', items: [] });
      set = infiniteScroll.set = spy();

      infiniteScroll.onUpdated();

      expect(infiniteScroll.state).to.eq(state);
    });

    it('should only set padding on state when loadMore is false', () => {
      const state = (infiniteScroll.state = <any>{ ...initialState, a: 'b', firstLoad: true });
      const padding = 200;
      const calculatePadding = (infiniteScroll.calculateOffset = spy(() => padding));
      const setScroll = (infiniteScroll.setScroll = spy());

      infiniteScroll.onUpdated();

      expect(infiniteScroll.state).to.eql({ ...state, padding, getPage: false });
      expect(calculatePadding).to.be.calledWithExactly(0);
      expect(wrapper.style.paddingTop).to.eq(`${PADDING}px`);
      expect(scroller.root.scrollTop).to.eq(PADDING);
      expect(scroller.root.addEventListener).to.be.calledWithExactly('scroll', infiniteScroll.scroll);
    });

    it('should still set eventListener if loadMore is true and firstLoad is true', () => {
      const state = (infiniteScroll.state = <any>{ ...initialState, a: 'b', loadMore: true, firstLoad: true });
      const setScroll = (infiniteScroll.setScroll = spy());

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
      const rememberScrollY = 15;
      const maintainScrollTop = (infiniteScroll.maintainScrollTop = spy());
      const addEventListener = spy();
      infiniteScroll.state = <any>{
        wrapper: { querySelectorAll },
        pageSize,
        rememberScrollY,
        scroller: { root: { addEventListener } },
      };
      infiniteScroll.flux = <any>{ store: { getState } };

      infiniteScroll.setScroll();
      imgs[0].onload();
      imgs[1].onload();
      imgs[2].onload();

      expect(maintainScrollTop).to.be.calledWithExactly(rememberScrollY);
      expect(addEventListener).to.be.calledWithExactly('scroll', infiniteScroll.scroll);
      expect(infiniteScroll.state).to.eql({ ...infiniteScroll.state, setScroll: false });
    });

    it('should call maintainScrollTop and add eventListener after 500 ms if imgs dont load', (done) => {
      const onload = spy();
      const imgs = [{ onload }, { onload }, { onload }];
      const querySelectorAll = spy(() => imgs);
      const pageSize = spy(() => 3);
      const getState = spy();
      const rememberScrollY = 15;
      const maintainScrollTop = (infiniteScroll.maintainScrollTop = spy());
      const addEventListener = spy();
      infiniteScroll.state = <any>{
        wrapper: { querySelectorAll },
        pageSize,
        rememberScrollY,
        scroller: { root: { addEventListener } },
      };
      infiniteScroll.flux = <any>{ store: { getState } };

      infiniteScroll.setScroll();

      setTimeout(function() {
        expect(maintainScrollTop).to.be.calledWithExactly(rememberScrollY);
        expect(addEventListener).to.be.calledWithExactly('scroll', infiniteScroll.scroll);
        done();
      }, 501);
    });

    it('should set event listeners for number of images, not page size', () => {
      const onload = () => null;
      const imgs = [{ onload }, { onload }, { onload }];
      const addEventListener = spy();

      infiniteScroll.state = <any>{
        wrapper: { querySelectorAll: () => imgs },
        pageSize: () => 20,
        rememberScrollTop: 15,
        scroller: { root: { addEventListener } },
      };
      infiniteScroll.flux = <any>{ store: { getState: () => null } };

      infiniteScroll.setScroll();
      imgs[0].onload();
      imgs[1].onload();
      imgs[2].onload();

      expect(addEventListener).to.be.calledOnce;
    });
  });

  describe('updateProducts()', () => {
    it('should set items and state and update state', () => {
      const items = ['a', 'b', 'c'];
      const children = ['e', 'f', 'g'];
      const wrapper = { children };
      const products = [1, 2, 3];
      const state = { a: 'b' };
      const getState = () => state;
      const removeEventListener = spy();
      const scroller = { root: { removeEventListener } };
      const productsWithMetadata = spy(() => [1, 2, 3]);
      const productTransformer = (infiniteScroll.productTransformer = spy((item) => item));
      const recordCount = spy(() => 20);
      const newState = {
        items: products,
        setScroll: true,
        rememberScrollY: PADDING,
        prevExists: true,
        moreExists: true,
      };
      infiniteScroll.state = <any>{ wrapper, productsWithMetadata, recordCount, scroller };
      infiniteScroll.flux = <any>{ store: { getState } };

      infiniteScroll.updateProducts();

      expect(productsWithMetadata).to.be.calledWithExactly(state);
      expect(productTransformer).to.be.calledThrice;
      expect(set).to.be.calledWithExactly(newState);
      expect(removeEventListener).to.be.calledWithExactly('scroll', infiniteScroll.scroll);
      expect(infiniteScroll.state).to.eql({
        ...infiniteScroll.state,
        wrapper,
        elItems: children,
        firstEl: products[0],
        lastEl: products[products.length - 1],
        getPage: false,
        firstLoad: true,
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
      const maintainScrollTop = (infiniteScroll.maintainScrollTop = spy());
      const scrollTop = 3400;
      const pageSize = spy(() => 10);
      const removeEventListener = spy();
      const calculateOffset = (infiniteScroll.calculateOffset = spy(() => 12));
      const state = (infiniteScroll.state = <any>{
        ...infiniteScroll.state,
        items,
        scroller: { root: { scrollTop, removeEventListener } },
        pageSize,
      });

      const result = infiniteScroll.setProducts(products);

      expect(productTransformer).to.be.calledThrice;
      expect(pageSize).to.be.calledWithExactly(getState());
      expect(calculateOffset).to.be.calledWithExactly(pageSize());
      expect(set).to.be.calledWith({
        ...state,
        items: result,
        setScroll: true,
        rememberScrollY: 3412,
        prevExists: false,
        moreExists: true,
      });
      expect(result).to.eql([...products, ...items]);
      expect(removeEventListener).to.be.calledWithExactly('scroll', infiniteScroll.scroll);
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

  describe('setFirstLoadFlag()', () => {
    it('should set firstLoad to true', () => {
      infiniteScroll.setFirstLoadFlag();

      expect(set).to.be.calledWithExactly({ firstLoad: true });
    });
  });

  describe('setFetchFlags()', () => {
    it('should set firstLoad to true', () => {
      const fetchState = { isFetchingForward: true, isFetchingBackward: false };
      infiniteScroll.setFetchFlags(fetchState);

      expect(set).to.be.calledWithExactly(fetchState);
    });
  });

  describe('scroll()', () => {
    it('should call calculatePageChange', () => {
      const getWrapperHeight = () => ({ height: 200 });
      const getScrollerHeight = () => ({ height: 500 });
      const calculatePageChange = (infiniteScroll.calculatePageChange = spy());
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
      const fetchMoreItems = (infiniteScroll.fetchMoreItems = spy());
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
      const fetchMoreItems = (infiniteScroll.fetchMoreItems = spy());
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
          'gb-list-item': [{ root: { getBoundingClientRect: () => ({ width: 100, height: 3 }) } }],
        },
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
      const getItem = (infiniteScroll.getItem = spy(() => 30));
      const root = { a: 'b', getBoundingClientRect: () => ({ top: 2, bottom: 3 }) };
      const getState = spy();
      const recordCount = spy(() => 50);
      const currentPage = spy(() => 5);
      const pageSize = spy(() => 10);
      const topElBelowOffset = (infiniteScroll.topElBelowOffset = spy(() => true));
      const getIndex = (infiniteScroll.getIndex = spy((val) => {
        return val === 21 ? 0 : 4;
      }));
      const setPage = (infiniteScroll.setPage = spy());
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

      expect(topElBelowOffset).to.be.calledWithExactly(30, root.getBoundingClientRect().top);
      expect(infiniteScroll.state).to.eql({
        ...state,
        firstEl: 1,
        lastEl: 5,
      });
      expect(setPage).to.be.calledWithExactly(recordCount(), currentPage() - 1);
    });

    it('should call setPage when last exists and it is above the offset', () => {
      const getItem = (infiniteScroll.getItem = spy(() => 30));
      const root = { a: 'b', getBoundingClientRect: () => ({ top: 2, bottom: 3 }) };
      const getState = spy();
      const recordCount = spy(() => 50);
      const currentPage = spy(() => 5);
      const pageSize = spy(() => 10);
      const topElBelowOffset = (infiniteScroll.topElBelowOffset = spy(() => false));
      const bottomElAboveOffset = (infiniteScroll.bottomElAboveOffset = spy(() => true));
      const getIndex = (infiniteScroll.getIndex = spy((val) => {
        return val === 41 ? 4 : 0;
      }));
      const setPage = (infiniteScroll.setPage = spy());
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

      expect(topElBelowOffset).to.be.calledWithExactly(30, root.getBoundingClientRect().top);
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
      const getIndex = (infiniteScroll.getIndex = spy(() => 4));
      infiniteScroll.state = <any>{ elItems: [2, 3, 4, 5, 6, 7] };

      const item = infiniteScroll.getItem(recordIndex);

      expect(getIndex).to.be.calledWithExactly(recordIndex);
      expect(item).to.eq(6);
    });
  });

  describe('topElBelowOffset()', () => {
    it("should return true if element's top is greater than offset", () => {
      const element = <any>{ getBoundingClientRect: () => ({ top: 1000, height: 20 }) };

      const topElBelowOffset = infiniteScroll.topElBelowOffset(element, 200);

      expect(topElBelowOffset).to.be.true;
    });

    it("should return false if element's top is less than offset", () => {
      const element = <any>{ getBoundingClientRect: () => ({ top: 100, height: 20 }) };

      const topElBelowOffset = infiniteScroll.topElBelowOffset(element, 200);

      expect(topElBelowOffset).to.be.false;
    });
  });

  describe('bottomElAboveOffset()', () => {
    it("should return true if element's bottom is less than offset", () => {
      const element = <any>{ getBoundingClientRect: () => ({ bottom: 100, height: 20 }) };

      const bottomElAboveOffset = infiniteScroll.bottomElAboveOffset(element, 200);

      expect(bottomElAboveOffset).to.be.true;
    });

    it("should return false if element's bottom is greater than offset", () => {
      const element = <any>{ getBoundingClientRect: () => ({ bottom: 1000, height: 20 }) };

      const bottomElAboveOffset = infiniteScroll.bottomElAboveOffset(element, 200);

      expect(bottomElAboveOffset).to.be.false;
    });
  });

  describe('topElBelowOffsetWindow()', () => {
    it('should return true if top > 1', () => {
      const element = <any>{ getBoundingClientRect: () => ({ top: 100 }) };

      expect(infiniteScroll.topElBelowOffsetWindow(element)).to.be.true;
    });

    it('should return false', () => {
      const element = <any>{ getBoundingClientRect: () => ({ top: -100 }) };

      expect(infiniteScroll.topElBelowOffsetWindow(element)).to.be.false;
    });
  });

  describe('bottomElBelowOffsetWindow()', () => {
    it('should return true if top < parentBottom', () => {
      const element = <any>{ getBoundingClientRect: () => ({ top: 0 }) };

      expect(infiniteScroll.bottomElAboveOffsetWindow(element, 100)).to.be.true;
    });

    it('should return false', () => {
      const element = <any>{ getBoundingClientRect: () => ({ top: 200 }) };

      expect(infiniteScroll.bottomElAboveOffsetWindow(element, 100)).to.be.false;
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
    it('should call receivePage() with page info and subscribeOnce to PAGE_UPDATED', () => {
      const count = 30;
      const page = 3;
      const receivePage = spy(() => ({}));
      const dispatch = spy();
      const subscribeOnce = infiniteScroll.subscribeOnce = spy();
      infiniteScroll.props = <any>{
        storeSection: StoreSections.SEARCH
      }
      infiniteScroll.state = <any>{
        ...infiniteScroll.state,
        receivePage,
      };
      infiniteScroll.flux = <any>{ store: { dispatch } };

      infiniteScroll.setPage(count, page);

      expect(receivePage).to.be.calledWithExactly(count, page);
      expect(dispatch).to.be.calledWithExactly(receivePage());
      expect(subscribeOnce).to.be.calledWithExactly(Events.PAGE_UPDATED, infiniteScroll.replaceState);
    });

    it('should call receivePage() with page info and subscribeOnce to PAST_PURCHASE_PAGE_UPDATED', () => {
      const count = 30;
      const page = 3;
      const receivePage = spy(() => ({}));
      const dispatch = spy();
      const subscribeOnce = infiniteScroll.subscribeOnce = spy();
      infiniteScroll.props = <any>{
        storeSection: StoreSections.PAST_PURCHASES
      }
      infiniteScroll.state = <any>{
        ...infiniteScroll.state,
        receivePage,
      };
      infiniteScroll.flux = <any>{ store: { dispatch } };

      infiniteScroll.setPage(count, page);

      expect(receivePage).to.be.calledWithExactly(count, page);
      expect(dispatch).to.be.calledWithExactly(receivePage());
      expect(subscribeOnce).to.be.calledWithExactly(Events.PAST_PURCHASE_PAGE_UPDATED, infiniteScroll.replaceState);
    });
  });

  describe('replaceState()', () => {
    it('should call replaceState with route if firstLoad is false', () => {
      const replaceState = spy();
      infiniteScroll.state = <any>{
        ...infiniteScroll.state,
        firstLoad: false,
        route: 'search',
      };
      infiniteScroll.flux = <any>{ replaceState };

      infiniteScroll.replaceState();

      expect(replaceState).to.be.calledWithExactly(Routes.SEARCH);
    });

    it('should not call replaceState if firstLoad is true', () => {
      const replaceState = spy();
      infiniteScroll.state = <any>{ firstLoad: true };
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
        firstLoad: true,
        pageSize,
        fetchMore,
      };

      infiniteScroll.fetchMoreItems();

      expect(infiniteScroll.state).to.eql({ ...infiniteScroll.state, firstLoad: false });
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
        firstLoad: true,
        pageSize,
        fetchMore,
      };

      infiniteScroll.fetchMoreItems(false);

      expect(infiniteScroll.state).to.eql({ ...infiniteScroll.state, firstLoad: false });
      expect(fetchMore).to.be.calledWithExactly(page, false);
      expect(dispatch).to.be.calledWithExactly(fetchMore());
    });
  });
});
