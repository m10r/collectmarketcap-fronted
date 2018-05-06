
exports.up = function(knex, Promise) {
  
  return knex.schema.createTable('idex_orders', (table) => {
    table.increments('idex_order_id');
    
    table.text('amount').defaultTo('');
    table.text('price').defaultTo('');
    table.text('user').defaultTo('');
    table.text('type').defaultTo('');
    table.text('market').defaultTo('');
    table.text('orderHash').defaultTo('');

    table.text('timestamp').defaultTo('');
    table.text('dbtimestamp').defaultTo('');
    
  })
};

exports.down = function(knex, Promise) {
  
  return knex.schema.dropTable('idex_trades');
};
