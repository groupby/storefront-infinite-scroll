import * as pkg from '../../src';
import InfiniteScroll from '../../src/infinite-scroll';
import suite from './_suite';

suite('package', ({ expect }) => {
  it('should expose InfiniteScroll', () => {
    expect(pkg.InfiniteScroll).to.eq(InfiniteScroll);
  });
});
