import { alias, configurable, tag, utils, Events, ProductTransformer, Store, Tag } from '@storefront/core';
import { List, ListItem } from '@storefront/structure';

@configurable
@alias('infinite')
@tag('gb-infinite-scroll', require('./index.html'), require('./index.css'))
class InfiniteScroll {

  tags: {
    'gb-list': List;
  };

  state: InfiniteScroll.State = {
    items: []
  };

  init() {
    this.flux.on(Events.PRODUCTS_UPDATED, this.updateProducts);
  }

  onMount() {
    const scroller = this.tags['gb-list'];
    this.state = {
      ...this.state,
      scroller,
    };
  }

  updateProducts = (products: Store.Product[]) => {
    console.log(products);
    this.set({
      items: this.state.items.concat(products.map(ProductTransformer.transformer(this.config.structure)))
    });
    this.state = {
      ...this.state,
      elItems: this.state.scroller.tags['gb-list-item'],
      nextPage: this.flux.store.getState().data.present.page.next,
    };
    console.log(this.state);
  }

  scroll = (event) => {
    const { elItems, scroller } = this.state;
    const scrollerHeight = scroller.root.getBoundingClientRect().height;
    const lastEl = elItems[elItems.length - 1]
    const lastElHeight = lastEl.root.getBoundingClientRect().height;
    const lastElBottom = lastEl.root.getBoundingClientRect().bottom;
    const scrollerBottom = scroller.root.getBoundingClientRect().bottom;
    // console.log(event, 'imm scrollin', scrollerHeight, lastElHeight, lastElBottom, scrollerBottom, lastElBottom === scrollerBottom);
    // TODO: Don't use exactly the bottom
    if (lastElBottom >= scrollerBottom - lastElHeight) {
      this.fetchMoreItems();
    }
  }

  fetchMoreItems = () => {
    this.actions.updateCurrentPage(this.state.nextPage);
  }
}

interface InfiniteScroll extends Tag<any, InfiniteScroll.State> { }
namespace InfiniteScroll {
  export interface State {
    items: any[];
    scroller?: List;
    elItems?: ListItem[];
    itemHeight?: number;
    nextPage?: number;
  }
}

export default InfiniteScroll;
