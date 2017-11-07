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
    setVisible: false,
    alreadyVisible: false,
    items: [],
    lastScroll: 0,
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
      setVisible: !this.state.alreadyVisible,
    });
    console.log('this.state.scroller.root.scrollTop', this.state.scroller.root.scrollTop);
  }

  onUpdated = () => {
    this.state.scroller.root.scrollTop = 1700;
    if (this.state.setVisible) {
      console.log('only happens once');
      this.state.wrapper.style.visibility = 'visible';
      this.state.alreadyVisible = true;
    }
    console.log('this.state.scroller.root.scrollTop', this.state.scroller.root.scrollTop);
  }

  onMount() {
    const scroller = this.tags['gb-list'];
    const wrapper = scroller.refs.wrapper;
    scroller.root.addEventListener('scroll', this.scroll);
    const pageSize = this.flux.selectors.pageSize(this.flux.store.getState());
    const page = this.flux.selectors.page(this.flux.store.getState());
    const width = scroller.root.getBoundingClientRect().width;
    const itemHeight = 340;
    const itemWidth = 220;
    const row = Math.floor(width / itemWidth);
    const rows = pageSize / row;
    const baseHeight = rows * itemHeight;
    const currentScroll = baseHeight * (page - 1);
    let padding;

    if (page > 1) {
      this.fetchMoreItems(false);
      padding = baseHeight * (page - 2);
    } else {
      padding = baseHeight * (page - 1);
    }
    wrapper.style.paddingTop = `${padding}px`;
    wrapper.style.visibility = 'hidden';
    // scroller.root.scrollTop = padding + 200;
    // console.log('on load scroller', scroller.root.scrollTop, padding);
    this.state = {
      ...this.state,
      scroller,
      wrapper,
      lastScroll: currentScroll,
    };
  }

  updatePage() {
    const store = this.flux.store.getState();
    // this.actions.receivePage(this.flux.selectors.recordCount(store), this.flux.selectors.page(store) + 1);
    this.flux.saveState(Routes.SEARCH);
  }

  updateProducts = (products: Store.Product[]) => {
    // const items = this.state.items.concat(products.map(this.productTransformer));
    const items = this.flux.selectors.productsWithMetadata(this.flux.store.getState()).map(this.productTransformer);
    // const items = <any>products.map(ProductTransformer.transformer(this.config.structure));
    console.log('setting items: ', items, 'from: ', products);
    this.set({
      items
    });
    const elItems = this.state.scroller.tags['gb-list-item'];
    const elMeasurements = elItems[0].root.getBoundingClientRect();
    console.log('length', items.length);
    // if (items.length > 2 * 30) {
    //   const layout = {
    //     height: elMeasurements.height,
    //     width: elMeasurements.width
    //   };
    //   console.log('items too long, add tombstones', layout);
    //   items.splice(0, items.length - 2 * 30);
    //   const tombstone = {
    //     tombstone: true,
    //     layout
    //   };
    //   for (let i = 0; i < 30; i++) {
    //     items.unshift(tombstone);
    //   }
    //   this.state.scroller.root.removeEventListener('scroll', this.scroll);
    //   this.set({ items });
    //   this.state.lastEl.scrollIntoView();
    //   console.log(this.state.wrapper.getBoundingClientRect().height / 3,
    //     this.state.wrapper.getBoundingClientRect().bottom + utils.WINDOW().pageYOffset,
    //     this.state.scroller.root.scrollTop)
    // }
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
    // TODO: Don't use exactly the bottom
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
    // } else if (this.state.lastScroll > scroller.root.scrollTop && scroller.root.scrollTop <= wrapperHeight * .25) {
    } else if (this.state.lastScroll > scroller.root.scrollTop) {
      if (this.state.items[0].index !== 0) {
        console.log('im fetchin less');
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
    this.actions.fetchMoreProducts(this.flux.selectors.pageSize(this.flux.store.getState()), forward);
  }
}

interface InfiniteScroll extends Tag<any, InfiniteScroll.State> { }
namespace InfiniteScroll {
  export interface State {
    items: any[];
    setVisible: boolean;
    alreadyVisible: boolean;
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
  }
}

export default InfiniteScroll;
