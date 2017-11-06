// import { alias, configurable, tag, utils, Events, ProductTransformer, Store, Tag } from '@storefront/core';
// import { List, ListItem } from '@storefront/structure';
//
// @configurable
// @alias('infinite')
// @tag('gb-infinite-scroll', require('./index.html'), require('./index.css'))
// class InfiniteScroll {
//
//   tags: {
//     'gb-list': List;
//   };
//
//   state: InfiniteScroll.State = {
//     items: []
//   };
//
//   init() {
//     this.actions.updatePageSize(30);
//     this.flux.on(Events.PRODUCTS_UPDATED, this.updateProducts);
//   }
//
//   onMount() {
//     const scroller = this.refs.scroller;
//     this.state = {
//       ...this.state,
//       scroller,
//     };
//   }
//
//   updateProducts = (products: Store.Product[]) => {
//     const items = this.state.items.concat(products.map(ProductTransformer.transformer(this.config.structure)));
//     this.set({
//       items
//     });
//     const elItems = this.state.scroller.tags['gb-list-item'];
//     const elMeasurements = elItems[0].root.getBoundingClientRect();
//     if (items.length > 2 * 30) {
//       console.log('items too long, add tombstones');
//       items.splice(0, items.length - 30);
//       const tombstone = {
//         tombstone: true,
//         layout: {
//           height: elMeasurements.height,
//           width: elMeasurements.width
//         }
//       };
//       for (let i = 0; i < 30; i++) {
//         items.unshift(tombstone);
//       }
//       console.log(items)
//       this.set({ items });
//     }
//     console.log(elItems[0].root.querySelector('img').complete, items, elMeasurements);
//     this.state = {
//       ...this.state,
//       elItems,
//       nextPage: this.flux.store.getState().data.present.page.next
//     };
//     console.log(this.state);
//   }
//
//   scroll = (event) => {
//     const { elItems, scroller, wrapper } = this.state;
//     const scrollerHeight = scroller.root.getBoundingClientRect().height;
//     const lastEl = elItems[elItems.length - 1]
//     const lastElHeight = lastEl.root.getBoundingClientRect().height;
//     const scrollerBottom = scroller.root.getBoundingClientRect().bottom;
//     const wrapperBottom = wrapper.getBoundingClientRect().bottom;
//     const wrapperHeight = wrapper.getBoundingClientRect().height;
//     // console.log(event, 'imm scrollin', scrollerHeight, lastElHeight, lastElBottom, scrollerBottom, lastElBottom === scrollerBottom);
//     // TODO: Don't use exactly the bottom
//     console.log(wrapperHeight / 2, wrapperBottom + utils.WINDOW().pageYOffset)
//     if (wrapperHeight / 2 >= wrapperBottom + utils.WINDOW().pageYOffset) {
//       this.fetchMoreItems();
//     }
//   }
//
//   fetchMoreItems = () => {
//     this.actions.updateCurrentPage(this.state.nextPage);
//   }
// }
//
// interface InfiniteScroll extends Tag<any, InfiniteScroll.State> { }
// namespace InfiniteScroll {
//   export interface State {
//     items: any[];
//     scroller?: List;
//     wrapper?: HTMLUListElement;
//     elItems?: ListItem[];
//     layout?: {
//       height: number;
//       width: number;
//     };
//     nextPage?: number;
//   }
// }
//
// export default InfiniteScroll;
