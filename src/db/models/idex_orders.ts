import bookshelf from '../bookshelf';

import bluebird from 'bluebird';

export default bookshelf.Model.extend({
  tableName: 'idex_orders',
  idAttribute: 'idex_order_id',

  initialize: function() {
  },


}, {

});