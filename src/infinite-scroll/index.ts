import * as Core from '@storefront/core';
import { Routes, Selectors } from '@storefront/flux-capacitor';
import { List } from '@storefront/structure';

export const PADDING = 20;
export const LOADLABEL = 'loading...';
export const BREAKPOINT_SCROLL_DOWN = 0.75;
export const BREAKPOINT_SCROLL_UP = 1.25;
export const BREAKPOINT_ITEM_HEIGHT = 0.25;

@Core.configurable
@Core.provide('infinite')
@Core.tag('gb-infinite-scroll', require('./index.html'), require('./index.css'))
class InfiniteScroll {
  searchMethods: any = {
    pageSize: Core.Selectors.pageSize,
    productsWithMetadata: Core.Selectors.productsWithMetadata,
    recordCount: Core.Selectors.recordCount,
    currentPage: Core.Selectors.page,
    receivePage: (count, page) => this.flux.actions.receivePage(count, page),
    fetchMore: (state, forward) => this.flux.actions.fetchMoreProducts(state, forward),
    route: Routes.SEARCH,
  };

  pastPurchaseMethods: any = {
    pageSize: Core.Selectors.pastPurchasePageSize,
    productsWithMetadata: Core.Selectors.pastPurchaseProductsWithMetadata,
    recordCount: Core.Selectors.pastPurchaseCurrentRecordCount,
    currentPage: Core.Selectors.pastPurchasePage,
    receivePage: (count, page) => this.flux.actions.receivePastPurchasePage(count, page),
    fetchMore: (state, forward) => this.flux.actions.fetchMorePastPurchaseProducts(state, forward),
    route: Routes.PAST_PURCHASE,
  };

  tags: {
    'gb-infinite-list': List;
  };

  state: any = {
    items: [],
    lastScroll: 0,
    firstLoad: true,
    loadMore: false,
    windowScroll: false,
    isFetchingForward: false,
    isFetchingBackward: false,
    setScroll: false,
    clickMore: () => this.fetchMoreItems(),
    clickPrev: () => this.fetchMoreItems(false),
  };

  productTransformer = ({ data, meta, index }: Core.Store.ProductWithMetadata) => ({
    ...Core.ProductTransformer.transformer(this.config.structure)(data),
    meta,
    index,
  });

  init() {
    switch (this.props.storeSection) {
      case Core.StoreSections.PAST_PURCHASES:
        this.state = {
          ...this.state,
          ...this.pastPurchaseMethods,
          items: this.pastPurchaseMethods.productsWithMetadata(this.flux.store.getState()).map(this.productTransformer),
        };
        this.subscribe(Core.Events.PAST_PURCHASE_PRODUCTS_UPDATED, this.updateProducts);
        this.subscribe(Core.Events.PAST_PURCHASE_MORE_PRODUCTS_ADDED, this.setProducts);
        this.subscribe(Core.Events.PAST_PURCHASE_PAGE_UPDATED, this.replaceState);
        this.subscribe(Core.Events.INFINITE_SCROLL_UPDATED, this.setFetchFlags);
        break;
      case Core.StoreSections.SEARCH:
      default:
        this.state = {
          ...this.state,
          ...this.searchMethods,
          items: this.searchMethods.productsWithMetadata(this.flux.store.getState()).map(this.productTransformer),
        };
        this.subscribe(Core.Events.PRODUCTS_UPDATED, this.updateProducts);
        this.subscribe(Core.Events.MORE_PRODUCTS_ADDED, this.setProducts);
        this.subscribe(Core.Events.PAGE_UPDATED, this.replaceState);
        this.subscribe(Core.Events.SEARCH_CHANGED, this.setFirstLoadFlag);
        this.subscribe(Core.Events.INFINITE_SCROLL_UPDATED, this.setFetchFlags);
    }
  }

  onMount() {
    const scroller = this.tags['gb-infinite-list'];
    const wrapper = scroller.refs.wrapper;
    const loadMore = this.props.loadMore || this.state.loadMore;
    const loaderLabel = this.props.loaderLabel || LOADLABEL;
    const windowScroll = this.props.windowScroll || this.state.windowScroll;

    this.state = { ...this.state, scroller, wrapper, loadMore, loaderLabel, windowScroll };
    this.updateProducts();
  }

  onUpdated = () => {
    const firstItem = this.state.items[0];
    let state = <any>{ getPage: false };

    if (firstItem) {
      if (!this.state.loadMore) {
        const padding = this.calculateOffset(firstItem.index - 1);

        this.state.prevExists
          ? (this.state.wrapper.style.paddingTop = `${PADDING}px`)
          : (this.state.wrapper.style.paddingTop = `0px`);

        state = { ...state, padding };

        if (this.state.firstLoad) {
          if (this.state.prevExists) this.state.scroller.root.scrollTop = PADDING;
          this.state.windowScroll
            ? Core.utils.WINDOW().addEventListener('scroll', this.scroll)
            : this.state.scroller.root.addEventListener('scroll', this.scroll);
        }
      } else if (this.state.firstLoad) {
        this.state.windowScroll
          ? Core.utils.WINDOW().addEventListener('scroll', this.scroll)
          : this.state.scroller.root.addEventListener('scroll', this.scroll);
      }

      this.state = { ...this.state, ...state };
    }

    if (this.state.setScroll) this.setScroll();
  };

