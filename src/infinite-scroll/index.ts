import {
  alias,
  configurable,
  tag,
  Events,
  ProductTransformer,
  Selectors,
  Store,
  StoreSections,
  Tag
} from '@storefront/core';
import { Routes } from '@storefront/flux-capacitor';
import { List } from '@storefront/structure';

export const PADDING = 20;
export const LOADLABEL = 'loading...';
export const BREAKPOINT_SCROLL_DOWN = .75;
export const BREAKPOINT_SCROLL_UP = 1.25;
export const BREAKPOINT_ITEM_HEIGHT = .25;

@configurable
@alias('infinite')
@tag('gb-infinite-scroll', require('./index.html'), require('./index.css'))
class InfiniteScroll {

  searchMethods: any = {
    pageSize: Selectors.pageSize,
    productsWithMetadata: Selectors.productsWithMetadata,
    recordCount: Selectors.recordCount,
    currentPage: Selectors.page,
    receivePage: (count, page) => this.flux.actions.receivePage(count, page),
    fetchMore: (state, forward) => this.flux.actions.fetchMoreProducts(state, forward),
    route: Routes.SEARCH,
  };

  pastPurchaseMethods: any = {
    pageSize: Selectors.pastPurchasePageSize,
    productsWithMetadata: Selectors.pastPurchaseProductsWithMetadata,
    recordCount: Selectors.pastPurchaseCurrentRecordCount,
    currentPage: Selectors.pastPurchasePage,
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
    isFetchingForward: false,
    isFetchingBackward: false,
    setScroll: false,
    clickMore: () => this.fetchMoreItems(),
    clickPrev: () => this.fetchMoreItems(false)
  };

  productTransformer = ({ data, meta, index }: Store.ProductWithMetadata) =>
    ({ ...ProductTransformer.transformer(this.config.structure)(data), meta, index })

  init() {
    switch (this.props.storeSection) {
      case StoreSections.PAST_PURCHASES:
        this.state = { ...this.state, ...this.pastPurchaseMethods };
        this.flux.on(Events.PAST_PURCHASE_PRODUCTS_UPDATED, this.updateProducts);
        this.flux.on(Events.PAST_PURCHASE_MORE_PRODUCTS_ADDED, this.setProducts);
        this.flux.on(Events.PAST_PURCHASE_PAGE_UPDATED, this.replaceState);
        this.flux.on(Events.INFINITE_SCROLL_UPDATED, this.setFetchFlags);
        break;
      case StoreSections.SEARCH:
      default:
        this.state = { ...this.state, ...this.searchMethods };
        this.flux.on(Events.PRODUCTS_UPDATED, this.updateProducts);
        this.flux.on(Events.MORE_PRODUCTS_ADDED, this.setProducts);
        this.flux.on(Events.PAGE_UPDATED, this.replaceState);
        this.flux.on(Events.SEARCH_CHANGED, this.setFirstLoadFlag);
        this.flux.on(Events.INFINITE_SCROLL_UPDATED, this.setFetchFlags);
    }
  }

  onMount() {
    const scroller = this.tags['gb-infinite-list'];
    const wrapper = scroller.refs.wrapper;
    const loadMore = this.props.loadMore || this.state.loadMore;
    const loaderLabel = this.props.loaderLabel || LOADLABEL;

    this.state = { ...this.state, scroller, wrapper, loadMore, loaderLabel };
  }

  onUpdated = () => {
    const firstItem = this.state.items[0];
    let state = <any>{ getPage: false };

    if (firstItem) {
      if (!this.state.loadMore) {
        const padding = this.calculateOffset(firstItem.index - 1);

        this.state.prevExists
          ? this.state.wrapper.style.paddingTop = `${PADDING}px`
          : this.state.wrapper.style.paddingTop = `0px`;

        state = { ...state, padding };

        if (this.state.firstLoad) {
          if (this.state.prevExists) this.state.scroller.root.scrollTop = PADDING;
          this.state.scroller.root.addEventListener('scroll', this.scroll);
        }
      } else if (this.state.firstLoad) {
        this.state.scroller.root.addEventListener('scroll', this.scroll);
      }

      this.state = { ...this.state, ...state };
    }

    if (this.state.setScroll) this.setScroll();
  }

