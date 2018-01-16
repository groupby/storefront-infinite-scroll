import { alias, configurable, tag, Events, ProductTransformer, Selectors, Store, Tag } from '@storefront/core';
import { Adapters, Routes } from '@storefront/flux-capacitor';
import { List } from '@storefront/structure';

@configurable
@alias('infinite')
@tag('gb-infinite-scroll', require('./index.html'), require('./index.css'))
class InfiniteScroll {

  tags: {
    'gb-infinite-list': List;
  };

  state: InfiniteScroll.State = {
    items: [],
    lastScroll: 0,
    oneTime: true,
    loadMore: false,
    isFetchingForward: false,
    isFetchingBackward: false,
    setScroll: false,
    clickMore: () => {
      this.fetchMoreItems();
    },
    clickPrev: () => {
      this.fetchMoreItems(false);
    }
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

  onMount() {
    const scroller = this.tags['gb-infinite-list'];
    const wrapper = scroller.refs.wrapper;
    const loadMore = this.props.loadMore || this.state.loadMore;

    this.state = { ...this.state, scroller, wrapper, oneTime: true, loadMore };
  }

  onUpdated = () => {
    const firstItem = this.state.items[0];
    let state = <any>{ getPage: false };

    if (firstItem) {
      if (!this.state.loadMore) {
        const padding = this.calculateOffset(firstItem.index - 1);

        this.state.prevExists
          ? this.state.wrapper.style.paddingTop = `20px`
          : this.state.wrapper.style.paddingTop = `0px`;

        state = { ...state, padding };

        if (this.state.oneTime) {
          if (this.state.prevExists) this.state.scroller.root.scrollTop = 20;
          this.state.scroller.root.addEventListener('scroll', this.scroll);
        }
      } else if (this.state.oneTime) {
        this.state.scroller.root.addEventListener('scroll', this.scroll);
      }

      this.state = { ...this.state, ...state };
    }

    if (this.state.setScroll) {
      const imgs = <any>this.state.wrapper.querySelectorAll('img') || [];
      const pageSize = Selectors.pageSize(this.flux.store.getState());
      let count = 0;

      for (let i = 0; i < pageSize; i++) {
        imgs[i].onload = () => {
          count++;
          if (count === pageSize) {
            this.maintainScrollTop(this.state.rememberScroll);
            this.state.scroller.root.addEventListener('scroll', this.scroll);
          }
        };
      }

      this.state = { ...this.state, setScroll: false };
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
        console.log('got more prods forward');
        items = [...this.state.items, ...products.map(this.productTransformer)];
        this.set(<any>{ items,
          prevExists: items[0].index !== 1,
        });
      } else if (products[products.length - 1].index < this.state.items[0].index) {
        console.log('got more prods backward');
        const pageSize = Selectors.pageSize(this.flux.store.getState());
        const rememberScroll = this.calculateOffset(pageSize) + this.state.scroller.root.scrollTop;
        items = [...products.map(this.productTransformer), ...this.state.items];
        this.state = <any>{
          ...this.state,
          items,
          setScroll: true,
          rememberScroll,
          prevExists: items[0].index !== 1,
        };
        this.state.scroller.root.removeEventListener('scroll', this.scroll);
      }
    } else {
      items = Selectors.productsWithMetadata(this.flux.store.getState()).map(this.productTransformer);
      this.set(<any>{
        items,
        prevExists: items[0].index !== 1
      });
    }
    return items;
  }

  maintainScrollTop = (scrollTop: number) => {
    console.log('maintinain', scrollTop, this.state.scroller.root.scrollTop);
    this.state.scroller.root.scrollTop = scrollTop;
    console.log('maintinain', scrollTop, this.state.scroller.root.scrollTop);
  }

  setFlag = () => {
    this.set({ oneTime: true });
  }

  setFetchFlags = ({ isFetchingForward, isFetchingBackward }: Store.InfiniteScroll) => {
    this.set({ isFetchingForward, isFetchingBackward });
  }

  scroll = () => {
    const { scroller, wrapper } = this.state;
    const wrapperHeight = wrapper.getBoundingClientRect().height;
    const scrollerHeight = scroller.root.getBoundingClientRect().height;
    console.log('scrollin,');

    if (this.state.getPage) {
      this.calculatePageChange();
    }

    // TODO: decide on breakpoints for fetching & move into constants
    // tslint:disable-next-line max-line-length
    if (!this.state.loadMore && this.state.scroller !== this.state.rememberScroll) {
      if (this.state.lastScroll < scroller.root.scrollTop && scroller.root.scrollTop >= (wrapperHeight - scrollerHeight) * .75) {
        // tslint:disable-next-line max-line-length
        if (Selectors.recordCount(this.flux.store.getState()) !== this.state.items[this.state.items.length - 1].index) {
          this.fetchMoreItems();
        }
        // tslint:disable-next-line max-line-length
      } else if (this.state.lastScroll > scroller.root.scrollTop && scroller.root.scrollTop <= this.state.padding * 1.25) {
        if (this.state.prevExists) {
          this.fetchMoreItems(false);
        }
      }
    }

    this.state = {
      ...this.state,
      lastScroll: scroller.root.scrollTop,
      getPage: true,
    };
  }

  calculateOffset = (totalItems: number) => {
    const listItems = this.state.scroller.tags['gb-list-item'];
    if (listItems.length > 0) {
      const itemDimensions = listItems[0].root.getBoundingClientRect();
      console.log('im calculating stuff');
      console.log(itemDimensions);
      const width = this.state.scroller.root.getBoundingClientRect().width;
      const row = Math.floor(width / itemDimensions.width);
      const rows = totalItems / row;
      return (rows * itemDimensions.height);
    }
  }

  calculatePageChange = () => {
    console.log('calcing page change');
    const first = this.getItem(this.state.firstEl.index - 1);
    const last = this.getItem(this.state.lastEl.index + 1);
    const scroller = this.state.scroller.root;
    const state = this.flux.store.getState();
    const recordCount = Selectors.recordCount(state);
    const page = Selectors.page(state);
    const pageSize = Selectors.pageSize(state);

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
}

interface InfiniteScroll extends Tag<InfiniteScroll.Props, InfiniteScroll.State> { }
namespace InfiniteScroll {
  export interface Props extends Tag.Props {
    loadMore: boolean;
  }

  export interface State {
    items: any[];
    oneTime: boolean;
    loadMore: boolean;
    isFetchingForward: boolean;
    isFetchingBackward: boolean;
    setScroll: boolean;
    clickMore: () => void;
    clickPrev: () => void;
    prevExists?: boolean;
    moreExists?: boolean;
    rememberScroll?: number;
    scroller?: List;
    wrapper?: HTMLUListElement;
    // set type to proper type rather than any
    elItems?: any;
    lastScroll?: number;
    padding?: number;
    firstEl?: any;
    lastEl?: any;
    getPage?: boolean;
  }
}

export default InfiniteScroll;
