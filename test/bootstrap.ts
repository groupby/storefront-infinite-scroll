import * as storefront from '@storefront/core';
import * as mock from 'mock-require';
import * as sinon from 'sinon';

sinon.stub(storefront, 'view');

mock('../src/infinite-scroll/index.html', {});
mock('../src/infinite-scroll/index.css', {});
