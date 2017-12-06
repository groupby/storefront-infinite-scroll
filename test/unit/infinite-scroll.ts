import { Events, ProductTransformer, Selectors } from '@storefront/core';
import InfiniteScroll from '../../src/infinite-scroll';
import suite from './_suite';

const STRUCTURE = { a: 'b' };

suite('InfiniteScroll', ({ expect, spy, stub, itShouldBeConfigurable, itShouldHaveAlias }) => {
  let infiniteScroll: InfiniteScroll;

  beforeEach(() => {
    infiniteScroll = new InfiniteScroll();
  });

  itShouldBeConfigurable(InfiniteScroll);
  itShouldHaveAlias(InfiniteScroll, 'infinite');

  describe('constructor()', () => {
    describe('state', () => {
      it('should have initial value', () => {
        expect(infiniteScroll.state).to.eql({ items: [], lastScroll: 0, oneTime: true });
      });
    });

    describe('productTransformer()', () => {
      it('should wrap ProductTransformer', () => {
        const data: any = { a: 'b' };
        const meta: any = { c: 'd' };
        const index: any = 124;
        const transformed = { y: 'z' };
        const structure = <any>{ e: 'f' };
        const transformer = spy(() => ({ data: transformed }));
        const transformerFactory = stub(ProductTransformer, 'transformer').returns(transformer);
        infiniteScroll.config = <any>{
          structure
        };

        expect(infiniteScroll.productTransformer({ data, meta, index })).to.eql({ data: transformed, meta, index });
        expect(transformerFactory).to.be.calledWithExactly(structure);
        expect(transformer).to.be.calledWithExactly(data);
      });
    });
  });

  describe('init()', () => {
    it('should listen for PRODUCTS_UPDATED', () => {
      const on = spy();
      infiniteScroll.flux = <any>{ on };

      infiniteScroll.init();

      expect(on).to.be.calledWithExactly(Events.PRODUCTS_UPDATED, infiniteScroll.updateProducts);
    });

    it('should listen for MORE_PRODUCTS_ADDED', () => {
      const on = spy();
      infiniteScroll.flux = <any>{ on };

      infiniteScroll.init();

      expect(on).to.be.calledWithExactly(Events.MORE_PRODUCTS_ADDED, infiniteScroll.setProducts);
    });

    it('should listen for PAGE_UPDATED', () => {
      const on = spy();
      infiniteScroll.flux = <any>{ on };

      infiniteScroll.init();

      expect(on).to.be.calledWithExactly(Events.PAGE_UPDATED, infiniteScroll.replaceState);
    });

    it('should listen for SEARCH_CHANGED', () => {
      const on = spy();
      infiniteScroll.flux = <any>{ on };

      infiniteScroll.init();

      expect(on).to.be.calledWithExactly(Events.SEARCH_CHANGED, infiniteScroll.setFlag);
    });
  });

  describe('onMount()', () => {
    it('should update state with scroller, wrapper, and oneTime', () => {
      const wrapper = { a: 'b' };
      const scroller = { refs: { wrapper } };
      const set = infiniteScroll.set = spy();
      const state = infiniteScroll.state = <any>{ a: 'b' };
      infiniteScroll.tags = {
        'gb-list': scroller
      };

      infiniteScroll.onMount();

      expect(infiniteScroll.state).to.eql({ ...state, scroller, wrapper, oneTime: true });
    });
  });

  describe('onUpdated()', () => {
    it('should not change state if there are no items', () => {
      const set = infiniteScroll.set = spy();
      const state = infiniteScroll.state = <any>{ a: 'b', items: [] };

      infiniteScroll.onUpdated();

      expect(infiniteScroll.state).to.eq(state);
    });

    it('should only set padding on state when oneTime is false', () => {
      const oneTime = false;
      const wrapper = { style: { paddingTop: 0 } };
      const scroller = { root: { scrollTop: 0 } };
      const state = infiniteScroll.state = <any>{ a: 'b', items: [1,2,3,4], wrapper, scroller, oneTime };
      const padding = 200;
      const calculatePadding = infiniteScroll.calculatePadding = spy(() => padding);

      infiniteScroll.onUpdated();

      expect(infiniteScroll.state).to.eql({ ...state, padding });
      expect(scroller.root.scrollTop).to.eq(0);
      expect(wrapper.style.paddingTop).to.eq(`${padding}px`);
    });

    it('should set padding, lastScroll, and getPage when oneTime is true', () => {
      const oneTime = true;
      const wrapper = { style: { paddingTop: 0 } };
      const addEventListener = spy();
      const scroller = { root: { scrollTop: 0, addEventListener } };
      const state = infiniteScroll.state = <any>{ a: 'b', items: [1,2,3,4], wrapper, scroller, oneTime };
      const padding = 200;
      const calculatePadding = infiniteScroll.calculatePadding = spy(() => padding);

      infiniteScroll.onUpdated();

      expect(infiniteScroll.state).to.eql({ ...state, padding, lastScroll: padding, getPage: false });
      expect(scroller.root.scrollTop).to.eq(padding);
      expect(wrapper.style.paddingTop).to.eq(`${padding}px`);
      expect(addEventListener).to.be.calledWithExactly('scroll', infiniteScroll.scroll);
    });
  });

  describe('updateProducts()', () => {
    it('should update state', () => {

    });
  })
});
