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
      items: products.map(ProductTransformer.transformer(this.config.structure))
    });
    this.state = {
      ...this.state,
      elItems: this.state.scroller.tags['gb-list-item']
    };
    console.log(this.state);
  }

  scroll = (event) => {
    const scrollerHeight = this.state.scroller.root.getBoundingClientRect().height;
    const { elItems } = this.state;
    const lastElHeight = elItems[elItems.length - 1].root.getBoundingClientRect().height;
    console.log(event, 'imm scrollin', scrollerHeight, lastElHeight);
  }
}

interface InfiniteScroll extends Tag<any, InfiniteScroll.State> { }
namespace InfiniteScroll {
  export interface State {
    items: any[];
    scroller?: List;
    elItems?: ListItem[];
    itemHeight?: number;
  }
}

export default InfiniteScroll;
