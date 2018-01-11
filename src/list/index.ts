import { tag, Tag } from '@storefront/core';
import { List, ListItem } from '@storefront/structure';

@tag('gb-infinite-list', require('./index.html'), require('./index.css'))
class InfiniteList extends List {}

export default InfiniteList;
