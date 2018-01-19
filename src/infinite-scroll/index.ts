import { alias, configurable, tag, Events, ProductTransformer, Selectors, Store, Tag } from '@storefront/core';
import { Adapters, Routes } from '@storefront/flux-capacitor';
import { List } from '@storefront/structure';

@configurable
@alias('infinite')
@tag('gb-infinite-scroll', require('./index.html'), require('./index.css'))
class InfiniteScroll {

  tags: {
    'gb-list': List;
  };

  state: InfiniteScroll.State = <any>{
    items: [],
    lastScroll: 0,
    oneTime: true,
    loadMore: false,
    isFetchingForward: false,
    isFetchingBackward: false,
  };

  productTransformer = ({ data, meta, index }: Store.ProductWithMetadata) =>
    ({ ...ProductTransformer.transformer(this.config.structure)(data), meta, index })

  init() {
    this.flux.on(Events.PRODUCTS_UPDATED, this.updateProducts);
    this.flux.on(Events.MORE_PRODUCTS_ADDED, this.setProducts);
    this.flux.on(Events.PAGE_UPDATED, this.replaceState);
    this.flux.on(Events.SEARCH_CHANGED, this.setFlag);
    this.flux.on(Events.INFINITE_SCROLL_UPDATED, this.setFetchFlags);
  }

  setFetchFlags = ({ isFetchingForward, isFetchingBackward }: Store.InfiniteScroll) => {
    this.set({ isFetchingForward, isFetchingBackward });
    if (!isFetchingForward && !isFetchingBackward) {
      this.maintainScrollTop(this.state.rememberScroll);
    }
  }

  onMount() {
    const scroller1 = this.tags['gb-list'];
    const wrapper = scroller1.refs.wrapper;
    const loadMore = this.props.loadMore || this.state.loadMore;
    const scroller = this.refs.scroller;

    this.state = { ...this.state, scroller, wrapper, oneTime: true, loadMore };
  }

  onUpdated = () => {
    const firstItem = this.state.items[0];

    if (firstItem) {
      const padding = this.calculatePadding(this.state.scroller, firstItem.index);
      let state: Pick<InfiniteScroll.State, 'padding' | 'lastScroll' | 'getPage'> = { padding };

      this.state.wrapper.style.paddingTop = `${padding}px`;

      if (this.state.oneTime) {
        this.state.scroller.scrollTop = padding;
        state = { ...state, lastScroll: padding, getPage: false };
        this.state.scroller.addEventListener('scroll', this.scroll);
      }

      this.state = { ...this.state, ...state };

      console.log(this.flux.store.getState().data.present.infiniteScroll, this.state.scroller.scrollTop, this.state.rememberScroll);
    }
  }

  updateProducts = () => {
    const items = this.setProducts();

    this.state = {
      ...this.state,
      elItems: this.state.wrapper.children,
      firstEl: items[0],
      lastEl: items[items.length - 1],
      getPage: false,
      oneTime: true,
    };
  }

  setProducts = (products?: Store.ProductWithMetadata[]) => {
    // TODO: put the products at the end if they're forward, at the beginning if they're backward
    let items;
    if (products) {
      if (products[0].index > this.state.items[this.state.items.length - 1].index) {
        items = [...this.state.items, ...products.map(this.productTransformer)];
        this.set({ items });
        this.maintainScrollTop(this.state.scroller.scrollTop);
        this.state = { ...this.state, rememberScroll: this.state.scroller.scrollTop };
      } else if (products[products.length - 1].index < this.state.items[0].index) {
        items = [...products.map(this.productTransformer), ...this.state.items];
        this.set({ items });
        this.maintainScrollTop(this.state.scroller.scrollTop);
        this.state = { ...this.state, rememberScroll: this.state.scroller.scrollTop };
      }
    } else {
      console.log('am i doing stuff?');
      items = Selectors.productsWithMetadata(this.flux.store.getState()).map(this.productTransformer);
      this.set({ items });
    }
    return items;
  }

