import { alias, configurable, tag, Events, ProductTransformer, Selectors, Store, Tag } from '@storefront/core';
import { Adapters, Routes } from '@storefront/flux-capacitor';
import { List, ListItem } from '@storefront/structure';

@configurable
@alias('infinite')
@tag('gb-infinite-scroll', require('./index.html'), require('./index.css'))
class InfiniteScroll {

  tags: {
    'gb-list': List;
  };

  state: InfiniteScroll.State = {
    items: [],
    lastScroll: 0,
    oneTime: true,
  };

  productTransformer = ({ data, meta, index }: Store.ProductWithMetadata) =>
    ({ ...ProductTransformer.transformer(this.config.structure)(data), meta, index })

  init() {
    this.flux.on(Events.PRODUCTS_UPDATED, this.updateProducts);
    this.flux.on(Events.MORE_PRODUCTS_ADDED, this.setProducts);
    this.flux.on(Events.PAGE_UPDATED, this.replaceState);
    this.flux.on(Events.SEARCH_CHANGED, this.setFlag);
  }

  onMount() {
    const scroller = this.tags['gb-list'];
    const wrapper = scroller.refs.wrapper;

    this.state = { ...this.state, scroller, wrapper, oneTime: true };
  }

  onUpdated = () => {
    const firstItem = this.state.items[0];

    if (firstItem) {
      const padding = this.calculatePadding(this.state.scroller, firstItem.index);
      let state: Pick<InfiniteScroll.State, 'padding' | 'lastScroll' | 'getPage'> = { padding };

      this.state.wrapper.style.paddingTop = `${padding}px`;

      if (this.state.oneTime) {
        this.state.scroller.root.scrollTop = padding;
        state = { ...state, lastScroll: padding, getPage: false };
        this.state.scroller.root.addEventListener('scroll', this.scroll);
      }

      this.state = { ...this.state, ...state };
    }
  }

  updateProducts = (products: Store.Product[]) => {
    const items = this.setProducts();

    this.state = {
      ...this.state,
      elItems: this.state.scroller.tags['gb-list-item'],
      firstEl: items[0],
      lastEl: items[items.length - 1],
      getPage: false,
      oneTime: true,
    };
  }

  setProducts = (prods?: Store.ProductWithMetadata[]) => {
    // TODO: put the prods at the end if they're forward, at the beginning if they're backward
    let items;
    if (prods) {
      if (prods[0].index > this.state.items[this.state.items.length - 1].index) {
        items = [...this.state.items, ...prods.map(this.productTransformer)];
        this.set({ items });
      } else if (prods[prods.length - 1].index < this.state.items[0].index) {
        items = [...prods.map(this.productTransformer), ...this.state.items];
        this.maintainScrollTop(items, this.state.scroller.root.scrollTop);
      }
    } else {
      items = Selectors.productsWithMetadata(this.flux.store.getState()).map(this.productTransformer);
      this.set({ items });
    }
    return items;
  }

  maintainScrollTop = (items: Store.ProductWithMetadata[], scrollTop: number) => {
    this.set({ items });
    this.state.scroller.root.scrollTop = scrollTop;
  }

  setFlag = () => {
    this.set({ oneTime: true });
  }

  scroll = () => {
    const { scroller, wrapper } = this.state;
    const wrapperHeight = wrapper.getBoundingClientRect().height;
    const scrollerHeight = scroller.root.getBoundingClientRect().height;
    const heightDiff = wrapperHeight - scrollerHeight;

    if (this.state.getPage) {
      this.calculatePageChange();
    }

    if (this.state.lastScroll < scroller.root.scrollTop && scroller.root.scrollTop >= heightDiff * .75) {
      // tslint:disable-next-line max-line-length
      if (Selectors.recordCount(this.flux.store.getState()) !== this.state.items[this.state.items.length - 1].index) {
        this.fetchMoreItems();
      }
      // tslint:disable-next-line max-line-length
    } else if (this.state.lastScroll > scroller.root.scrollTop && scroller.root.scrollTop <= this.state.padding * 1.25) {
      if (this.state.items[0].index !== 0) {
        this.fetchMoreItems(false);
      }
    }

    this.state = {
      ...this.state,
      lastScroll: scroller.root.scrollTop,
      getPage: true,
    };
  }