  setScroll = () => {
    const imgs = <any>this.state.wrapper.querySelectorAll('img') || [];
    const pageSize = this.state.pageSize(this.flux.store.getState());
    let count = 0;

    const imgsLoaded = (total, size, totalImages) =>
      count === size || count === imgs.length;

    if (imgs.length > 0) {
      for (let i = 0; i < pageSize; i++) {
        imgs[i].onload = () => {
          count++;
          if (imgsLoaded(count, pageSize, imgs.length)) {
            this.maintainScrollTop(this.state.rememberScrollTop);
            this.state.scroller.root.addEventListener('scroll', this.scroll);
          }
        };
      }
      // need to still add scrollTop & scroll listener if imgs don't load
      setTimeout(() => {
        if (!imgsLoaded(count, pageSize, imgs.length)) {
          this.maintainScrollTop(this.state.rememberScrollTop);
          this.state.scroller.root.addEventListener('scroll', this.scroll);
        }
      }, 500);
    }

    this.state = { ...this.state, setScroll: false };
  }

  updateProducts = () => {
    const items = this.state.productsWithMetadata(this.flux.store.getState()).map(this.productTransformer);
    this.set(<any>{
      items,
      setScroll: true,
      rememberScrollTop: !this.state.loadMore ? PADDING : 0,
      prevExists: items.length > 0 ? items[0].index !== 1 : false,
      // tslint:disable-next-line max-line-length
      moreExists: items.length > 0 ? this.state.recordCount(this.flux.store.getState()) !== items[items.length - 1].index : false,
    });
    this.state.scroller.root.removeEventListener('scroll', this.scroll);

    this.state = {
      ...this.state,
      elItems: this.state.wrapper.children,
      firstEl: items[0],
      lastEl: items[items.length - 1],
      getPage: false,
      firstLoad: true,
    };
  }

