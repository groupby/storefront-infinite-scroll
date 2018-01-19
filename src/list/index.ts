import { tag, Tag } from '@storefront/core';
import { List } from '@storefront/structure';

@tag('gb-infinite-list', require('./index.html'), require('./index.css'))
class InfiniteList extends List {}
// class InfiniteList {}

export default InfiniteList;
