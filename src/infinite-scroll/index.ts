import { alias, configurable, tag, utils, Events, ProductTransformer, Store, Tag } from '@storefront/core';
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
    // isVisible: null,
    items: [],
    lastScroll: 0,
    oneTime: true,
  };

  productTransformer = ({ data, meta, index }: Store.ProductWithMetadata) =>
    ({ ...ProductTransformer.transformer(this.config.structure)(data), meta, index })

  init() {
    this.flux.once(Events.PRODUCTS_UPDATED, this.updateProducts);
    console.log(Events.MORE_PRODUCTS_ADDED);
    this.flux.on(Events.MORE_PRODUCTS_ADDED, this.moreProds);
  }

  moreProds = (e) => {
    console.log('oldScroll', this.state.lastScroll, this.state.scroller.root.scrollTop);
    this.updatePage();
    const productsWithMetadata = this.flux.selectors.productsWithMetadata(this.flux.store.getState());
    // tslint:disable-next-line max-line-length
    // const products = Adapters.Search.extractData(productsWithMetadata).map(ProductTransformer.transformer(this.config.structure));
    console.log('IM CONSQUALOGGING', e, productsWithMetadata.map(this.productTransformer));
    this.set({
      items: productsWithMetadata.map(this.productTransformer),
      // isVisible: this.state.isVisible === null ? false : true,
    });
    console.log('this.state.scroller.root.scrollTop', this.state.scroller.root.scrollTop);
  }

  onUpdated = () => {
    const firstItem = this.state.items[0];
    if (firstItem) {
      const page = this.flux.selectors.page(this.flux.store.getState());
        console.log('first item', this.state.items[0].index);
      const padding = this.calculatePadding(this.state.scroller, firstItem.index);
      const scroll = this.calculatePadding(this.state.scroller, 61);
      this.state.wrapper.style.paddingTop = `${padding}px`;
      if (this.state.oneTime) {
        this.state.scroller.root.scrollTop = padding;
        this.state = {
          ...this.state,
          oneTime: false,
        };
      }
      this.state = {
        ...this.state,
        lastScroll: padding,
        padding,
      };
      console.log('padding and scroll', padding, scroll);
    }
  }

  calculatePadding = (scroller: any, firstItemIndex: number) => {
    const width = scroller.root.getBoundingClientRect().width;
    const itemHeight = 340;
    const itemWidth = 220;
    const row = Math.floor(width / itemWidth);
    const rows = (firstItemIndex - 1) / row;
    return rows * itemHeight;
  }

  onMount() {
    const scroller = this.tags['gb-list'];
    const wrapper = scroller.refs.wrapper;
    scroller.root.addEventListener('scroll', this.scroll);
    // const pageSize = this.flux.selectors.pageSize(this.flux.store.getState());
    const page = this.flux.selectors.page(this.flux.store.getState());
    // const width = scroller.root.getBoundingClientRect().width;
    // const itemHeight = 340;
    // const itemWidth = 220;
    // const row = Math.floor(width / itemWidth);
    // const rows = pageSize / row;
    // const baseHeight = rows * itemHeight;
    // const currentScroll = baseHeight * (page - 1);
    const currentScroll = this.calculatePadding(scroller, page - 1);

    this.state = {
      ...this.state,
      scroller,
      wrapper,
      lastScroll: currentScroll,
      setScroll: currentScroll,
    };
  }

  updatePage() {
    const store = this.flux.store.getState();
    // this.actions.receivePage(this.flux.selectors.recordCount(store), this.flux.selectors.page(store) + 1);
    this.flux.saveState(Routes.SEARCH);
  }

  updateProducts = (products: Store.Product[]) => {
    const page = this.flux.selectors.page(this.flux.store.getState());
    if (page > 1) {
      console.log('page greater than 1');
      this.fetchMoreItems(false);
    }
    const items = this.flux.selectors.productsWithMetadata(this.flux.store.getState()).map(this.productTransformer);
    this.set({
      items
    });
    const elItems = this.state.scroller.tags['gb-list-item'];
    const elMeasurements = elItems[0].root.getBoundingClientRect();
    console.log('length', items.length);
    console.log(elItems[0].root.querySelector('img').complete, items, elMeasurements);
    this.state = {
      ...this.state,
      elItems,
      nextPage: this.flux.store.getState().data.present.page.next
    };
    console.log(this.state);
  }

  scroll = (event) => {
    const { elItems, scroller, wrapper } = this.state;
    const scrollerHeight = scroller.root.getBoundingClientRect().height;
    const lastEl = elItems[elItems.length - 1].root;
    const lastElHeight = lastEl.getBoundingClientRect().height;
    const scrollerBottom = scroller.root.getBoundingClientRect().bottom;
    const wrapperBottom = wrapper.getBoundingClientRect().bottom;
    const wrapperHeight = wrapper.getBoundingClientRect().height;
    // console.log('lastScroll: ', this.state.lastScroll, 'scroller scrollTop: ', scroller.root.scrollTop,
    //   'wrapper height: ', wrapperHeight,
    //   'scroller.root.scrollTop >= wrapperHeight * .75', scroller.root.scrollTop >= wrapperHeight * .75);
    if (this.state.lastScroll < scroller.root.scrollTop && scroller.root.scrollTop >= wrapperHeight * .75) {
      // this.state = {
      //   ...this.state,
      //   lastEl,
      //   lastScroll: scroller.root.scrollTop
      // };

      // tslint:disable-next-line max-line-length
      if (this.flux.selectors.recordCount(this.flux.store.getState()) !== this.state.items[this.state.items.length - 1].index) {
        console.log('im fetchin more');
        this.fetchMoreItems();
        // scroller.root.removeEventListener('scroll', this.scroll);
      }
      // tslint:disable-next-line max-line-length
    // TODO: need ot fix this logic
  } else if (this.state.lastScroll > scroller.root.scrollTop && scroller.root.scrollTop <= this.state.padding * 1.25) {
    // } else if (this.state.lastScroll > scroller.root.scrollTop) {
      if (this.state.items[0].index !== 0) {
        console.log('im fetchin less', this.state.lastScroll, scroller.root.scrollTop);
        this.fetchMoreItems(false);
        // scroller.root.removeEventListener('scroll', this.scroll);
      }
    }
    this.state = {
      ...this.state,
      lastScroll: scroller.root.scrollTop
    };
    console.log('oldScroll, im here', this.state.lastScroll, scroller.root.scrollTop);
  }

  fetchMoreItems = (forward: boolean = true) => {
    console.log(`im fetching ${ forward ? 'more' : 'less' }`, this.flux.selectors.pageSize(this.flux.store.getState()));
    this.actions.fetchMoreProducts(this.flux.selectors.pageSize(this.flux.store.getState()), forward);
  }
}

interface InfiniteScroll extends Tag<any, InfiniteScroll.State> { }
namespace InfiniteScroll {
  export interface State {
    items: any[];
    oneTime: boolean;
    // isVisible: string;
    scroller?: List;
    wrapper?: HTMLUListElement;
    elItems?: ListItem[];
    lastEl?: HTMLElement;
    layout?: {
      height: number;
      width: number;
    };
    nextPage?: number;
    lastScroll?: number;
    setScroll?: number;
    padding?: number;
  }
}

export default InfiniteScroll;
