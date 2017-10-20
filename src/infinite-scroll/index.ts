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
    this.actions.updatePageSize(30);
    this.flux.on(Events.PRODUCTS_UPDATED, this.updateProducts);
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

  updateProducts = (products: Store.Product[]) => {
    const items = this.state.items.concat(products.map(ProductTransformer.transformer(this.config.structure)));
    this.set({
      items
    });
    const elItems = this.state.scroller.tags['gb-list-item'];
    const elMeasurements = elItems[0].root.getBoundingClientRect();
    console.log('length', items.length);
    if (items.length > 2 * 30) {
      const layout = {
        height: elMeasurements.height,
        width: elMeasurements.width
      };
      console.log('items too long, add tombstones', layout);
      items.splice(0, items.length - 2 * 30);
      const tombstone = {
        tombstone: true,
        layout
      };
      for (let i = 0; i < 30; i++) {
        items.unshift(tombstone);
      }
      this.state.scroller.root.removeEventListener('scroll', this.scroll);
      this.set({ items });
      this.state.lastEl.scrollIntoView();
      console.log(this.state.wrapper.getBoundingClientRect().height / 3,
        this.state.wrapper.getBoundingClientRect().bottom + utils.WINDOW().pageYOffset,
        this.state.scroller.root.scrollTop)
    }
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
    console.log(wrapperHeight / 3, wrapperBottom + utils.WINDOW().pageYOffset,
      scroller.root.scrollTop,
      this.state.items)
    if (wrapperHeight / 3 >= wrapperBottom + utils.WINDOW().pageYOffset) {
      this.state = {
        ...this.state,
        lastEl
      }
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
    wrapper?: HTMLUListElement;
    elItems?: ListItem[];
    lastEl?: HTMLElement;
    layout?: {
      height: number;
      width: number;
    };
    nextPage?: number;
  }
}

export default InfiniteScroll;