  setScroll = () => {
    const imgs = <any>this.state.wrapper.querySelectorAll('img') || [];
    const pageSize = this.state.pageSize(this.flux.store.getState());
    let count = 0;

    const imgsLoaded = (total, size, totalImages) => count === size || count === imgs.length;

    if (imgs.length > 0) {
      for (let i = 0; i < Math.min(pageSize, imgs.length); i++) {
        imgs[i].onload = () => {
          count++;
          if (imgsLoaded(count, pageSize, imgs.length)) {
            this.maintainScrollTop(this.state.rememberScrollY);
            this.state.windowScroll
              ? Core.utils.WINDOW().addEventListener('scroll', this.scroll)
              : this.state.scroller.root.addEventListener('scroll', this.scroll);
          }
        };
      }
      // need to still add scrollTop & scroll listener if imgs don't load
      setTimeout(() => {
        if (!imgsLoaded(count, pageSize, imgs.length)) {
          this.maintainScrollTop(this.state.rememberScrollY);
          this.state.windowScroll
            ? Core.utils.WINDOW().addEventListener('scroll', this.scroll)
            : this.state.scroller.root.addEventListener('scroll', this.scroll);
        }
      }, 500);
    }

    this.state = { ...this.state, setScroll: false };
  };

  updateProducts = () => {
    const items = this.state.productsWithMetadata(this.flux.store.getState()).map(this.productTransformer);
    this.set(<any>{
      items,
      setScroll: true,
      rememberScrollY: !this.state.loadMore ? PADDING : 0,
      prevExists: items.length > 0 ? items[0].index !== 1 : false,
      // tslint:disable-next-line max-line-length
      moreExists:
        items.length > 0 ? this.state.recordCount(this.flux.store.getState()) !== items[items.length - 1].index : false,
    });
    this.state.windowScroll
      ? Core.utils.WINDOW().removeEventListener('scroll', this.scroll)
      : this.state.scroller.root.removeEventListener('scroll', this.scroll);

    this.state = {
      ...this.state,
      elItems: this.state.wrapper.children,
      firstEl: items[0],
      lastEl: items[items.length - 1],
      getPage: false,
      firstLoad: true,
    };
  };

  setProducts = (products?: Core.Store.ProductWithMetadata[]) => {
    let items;
    if (products) {
      if (products[0].index > this.state.items[this.state.items.length - 1].index) {
        items = [...this.state.items, ...products.map(this.productTransformer)];
        this.set(<any>{
          items,
          prevExists: items[0].index !== 1,
          moreExists: this.state.recordCount(this.flux.store.getState()) !== items[items.length - 1].index,
        });
      } else if (products[products.length - 1].index < this.state.items[0].index) {
        const pageSize = this.state.pageSize(this.flux.store.getState());
        // tslint:disable-next-line max-line-length
        const rememberScrollY =
          this.calculateOffset(pageSize) +
          (this.state.windowScroll ? Core.utils.WINDOW().pageYOffset : this.state.scroller.root.scrollTop);
        items = [...products.map(this.productTransformer), ...this.state.items];
        this.set(<any>{
          ...this.state,
          items,
          setScroll: true,
          rememberScrollY,
          prevExists: items[0].index !== 1,
          moreExists: this.state.recordCount(this.flux.store.getState()) !== items[items.length - 1].index,
        });
        this.state.windowScroll
          ? Core.utils.WINDOW().removeEventListener('scroll', this.scroll)
          : this.state.scroller.root.removeEventListener('scroll', this.scroll);
      }
    }
    return items;
  };

  maintainScrollTop = (scrollTop: number) => (this.state.scroller.root.scrollTop = scrollTop);

  setFirstLoadFlag = () => this.set({ firstLoad: true });

  setFetchFlags = ({ isFetchingForward, isFetchingBackward }: Core.Store.InfiniteScroll) =>
    this.set({ isFetchingForward, isFetchingBackward });

  scroll = () => {
    const { scroller, wrapper } = this.state;
    const wrapperHeight = wrapper.getBoundingClientRect().height;
    const scrollY = this.state.windowScroll ? Core.utils.WINDOW().pageYOffset : scroller.root.scrollTop;

    if (this.state.getPage) {
      this.calculatePageChange();
    }

    // tslint:disable-next-line max-line-length
    if (!this.state.loadMore && scrollY !== this.state.rememberScrollY) {
      // if user is scrolling down and hits point past breakpoint, should fetch
      // tslint:disable-next-line max-line-length
      if (this.state.lastScroll < scrollY) {
        // tslint:disable-next-line max-line-length
        if (
          this.state.recordCount(this.flux.store.getState()) !== this.state.items[this.state.items.length - 1].index
        ) {
          this.fetchMoreItems();
        }
        // if user is scrolling up and hits point past breakpoint, should fetch
        // tslint:disable-next-line max-line-length
      } else if (this.state.lastScroll > scrollY) {
        if (this.state.prevExists) {
          this.fetchMoreItems(false);
        }
      }
    }

    this.state = {
      ...this.state,
      lastScroll: scrollY,
      getPage: true,
    };
  };