  setProducts = (products?: Store.ProductWithMetadata[]) => {
    // TODO: put the products at the end if they're forward, at the beginning if they're backward
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
        const rememberScrollTop = this.calculateOffset(pageSize) + this.state.scroller.root.scrollTop;
        items = [...products.map(this.productTransformer), ...this.state.items];
        this.set(<any>{
          ...this.state,
          items,
          setScroll: true,
          rememberScrollTop,
          prevExists: items[0].index !== 1,
          moreExists: this.state.recordCount(this.flux.store.getState()) !== items[items.length - 1].index,
        });
        this.state.scroller.root.removeEventListener('scroll', this.scroll);
      }
    }
    return items;
  }

  maintainScrollTop = (scrollTop: number) =>
    this.state.scroller.root.scrollTop = scrollTop

  setFirstLoadFlag = () =>
    this.set({ firstLoad: true })

  setFetchFlags = ({ isFetchingForward, isFetchingBackward }: Store.InfiniteScroll) =>
    this.set({ isFetchingForward, isFetchingBackward })

  scroll = () => {
    const { scroller, wrapper } = this.state;
    const wrapperHeight = wrapper.getBoundingClientRect().height;
    const scrollerHeight = scroller.root.getBoundingClientRect().height;
    const scrollTop = scroller.root.scrollTop;

    if (this.state.getPage) {
      this.calculatePageChange();
    }

    // tslint:disable-next-line max-line-length
    if (!this.state.loadMore && scrollTop !== this.state.rememberScrollTop) {
      // if user is scrolling down and hits point past breakpoint, should fetch
      // tslint:disable-next-line max-line-length
      if (this.state.lastScroll < scrollTop && scrollTop >= (wrapperHeight - scrollerHeight) * BREAKPOINT_SCROLL_DOWN) {
        // tslint:disable-next-line max-line-length
        if (this.state.recordCount(this.flux.store.getState()) !== this.state.items[this.state.items.length - 1].index) {
          this.fetchMoreItems();
        }
      // if user is scrolling up and hits point past breakpoint, should fetch
      // tslint:disable-next-line max-line-length
    } else if (this.state.lastScroll > scrollTop && scrollTop <= this.state.padding * BREAKPOINT_SCROLL_UP) {
        if (this.state.prevExists) {
          this.fetchMoreItems(false);
        }
      }
    }

    this.state = {
      ...this.state,
      lastScroll: scrollTop,
      getPage: true,
    };
  }

  calculateOffset = (totalItems: number) => {
    const listItems = this.state.scroller.tags['gb-list-item'];
    if (listItems.length > 0) {
      const itemDimensions = listItems[0].root.getBoundingClientRect();
      const width = this.state.scroller.root.getBoundingClientRect().width;
      const itemsPerRow = Math.floor(width / itemDimensions.width);
      const rows = totalItems / itemsPerRow;
      return (rows * itemDimensions.height);
    }
  }

  calculatePageChange = () => {
    const first = this.getItem(this.state.firstEl.index - 1);
    const last = this.getItem(this.state.lastEl.index + 1);
    const scroller = this.state.scroller.root;
    const state = this.flux.store.getState();
    const recordCount = this.state.recordCount(state);
    const page = this.state.currentPage(state);
    const pageSize = this.state.pageSize(state);

    if (first && this.topElBelowOffset(first, scroller)) {
      this.state = {
        ...this.state,
        firstEl: this.state.items[this.getIndex(this.state.firstEl.index - pageSize)],
        lastEl: this.state.items[this.getIndex(this.state.lastEl.index - pageSize)],
      };
      this.setPage(recordCount, page - 1);
    } else if (last && this.bottomElAboveOffset(last, scroller)) {
      this.state = {
        ...this.state,
        firstEl: this.state.items[this.getIndex(this.state.firstEl.index + pageSize)],
        lastEl: this.state.items[this.getIndex(Math.min(this.state.lastEl.index + pageSize, recordCount))],
      };
      this.setPage(recordCount, page + 1);
    }
  }

  getItem = (recordIndex: number) =>
    this.state.elItems[this.getIndex(recordIndex)]

  // TODO: logic for changing page should happen when first item of next/prev page is at the top
  topElBelowOffset = (element: HTMLElement, parent: HTMLElement) => {
    const { top, height } = element.getBoundingClientRect();
    const { top: parentTop } = parent.getBoundingClientRect();
    return top > (parentTop - (height * BREAKPOINT_ITEM_HEIGHT));
  }

  bottomElAboveOffset = (element: HTMLElement, parent: HTMLElement) => {
    const { bottom, height } = element.getBoundingClientRect();
    const { bottom: parentBottom } = parent.getBoundingClientRect();
    return bottom < (parentBottom + (height * BREAKPOINT_ITEM_HEIGHT));
  }

  getIndex = (recordIndex: number) =>
    this.state.items.findIndex((item) => item.index === recordIndex)

  setPage = (count: number, page: number) =>
    this.flux.store.dispatch(this.state.receivePage(count, page))

  replaceState = () => {
    if (!this.state.firstLoad) this.flux.replaceState(this.state.route);
  }

  fetchMoreItems = (forward: boolean = true) => {
    this.state = {
      ...this.state,
      firstLoad: false,
    };
    this.flux.store.dispatch(this.state.fetchMore(this.state.pageSize(this.flux.store.getState()), forward));
  }
}

interface InfiniteScroll extends Tag<InfiniteScroll.Props, InfiniteScroll.State> { }
namespace InfiniteScroll {
  export interface Props extends Tag.Props {
    loadMore: boolean;
    loaderLabel: string;
  }

  export interface Methods {
    pageSize(state: Store.State): number;
    productsWithMetadata(state: Store.State): any[];
    recordCount(state: Store.State): number;
    currentPage(state: Store.State): number;
    setPage(): void;
    fetchMore(): void;
  }

  export interface State extends Methods {
    items: any[];
    firstLoad: boolean;
    loadMore: boolean;
    loadLabel: string;
    isFetchingForward: boolean;
    isFetchingBackward: boolean;
    setScroll: boolean;
    lastScroll: number;
    clickMore: () => void;
    clickPrev: () => void;
    prevExists?: boolean;
    moreExists?: boolean;
    rememberScrollTop?: number;
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
