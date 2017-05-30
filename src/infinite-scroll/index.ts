import { utils, view, Component, Events, Selectors, Store, Tag } from '@storefront/core';
import { Renderer } from './renderer';
import WINDOW = utils.WINDOW;

export const MIN_REQUEST_SIZE = 25;
export const MAX_REQUEST_SIZE = 120;

@view('gb-infinite-scroll', require('./index.html'), require('./index.css'), [
  { name: 'maxRecords', default: 500 },
])
class InfiniteScroll extends Component {

  props: InfiniteScroll.Props;
  state: Partial<InfiniteScroll.State> = {
    items: [],
    loadedItems: 0,
    runwayEnd: 0
  };
  refs: {
    scroller: HTMLUListElement;
    runway: HTMLElement;
  };

  constructor() {
    super();
    WINDOW.addEventListener('resize', this.onResize);
    this.flux.on(Events.PRODUCTS_UPDATED, this.reset);
  }

  onMount() {
    this.refs.scroller.addEventListener('scroll', this.onScroll);
    this.onResize();
  }

  reset = () => {
    console.log('reset');
    this.state.items = [];
    this.state.loadedItems = 0;
    this.state.runwayEnd = 0;
    this.state.anchorScrollTop = 0;
    this.state.oldScroll = 0;
    while (this.refs.scroller.hasChildNodes()) {
      this.refs.scroller.removeChild(this.refs.scroller.lastChild);
    }
    this.attachRenderer();
  }

  onScroll = () => {
    if (this.state.oldScroll !== this.refs.scroller.scrollTop) {
      this.attachRenderer();
    }
    this.state.oldScroll = this.refs.scroller.scrollTop;
  }

  attachRenderer() {
    new Renderer(this).attachToView();
  }

  onResize = () => {
    const tombstone = Renderer.createTombstone(this.config.structure);
    this.refs.scroller.appendChild(tombstone);
    this.state.tombstoneLayout = {
      height: tombstone.offsetHeight,
      width: tombstone.offsetWidth
    };
    tombstone._tag.unmount();
    this.state.items.forEach((item) => item.height = item.width = 0);
    this.attachRenderer();
  }

  capRecords(items: number) {
    return Math.min(items, Selectors.recordCount(this.flux.store.getState()));
  }

  maybeRequestContent(renderer: Renderer) {
    const itemsNeeded = this.capRecords(renderer.lastItem) - this.state.loadedItems;
    if (itemsNeeded <= 0) { return; }

    if (this.state.updating) { return; }
    this.state.updating = true;

    // this.fetch(itemsNeeded)
    //   .then((records) => this.updateItems(records, renderer));
    this.flux.on(Events.PRODUCTS_UPDATED, (records) => this.updateItems(records, renderer));
  }

  fetch(count: number) {
    // const request = this.flux.query.build();
    // request.pageSize = Math.min(MAX_REQUEST_SIZE, Math.max(MIN_REQUEST_SIZE, count));
    // request.skip = this.state.loadedItems;

    // return this.flux.bridge.search(request)
    //   // start lazy loading images here?
    //   .then((res) => res.records);
    //
    // this.flux.skip()
    this.flux.search('test');
  }

  updateItems(records: Store.Product[], renderer: Renderer) {
    records.forEach((record) => {
      if (this.state.items.length <= this.state.loadedItems) {
        this.addBlankItem();
      }
      this.state.items[this.state.loadedItems++].data = record;
      console.log(this.state.items);
    });
    this.state.updating = false;
    renderer.attachToView();
  }

  addBlankItem() {
    this.state.items.push({
      data: null,
      node: null,
      height: 0,
      width: 0,
      top: 0,
    });
  }
}

namespace InfiniteScroll {
  export interface Props {
    maxRecords?: number;
  }
  export interface State {
    tombstoneLayout: { height: number; width: number; };
    items: ScrollItem[];
    loadedItems: number;
    updating: boolean;
    oldScroll: number;

    // must be kept here to preserve state
    runwayEnd: number;
    anchor: ScrollAnchor;
    anchorScrollTop: number;
  }
}

export interface ScrollItem {
  node: HTMLElement & { _tag: Tag.Instance };
  data: any;
  top: number;
  height: number;
  width: number;
}

export interface ScrollAnchor {
  index: number;
  offset: number;
}

export default InfiniteScroll;
