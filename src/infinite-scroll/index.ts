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
    console.log('init');
    this.flux.on(Events.PRODUCTS_UPDATED, this.updateProducts);
    this.flux.on(Events.MORE_PRODUCTS_ADDED, this.setProducts);
    this.flux.on(Events.PAGE_UPDATED, this.replaceState);
  }

  onMount() {
    const scroller = this.tags['gb-list'];
    const wrapper = scroller.refs.wrapper;
    const page = this.flux.selectors.page(this.flux.store.getState());

    this.state = {
      ...this.state,
      scroller,
      wrapper,
    };
  }

  onUpdated = () => {
    const firstItem = this.state.items[0];

    if (!firstItem) return;

    const page = this.flux.selectors.page(this.flux.store.getState());
    const padding = this.calculatePadding(this.state.scroller, firstItem.index);

    this.state.wrapper.style.paddingTop = `${padding}px`;

    if (this.state.oneTime) {
      this.state.scroller.root.scrollTop = padding;
      this.state = {
        ...this.state,
        oneTime: false,
        lastScroll: padding,
        getPage: false,
      };
      this.state.scroller.root.addEventListener('scroll', this.scroll);
    }

    this.state = {
      ...this.state,
      padding,
    };
  }

  updateProducts = (products: Store.Product[]) => {
    const page = this.flux.selectors.page(this.flux.store.getState());
    const items = this.setProducts();
    const elItems = this.state.scroller.tags['gb-list-item'];
    const elMeasurements = elItems[0].root.getBoundingClientRect();
    this.state = {
      ...this.state,
      elItems,
      firstEl: items[0],
      lastEl: items[items.length - 1],
      getPage: false,
      oneTime: true,
    };
  }

  setProducts = () => {
    const items = this.flux.selectors.productsWithMetadata(this.flux.store.getState()).map(this.productTransformer);
    this.set({ items });
    return items;
  }

  scroll = () => {
    const { scroller, wrapper } = this.state;
    const wrapperHeight = wrapper.getBoundingClientRect().height;

    if (this.state.getPage) {
      this.calculatePageChange();
    }
    if (this.state.lastScroll < scroller.root.scrollTop && scroller.root.scrollTop >= wrapperHeight * .75) {
      // tslint:disable-next-line max-line-length
      if (this.flux.selectors.recordCount(this.flux.store.getState()) !== this.state.items[this.state.items.length - 1].index) {
        console.log('im fetchin more');
        this.fetchMoreItems();
      }
      // tslint:disable-next-line max-line-length
    } else if (this.state.lastScroll > scroller.root.scrollTop && scroller.root.scrollTop <= this.state.padding * 1.25) {
      if (this.state.items[0].index !== 0) {
        console.log('im fetchin less', this.state.lastScroll, scroller.root.scrollTop);
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
    return rows * itemHeight;
  }

  calculatePageChange = () => {
    const first = this.getItem(this.state.firstEl.index - 1);
    const last = this.getItem(this.state.lastEl.index + 1);
    const scroller = this.state.scroller.root;
    const state = this.flux.store.getState();
    const recordCount = Selectors.recordCount(state);
    const page = Selectors.page(state);
    const pageSize = Selectors.pageSize(state);

    if (first && this.topElBelowOffset(first.root, scroller)) {
      console.log('switch page back');
      this.state = {
        ...this.state,
        firstEl: this.state.items[this.getIndex(this.state.firstEl.index - pageSize)],
        lastEl: this.state.items[this.getIndex(this.state.lastEl.index - pageSize)],
      };
      this.setPage(recordCount, page - 1);
    } else if (last && this.bottomElBelowOffset(last.root, scroller)) {
      console.log('switch page forward');
      this.state = {
        ...this.state,
        firstEl: this.state.items[this.getIndex(this.state.firstEl.index + pageSize)],
        lastEl: this.state.items[this.getIndex(this.state.lastEl.index + pageSize)],
      };
      this.setPage(recordCount, page + 1);
    }
  }

  getItem = (recordIndex: number) => {
    return this.state.elItems[this.getIndex(recordIndex)];
  }

  // TODO: logic for changing page should happen when first item of next/prev page is at the top
  topElBelowOffset = (element: HTMLElement, parent: HTMLElement) => {
    const { top, height } = element.getBoundingClientRect();
    const { top: parentTop } = parent.getBoundingClientRect();
    return top > (parentTop - (height * .25));
  }

  bottomElBelowOffset = (element: HTMLElement, parent: HTMLElement) => {
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
    console.log('the current page is: ', Selectors.page(this.flux.store.getState()));
    // if (Selectors.page(this.flux.store.getState()) !== 1) {
      this.flux.replaceState(Routes.SEARCH);
    // }
  }

  fetchMoreItems = (forward: boolean = true) => {
    this.actions.fetchMoreProducts(Selectors.pageSize(this.flux.store.getState()), forward);
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