  maintainScrollTop = (scrollTop: number) => {
    console.log('maintaining', scrollTop);
    this.state.scroller.scrollTop = scrollTop;
  }

  setFlag = () => {
    this.set({ oneTime: true });
  }

  scroll = () => {
    const { scroller, wrapper } = this.state;
    const wrapperHeight = wrapper.getBoundingClientRect().height;
    const scrollerHeight = scroller.getBoundingClientRect().height;

    if (this.state.getPage) {
      this.calculatePageChange();
    }

    // TODO: decide on breakpoints for fetching & move into constants
    // tslint:disable-next-line max-line-length
    if (!this.state.loadMore) {
      if (this.state.lastScroll < scroller.scrollTop && scroller.scrollTop >= (wrapperHeight - scrollerHeight) * .75) {
        // tslint:disable-next-line max-line-length
        if (Selectors.recordCount(this.flux.store.getState()) !== this.state.items[this.state.items.length - 1].index) {
          this.fetchMoreItems();
        }
        // tslint:disable-next-line max-line-length
      } else if (this.state.lastScroll > scroller.scrollTop && scroller.scrollTop <= this.state.padding * 1.25) {
        if (this.state.items[0].index !== 0) {
          this.fetchMoreItems(false);
        }
      }
    }

    this.state = {
      ...this.state,
      lastScroll: scroller.scrollTop,
      getPage: true,
    };
  }

  calculatePadding = (scroller: any, firstItemIndex: number) => {
    const width = scroller.getBoundingClientRect().width;
    const row = Math.floor(width / this.props.itemWidth);
    const rows = (firstItemIndex - 1) / row;
    return (rows * this.props.itemHeight);
  }

  calculatePageChange = () => {
    const first = this.getItem(this.state.firstEl.index - 1);
    const last = this.getItem(this.state.lastEl.index + 1);
    const scroller = this.state.scroller;
    const state = this.flux.store.getState();
    const recordCount = Selectors.recordCount(state);
    const page = Selectors.page(state);
    const pageSize = Selectors.pageSize(state);

    console.log('Im tryina chnage page');

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
        lastEl: this.state.items[this.getIndex(this.state.lastEl.index + pageSize)],
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
    return top > (parentTop - (height * .25));
  }

  bottomElAboveOffset = (element: HTMLElement, parent: HTMLElement) => {
    const { bottom, height } = element.getBoundingClientRect();
    const { bottom: parentBottom } = parent.getBoundingClientRect();
    return bottom < (parentBottom + (height * .25));
  }

  getIndex = (recordIndex: number) =>
    this.state.items.findIndex((item) => item.index === recordIndex)

  setPage = (count: number, page: number) =>
    this.actions.receivePage(count, page)

  replaceState = () => {
    if (!this.state.oneTime) {
      this.flux.replaceState(Routes.SEARCH);
    }
  }

  fetchMoreItems = (forward: boolean = true) => {
    this.state = {
      ...this.state,
      oneTime: false,
    };
    this.actions.fetchMoreProducts(Selectors.pageSize(this.flux.store.getState()), forward);
  }

  click = () => {
    console.log('hey');
    this.fetchMoreItems();
  }

  clickFewer = () => {
    console.log('oy');
    this.fetchMoreItems(false);
  }
}

interface InfiniteScroll extends Tag<InfiniteScroll.Props, InfiniteScroll.State> { }
namespace InfiniteScroll {
  export interface Props extends Tag.Props {
    loadMore: boolean;
    itemWidth: number;
    itemHeight: number;
  }

  export interface State {
    items: any[];
    oneTime: boolean;
    loadMore: boolean;
    isFetchingForward: boolean;
    isFetchingBackward: boolean;
    rememberScroll: number;
    scroller?: List;
    wrapper?: HTMLUListElement;
    // set type to proper type rather than any
    elItems?: any;
    layout?: {
      height: number;
      width: number;
    };
    lastScroll?: number;
    padding?: number;
    firstEl?: any;
    lastEl?: any;
    getPage?: boolean;
  }
}

export default InfiniteScroll;
