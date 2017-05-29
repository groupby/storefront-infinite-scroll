import { utils, view, Component, Events, Tag } from '@storefront/core';
import { Renderer } from './renderer';
import WINDOW = utils.WINDOW;

export const MIN_REQUEST_SIZE = 25;
export const MAX_REQUEST_SIZE = 120;

@view('gb-infinite-scroll', require('./index.html'), require('./index.css'), [
  { name: 'maxRecords', default: 500 },
])
export class InfiniteScroll extends Component {

  props: InfiniteScroll.Props;
  state: InfiniteScroll.State;
  refs: {
    scroller: HTMLUListElement;
    runway: HTMLElement;
  };

  constructor() {
    super();
    WINDOW.addEventListener('resize', this.onResize);
    this.flux.on(Events.PRODUCTS_UPDATED, this.reset);
    this.on('mount', this.onMount);
  }

  setDefaults() {
    this.state.items = [];
    this.state.loadedItems = 0;
    this.state.runwayEnd = 0;
  }

  onMount() {
    this.refs.scroller.addEventListener('scroll', this.onScroll);
    this.onResize();
  }

  reset() {
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

  onScroll() {
    if (this.state.oldScroll !== this.refs.scroller.scrollTop) {
      this.attachRenderer();
    }
    this.state.oldScroll = this.refs.scroller.scrollTop;
  }

  attachRenderer() {
    new Renderer(this).attachToView();
  }

  onResize() {
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
    if (this.flux.results) {
      return Math.min(items, this.flux.results.totalRecordCount);
    } else {
      return items;
    }
  }

  maybeRequestContent(renderer: Renderer) {
    const itemsNeeded = this.capRecords(renderer.lastItem) - this.state.loadedItems;
    if (itemsNeeded <= 0) { return; }

    if (this.state.updating) { return; }
    this.state.updating = true;

    this.fetch(itemsNeeded)
      .then((records) => this.updateItems(records, renderer));
  }

  fetch(count: number): Promise<Record[]> {
    const request = this.flux.query.build();
    request.pageSize = Math.min(MAX_REQUEST_SIZE, Math.max(MIN_REQUEST_SIZE, count));
    request.skip = this.state.loadedItems;

    return this.flux.bridge.search(request)
      // start lazy loading images here?
      .then((res) => res.records);

    this.flux.skip()
  }

  updateItems(records: Record[], renderer: Renderer) {
    records.forEach((record) => {
      if (this.state.items.length <= this.state.loadedItems) {
        this.addBlankItem();
      }
      this.state.items[this.state.loadedItems++].data = record;
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
