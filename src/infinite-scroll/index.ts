import { alias, configurable, tag, utils, Events, ProductTransformer, Store, Tag } from '@storefront/core';
import { Routes } from '@storefront/flux-capacitor';
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
    lastScroll: 0
  };

  init() {
    // test
    this.flux.on(Events.PRODUCTS_UPDATED, this.updateProducts);
    console.log(Events.MORE_PRODUCTS_ADDED);
    this.flux.on(Events.MORE_PRODUCTS_ADDED, this.moreProds);
  }

  moreProds = (e) => {
    this.updatePage();
    const products = this.flux.selectors.products(this.flux.store.getState());
    const prods = products.map(ProductTransformer.transformer(this.config.structure));
    console.log('IM CONSQUALOGGING', e, prods);
    this.set({
      items: prods
    });
  }

  onMount() {
    const scroller = this.tags['gb-list'];
    this.state = {
      ...this.state,
      scroller,
      wrapper: scroller.refs.wrapper,
    };
    scroller.root.addEventListener('scroll', this.scroll);
  }

  updatePage() {
    const store = this.flux.store.getState();
    this.actions.receivePage(this.flux.selectors.recordCount(store), this.flux.selectors.page(store) + 1);
    this.flux.saveState(Routes.SEARCH);
  }

  updateProducts = (products: Store.Product[]) => {
    const items = this.state.items.concat(products.map(ProductTransformer.transformer(this.config.structure)));
    // const prods = this.flux.selectors.products(this.flux.store.getState());
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
    console.log('scroller scrollTop: ', scroller.root.scrollTop,
      'wrapper height: ', wrapperHeight,
      'scroller.root.scrollTop >= wrapperHeight * .75', scroller.root.scrollTop >= wrapperHeight * .75);
    if (this.state.lastScroll < scroller.root.scrollTop && scroller.root.scrollTop >= wrapperHeight * .75) {
      this.state = {
        ...this.state,
        lastEl,
        lastScroll: scroller.root.scrollTop
      };

      if (this.flux.selectors.recordCount(this.flux.store.getState()) !== this.state.items.length) {
        console.log('im fetchin more');
        this.fetchMoreItems();
      }
    }
    this.state = {
      ...this.state,
      lastScroll: scroller.root.scrollTop
    };
  }

  fetchMoreItems = () => {
    this.actions.fetchMoreProducts(this.flux.selectors.pageSize(this.flux.store.getState()));
  }
}

interface InfiniteScroll extends Tag<any, InfiniteScroll.State> { }
namespace InfiniteScroll {
  export interface State {
    items: any[];
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