  calculateOffset = (totalItems: number) => {
    const listItems = this.state.scroller.tags['gb-list-item'];
    if (listItems.length > 0) {
      const itemDimensions = listItems[0].root.getBoundingClientRect();
      const width = this.state.scroller.root.getBoundingClientRect().width;
      const itemsPerRow = Math.floor(width / itemDimensions.width);
      const rows = totalItems / itemsPerRow;
      return rows * itemDimensions.height;
    }
  };

  calculatePageChange = () => {
    const first = this.getItem(this.state.firstEl.index - 1);
    const last = this.getItem(this.state.lastEl.index + 1);
    const scroller = this.state.scroller.root;
    const state = this.flux.store.getState();
    const recordCount = this.state.recordCount(state);
    const page = this.state.currentPage(state);
    const pageSize = this.state.pageSize(state);
    const topCheck = this.state.windowScroll
      ? () => this.topElBelowOffsetWindow(first)
      : () => this.topElBelowOffset(first, scroller.getBoundingClientRect().top);
    const bottomCheck = this.state.windowScroll
      ? () => this.bottomElAboveOffsetWindow(last, Core.utils.WINDOW().innerHeight)
      : () => this.bottomElAboveOffset(last, scroller.getBoundingClientRect().bottom);

    if (first && topCheck()) {
      this.state = {
        ...this.state,
        firstEl: this.state.items[this.getIndex(this.state.firstEl.index - pageSize)],
        lastEl: this.state.items[this.getIndex(this.state.lastEl.index - pageSize)],
      };
      this.setPage(recordCount, page - 1);
    } else if (last && bottomCheck()) {
      this.state = {
        ...this.state,
        firstEl: this.state.items[this.getIndex(this.state.firstEl.index + pageSize)],
        lastEl: this.state.items[this.getIndex(Math.min(this.state.lastEl.index + pageSize, recordCount))],
      };
      this.setPage(recordCount, page + 1);
    }
  };

  getItem = (recordIndex: number) => this.state.elItems[this.getIndex(recordIndex)];

  topElBelowOffset = (element: HTMLElement, parentTop: number) => {
    const { top, height } = element.getBoundingClientRect();
    return top > parentTop - height * BREAKPOINT_ITEM_HEIGHT;
  };

  bottomElAboveOffset = (element: HTMLElement, parentBottom: number) => {
    const { bottom, height } = element.getBoundingClientRect();
    return bottom < parentBottom + height * BREAKPOINT_ITEM_HEIGHT;
  };

  topElBelowOffsetWindow = (element: HTMLElement) => {
    return element.getBoundingClientRect().top > 1;
  };

  bottomElAboveOffsetWindow = (element: HTMLElement, parentBottom: number) => {
    return element.getBoundingClientRect().top < parentBottom;
  };

  getIndex = (recordIndex: number) => this.state.items.findIndex((item) => item.index === recordIndex);

  setPage = (count: number, page: number) => this.flux.store.dispatch(this.state.receivePage(count, page));

  replaceState = () => {
    if (!this.state.firstLoad) this.flux.replaceState(this.state.route);
  };

  fetchMoreItems = (forward: boolean = true) => {
    this.state = {
      ...this.state,
      firstLoad: false,
    };
    this.flux.store.dispatch(this.state.fetchMore(this.state.pageSize(this.flux.store.getState()), forward));
  };
}

interface InfiniteScroll extends Core.Tag<InfiniteScroll.Props, InfiniteScroll.State> {}
namespace InfiniteScroll {
  export interface Props extends Core.Tag.Props {
    loadMore: boolean;
    loaderLabel: string;
    windowScroll: boolean;
  }

  export interface Methods {
    pageSize(state: Core.Store.State): number;
    productsWithMetadata(state: Core.Store.State): any[];
    recordCount(state: Core.Store.State): number;
    currentPage(state: Core.Store.State): number;
    setPage(): void;
    fetchMore(): void;
  }

  export interface State extends Methods {
    items: any[];
    firstLoad: boolean;
    loadMore: boolean;
    loadLabel: string;
    windowScroll: boolean;
    isFetchingForward: boolean;
    isFetchingBackward: boolean;
    setScroll: boolean;
    lastScroll: number;
    clickMore: () => void;
    clickPrev: () => void;
    prevExists?: boolean;
    moreExists?: boolean;
    rememberScrollY?: number;
    scroller?: List;
    wrapper?: HTMLUListElement;
    // set type to proper type rather than any
    elItems?: any;
    padding?: number;
    firstEl?: any;
    lastEl?: any;
    getPage?: boolean;
  }
}

export default InfiniteScroll;