  calculatePadding = (scroller: any, firstItemIndex: number) => {
    const width = scroller.root.getBoundingClientRect().width;
    const itemHeight = 340;
    const itemWidth = 220;
    const row = Math.floor(width / itemWidth);
    const rows = (firstItemIndex - 1) / row;
    return (rows * itemHeight);
  }

  calculatePageChange = () => {
    console.log('calculatePageChange', this.state.elItems, this.state.items, this.state.firstEl, this.state.lastEl);
    const first = this.getItem(this.state.firstEl.index - 1);
    const last = this.getItem(this.state.lastEl.index + 1);
    const scroller = this.state.scroller.root;
    const state = this.flux.store.getState();
    const recordCount = Selectors.recordCount(state);
    const page = Selectors.page(state);
    const pageSize = Selectors.pageSize(state);

    console.log('first', first, (first || {}).root);
    console.log('last', last, (last || {}).root);

    if (first && this.topElBelowOffset(first.root, scroller)) {
      this.state = {
        ...this.state,
        firstEl: this.state.items[this.getIndex(this.state.firstEl.index - pageSize)],
        lastEl: this.state.items[this.getIndex(this.state.lastEl.index - pageSize)],
      };
      console.log('changing page back');
      this.setPage(recordCount, page - 1);
    } else if (last && this.bottomElAboveOffset(last.root, scroller)) {
      this.state = {
        ...this.state,
        firstEl: this.state.items[this.getIndex(this.state.firstEl.index + pageSize)],
        lastEl: this.state.items[this.getIndex(this.state.lastEl.index + pageSize)],
      };
      console.log('changing page forward');
      this.setPage(recordCount, page + 1);
    }
  }

  getItem = (recordIndex: number) => {
    console.log('id', recordIndex, this.getIndex(recordIndex), this.state.elItems.length);
    return this.state.elItems[this.getIndex(recordIndex)];
  }

  // TODO: logic for changing page should happen when first item of next/prev page is at the top
  topElBelowOffset = (element: HTMLElement, parent: HTMLElement) => {
    const { top, height } = element.getBoundingClientRect();
    const { top: parentTop } = parent.getBoundingClientRect();
    console.log(element, top, parentTop);
    return top > (parentTop - (height * .25));
  }

  bottomElAboveOffset = (element: HTMLElement, parent: HTMLElement) => {
    const { bottom, height } = element.getBoundingClientRect();
    const { bottom: parentBottom } = parent.getBoundingClientRect();
    return bottom < (parentBottom + (height * .25));
  }

  getIndex = (recordIndex: number) =>
    this.state.items.findIndex((item) => item.index === recordIndex)

  setPage = (count: number, page: number) => {
    const state = this.flux.store.getState();
    this.actions.receivePage(count, page);
  }

  replaceState = () => {
    if (!this.state.oneTime) {
      // this.state.scroller.root.style = 'background-color: blue';
      // this.state.scroller.root.removeEventListener('scroll', this.scroll, { passive: true });
      this.flux.replaceState(Routes.SEARCH);
    }
  }

  fetchMoreItems = (forward: boolean = true) => {
    this.state = {
      ...this.state,
      oneTime: false,
    };
    this.actions.fetchMoreProducts(Selectors.pageSize(this.flux.store.getState()), forward);
    // this.actions.createComponentState(Tag.getMeta(this).name, `${this._riot_id}`, {
    //   isFetchingForward: forward,
    //   isFetchingBackward: !forward
    // }, true);
  }
}

interface InfiniteScroll extends Tag<any, InfiniteScroll.State> { }
namespace InfiniteScroll {
  export interface State {
    items: any[];
    oneTime: boolean;
    scroller?: List;
    wrapper?: HTMLUListElement;
    elItems?: ListItem[];
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
